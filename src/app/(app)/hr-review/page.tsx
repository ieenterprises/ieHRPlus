
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeRecord, User } from "@/lib/types";
import { format, startOfDay, endOfDay, isWithinInterval, addDays, parseISO, intervalToDuration, differenceInMilliseconds } from "date-fns";
import { Video, Download, Calendar as CalendarIcon, Trash2, Search, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { HRQueryTable } from "./query-table";
import { RewardTable } from "./reward-table";
import type { DateRange } from "react-day-picker";

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function HrReviewPage() {
  const { loggedInUser, users } = useSettings();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
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
      
      const start = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(new Date());
      const end = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      
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
  }, [loggedInUser?.businessId, dateRange, toast]);
  
  useEffect(() => {
      setSelectedRecordIds([]);
  }, [dateRange, timeRecords]);
  
  const filteredRecords = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return timeRecords.filter(record => 
        record.userName.toLowerCase().includes(lowercasedTerm) ||
        record.userEmail.toLowerCase().includes(lowercasedTerm) ||
        record.status.toLowerCase().includes(lowercasedTerm)
    );
  }, [timeRecords, searchTerm]);

  const pendingRecords = filteredRecords.filter(r => r.status === 'pending');
  const historicalRecords = useMemo(() => {
      const records = filteredRecords.filter(r => r.status !== 'pending');
      return records.map(record => {
          const user = users.find(u => u.id === record.userId);
          return { ...record, user };
      });
  }, [filteredRecords, users]);


  const handleExportCSV = (data: any[], tableType: 'pending' | 'history') => {
    const csvData = data.map(record => {
        const baseData = {
          "Employee": record.user?.name || record.userName,
          "Email": record.user?.email || record.userEmail,
          "Clock In Time": format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a"),
          "Clock Out Time": record.clockOutTime ? format(new Date(record.clockOutTime), "MMM d, yyyy, h:mm a") : "-",
          "Status": record.status,
        };
        if (tableType === 'history') {
            const durationMinutes = calculateDuration(record.clockInTime, record.clockOutTime, 'minutes');
            const latenessMinutes = calculateLateness(record.user, record.clockInTime, 'minutes');
            const extraTimeMinutes = calculateExtraTime(record.user, durationMinutes);

            return {
                ...baseData,
                "Duration": formatMinutes(durationMinutes),
                "Lateness": formatMinutes(latenessMinutes),
                "Overtime": formatMinutes(extraTimeMinutes),
            }
        }
        return baseData;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${tableType}_records_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
  
  const handleUpdateRecordTime = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRecord) return;

    setIsUpdating(true);

    const formData = new FormData(event.currentTarget);
    const clockInDate = formData.get('clockInDate') as string;
    const clockInTime = formData.get('clockInTime') as string;
    const clockOutDate = formData.get('clockOutDate') as string;
    const clockOutTime = formData.get('clockOutTime') as string;

    const newClockInTime = new Date(`${clockInDate}T${clockInTime}`);
    const newClockOutTime = clockOutDate && clockOutTime ? new Date(`${clockOutDate}T${clockOutTime}`) : null;

    try {
        const recordRef = doc(db, "timeRecords", editingRecord.id);
        await updateDoc(recordRef, {
            clockInTime: newClockInTime.toISOString(),
            clockOutTime: newClockOutTime ? newClockOutTime.toISOString() : null,
        });
        toast({ title: "Record Updated", description: "The clock-in/out times have been successfully modified." });
        setEditingRecord(null);
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsUpdating(false);
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

  const formatMinutes = (minutes: number) => {
    if (minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const getExpectedWorkMinutes = (user: User | undefined): number => {
    if (!user?.defaultClockInTime || !user?.defaultClockOutTime) return 0;
    const [inHours, inMinutes] = user.defaultClockInTime.split(':').map(Number);
    const [outHours, outMinutes] = user.defaultClockOutTime.split(':').map(Number);
    let diff = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    if (diff < 0) diff += 24 * 60; // Handle overnight
    return diff;
  };

  const calculateDuration = (startTime: string, endTime: string | null, returnAs: 'string' | 'minutes' = 'string'): number | string => {
      if (!endTime) return returnAs === 'minutes' ? 0 : "-";
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (end < start) return returnAs === 'minutes' ? 0 : "0h 0m";

      const diffMs = end.getTime() - start.getTime();
      const durationMinutes = Math.floor(diffMs / 60000);
      
      return returnAs === 'minutes' ? durationMinutes : formatMinutes(durationMinutes);
  };

  const calculateExpectedDuration = (user: User | undefined) => {
    if (!user?.defaultClockInTime || !user?.defaultClockOutTime) return "-";
    const expectedMinutes = getExpectedWorkMinutes(user);
    return formatMinutes(expectedMinutes);
  };

  const calculateLateness = (user: User | undefined, clockInTime: string, returnAs: 'string' | 'minutes' = 'string'): number | string => {
    if (!user?.defaultClockInTime) return returnAs === 'minutes' ? 0 : "0h 0m";
    
    const actualClockIn = new Date(clockInTime);
    const [hours, minutes] = user.defaultClockInTime.split(':').map(Number);
    const defaultClockIn = new Date(actualClockIn);
    defaultClockIn.setHours(hours, minutes, 0, 0);

    const latenessMinutes = actualClockIn > defaultClockIn 
        ? Math.floor(differenceInMilliseconds(actualClockIn, defaultClockIn) / 60000)
        : 0;
    
    return returnAs === 'minutes' ? latenessMinutes : formatMinutes(latenessMinutes);
  };

  const calculateExtraTime = (user: User | undefined, durationInMinutes: number): number => {
    if (!user) return 0;
    const expectedMinutes = getExpectedWorkMinutes(user);
    const extraMinutes = durationInMinutes - expectedMinutes;
    return extraMinutes > 0 ? extraMinutes : 0;
  };

  const DatePicker = () => (
     <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
  );


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title="HR Review" description="Review and manage employee clock-in/out records." />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Pending Submissions</CardTitle>
            <CardDescription>
              Approve or reject clock-in records.
            </CardDescription>
          </div>
          {isSeniorStaff && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search records..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DatePicker />
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
                    Export
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
                            <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}><Edit className="h-4 w-4" /></Button>
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
                      No pending submissions for the selected date range.
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Time Clock History</CardTitle>
            <CardDescription>
              Log of all employee events.
            </CardDescription>
          </div>
          {isSeniorStaff && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search records..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DatePicker />
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
                    Export
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
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Expected Duration</TableHead>
                  <TableHead>Lateness</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                   {isSeniorStaff && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 11 : 10} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : historicalRecords.length > 0 ? (
                  historicalRecords.map((record) => {
                    const durationMinutes = calculateDuration(record.clockInTime, record.clockOutTime, 'minutes') as number;
                    const latenessMinutes = calculateLateness(record.user, record.clockInTime, 'minutes') as number;
                    const extraTimeMinutes = calculateExtraTime(record.user, durationMinutes);

                    return (
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
                            {format(new Date(record.clockInTime), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                            {record.clockOutTime
                            ? format(new Date(record.clockOutTime), "MMM d, h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell>{formatMinutes(durationMinutes)}</TableCell>
                        <TableCell>{calculateExpectedDuration(record.user)}</TableCell>
                        <TableCell>{formatMinutes(latenessMinutes)}</TableCell>
                        <TableCell>{formatMinutes(extraTimeMinutes)}</TableCell>
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
                        {isSeniorStaff && (
                            <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            </TableCell>
                        )}
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 11 : 10} className="h-24 text-center">
                      No historical records found for the selected date range.
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
      
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
            <form onSubmit={handleUpdateRecordTime}>
                <DialogHeader>
                    <DialogTitle>Edit Time Record for {editingRecord?.userName}</DialogTitle>
                    <DialogDescription>Manually adjust the clock-in and clock-out times.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clockInDate">Clock-In Date</Label>
                            <Input id="clockInDate" name="clockInDate" type="date" defaultValue={editingRecord ? format(parseISO(editingRecord.clockInTime), 'yyyy-MM-dd') : ''} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clockInTime">Clock-In Time</Label>
                            <Input id="clockInTime" name="clockInTime" type="time" defaultValue={editingRecord ? format(parseISO(editingRecord.clockInTime), 'HH:mm') : ''} required />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clockOutDate">Clock-Out Date</Label>
                            <Input id="clockOutDate" name="clockOutDate" type="date" defaultValue={editingRecord && editingRecord.clockOutTime ? format(parseISO(editingRecord.clockOutTime), 'yyyy-MM-dd') : ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clockOutTime">Clock-Out Time</Label>
                            <Input id="clockOutTime" name="clockOutTime" type="time" defaultValue={editingRecord && editingRecord.clockOutTime ? format(parseISO(editingRecord.clockOutTime), 'HH:mm') : ''} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setEditingRecord(null)}>Cancel</Button>
                    <Button type="submit" disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );

    

    