
"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeRecord } from "@/lib/types";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Video, Download, Calendar as CalendarIcon, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { HRQueryTable } from "./query-table";
import { RewardTable } from "./reward-table";

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function HrReviewPage() {
  const { loggedInUser } = useSettings();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const storage = getStorage();

  const isSeniorStaff = useMemo(() => loggedInUser && seniorRoles.includes(loggedInUser.role), [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      
      const filteredRecords = allRecords.filter(record => {
        const clockInDate = new Date(record.clockInTime);
        return isWithinInterval(clockInDate, { start, end });
      });

      filteredRecords.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
      
      setTimeRecords(filteredRecords);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching time records:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch time records. ' + error.message });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loggedInUser?.businessId, selectedDate, toast]);
  
  useEffect(() => {
      setSelectedRecordIds([]);
  }, [selectedDate, timeRecords]);
  
  const filteredRecords = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return timeRecords.filter(record => 
        record.userName.toLowerCase().includes(lowercasedTerm) ||
        record.userEmail.toLowerCase().includes(lowercasedTerm) ||
        record.status.toLowerCase().includes(lowercasedTerm)
    );
  }, [timeRecords, searchTerm]);

  const pendingRecords = filteredRecords.filter(r => r.status === 'pending');
  const historicalRecords = filteredRecords.filter(r => r.status !== 'pending');


  const handleExportCSV = (data: TimeRecord[], tableType: 'pending' | 'history') => {
    const csvData = data.map(record => ({
      "Employee": record.userName,
      "Email": record.userEmail,
      "Clock In Time": format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a"),
      "Clock Out Time": record.clockOutTime ? format(new Date(record.clockOutTime), "MMM d, yyyy, h:mm a") : "-",
      "Status": record.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${tableType}_records_${format(selectedDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };


  const handleStatusUpdate = async (recordId: string, status: 'Clocked In' | 'rejected') => {
    try {
      const recordRef = doc(db, "timeRecords", recordId);
      await updateDoc(recordRef, { status });
      toast({
        title: "Record Updated",
        description: `The record has been ${status === 'rejected' ? 'rejected' : 'approved'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (record: TimeRecord) => {
      if (!record.id) return;
      try {
        if (record.videoUrl) {
            const videoRef = ref(storage, record.videoUrl);
            await deleteObject(videoRef);
        }
        await deleteDoc(doc(db, "timeRecords", record.id));
        toast({
            title: "Record Deleted",
            description: "The time record has been permanently deleted.",
        });
      } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
      }
  };

  const handleDeleteSelected = async () => {
    const batch = writeBatch(db);
    const recordsToDelete = timeRecords.filter(r => selectedRecordIds.includes(r.id));
    
    recordsToDelete.forEach(record => {
        batch.delete(doc(db, "timeRecords", record.id));
        if (record.videoUrl) {
            try {
                const videoRef = ref(storage, record.videoUrl);
                deleteObject(videoRef); // This can fail silently if permissions are off, but we proceed
            } catch (e) {
                console.warn("Could not delete video for record:", record.id, e);
            }
        }
    });

    try {
        await batch.commit();
        toast({
            title: `${selectedRecordIds.length} Record(s) Deleted`,
            description: "The selected records have been permanently removed.",
        });
        setSelectedRecordIds([]);
    } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
    }
  };
  
  const getBadgeVariant = (status: TimeRecord['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'Clocked In':
        return 'default';
      case 'Clocked Out':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handlePreview = (videoUrl: string) => {
    setPreviewVideoUrl(videoUrl);
  };
  
  const handleDownload = (url: string, userName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification_${userName.replace(' ', '_')}_${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const handleSelectAll = (table: 'pending' | 'history', checked: boolean) => {
    const recordIds = (table === 'pending' ? pendingRecords : historicalRecords).map(r => r.id);
    if (checked) {
        setSelectedRecordIds(prev => [...new Set([...prev, ...recordIds])]);
    } else {
        setSelectedRecordIds(prev => prev.filter(id => !recordIds.includes(id)));
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    setSelectedRecordIds(prev => 
        checked ? [...prev, id] : prev.filter(pId => pId !== id)
    );
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title="HR Review" description="Review and manage employee clock-in/out records." />
        {isSeniorStaff && (
          <Popover>
              <PopoverTrigger asChild>
                  <Button
                  variant={"outline"}
                  className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                  )}
                  >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                  <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  />
              </PopoverContent>
          </Popover>
        )}
      </div>
      
      {isSeniorStaff && (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by name, email, or status..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Pending Submissions</CardTitle>
            <CardDescription>
              Approve or reject clock-in records after video verification.
            </CardDescription>
          </div>
          {isSeniorStaff && (
            <div className="flex items-center gap-2">
                {selectedRecordIds.filter(id => pendingRecords.some(r => r.id === id)).length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedRecordIds.filter(id => pendingRecords.some(r => r.id === id)).length})
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected records and their associated videos. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={() => handleExportCSV(pendingRecords, 'pending')} disabled={pendingRecords.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSeniorStaff && (
                    <TableHead padding="checkbox">
                        <Checkbox
                            checked={pendingRecords.length > 0 && pendingRecords.every(r => selectedRecordIds.includes(r.id))}
                            onCheckedChange={(checked) => handleSelectAll('pending', !!checked)}
                            aria-label="Select all pending"
                        />
                    </TableHead>
                  )}
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                  {isSeniorStaff && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 6 : 5} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : pendingRecords.length > 0 ? (
                  pendingRecords.map((record) => (
                    <TableRow key={record.id} data-state={selectedRecordIds.includes(record.id) && "selected"}>
                      {isSeniorStaff && (
                        <TableCell padding="checkbox">
                            <Checkbox
                                checked={selectedRecordIds.includes(record.id)}
                                onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                                aria-label="Select record"
                            />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{record.userName}</TableCell>
                      <TableCell>
                        {format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a")}
                      </TableCell>
                       <TableCell>
                        {record.videoUrl ? (
                          <Button variant="outline" size="sm" onClick={() => handlePreview(record.videoUrl!)}>
                              <Video className="mr-2 h-4 w-4" /> View Video
                          </Button>
                        ) : (
                          "No Video"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      {isSeniorStaff && (
                        <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => handleStatusUpdate(record.id, 'Clocked In')} disabled={!record.videoUrl}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(record.id, 'rejected')}>Reject</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(record)}>Delete</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 6 : 5} className="h-24 text-center">
                      No pending submissions for {format(selectedDate, "PPP")}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>HR Queries</CardTitle>
            <CardDescription>
                Send and manage official information requests to employees.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <HRQueryTable />
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Employee Rewards</CardTitle>
              <CardDescription>
                  Propose and manage rewards for employees.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <RewardTable />
          </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Time Clock History</CardTitle>
            <CardDescription>
              This is a log of all employee clock-in and clock-out events for the selected day.
            </CardDescription>
          </div>
          {isSeniorStaff && (
            <div className="flex items-center gap-2">
                {selectedRecordIds.filter(id => historicalRecords.some(r => r.id === id)).length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedRecordIds.filter(id => historicalRecords.some(r => r.id === id)).length})
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected records and their associated videos. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={() => handleExportCSV(historicalRecords, 'history')} disabled={historicalRecords.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSeniorStaff && (
                      <TableHead padding="checkbox">
                          <Checkbox
                              checked={historicalRecords.length > 0 && historicalRecords.every(r => selectedRecordIds.includes(r.id))}
                              onCheckedChange={(checked) => handleSelectAll('history', !!checked)}
                              aria-label="Select all history"
                          />
                      </TableHead>
                  )}
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Clock Out Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 7 : 6} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : historicalRecords.length > 0 ? (
                  historicalRecords.map((record) => (
                    <TableRow key={record.id} data-state={selectedRecordIds.includes(record.id) && "selected"}>
                       {isSeniorStaff && (
                          <TableCell padding="checkbox">
                              <Checkbox
                                  checked={selectedRecordIds.includes(record.id)}
                                  onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                                  aria-label="Select record"
                              />
                          </TableCell>
                       )}
                      <TableCell className="font-medium">{record.userName}</TableCell>
                      <TableCell>{record.userEmail}</TableCell>
                      <TableCell>
                        {format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {record.clockOutTime
                          ? format(new Date(record.clockOutTime), "MMM d, yyyy, h:mm a")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.videoUrl ? (
                            <Button variant="outline" size="sm" onClick={() => handlePreview(record.videoUrl!)}>
                                <Video className="mr-2 h-4 w-4" /> View
                            </Button>
                        ) : (
                            "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 7 : 6} className="h-24 text-center">
                      No historical records found for {format(selectedDate, "PPP")}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!previewVideoUrl} onOpenChange={(open) => !open && setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Video</DialogTitle>
             <DialogDescription>Review the employee's clock-in verification video.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewVideoUrl && (
              <video controls autoPlay src={previewVideoUrl} className="w-full rounded-md" />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleDownload(previewVideoUrl!, 'verification')} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => setPreviewVideoUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

    