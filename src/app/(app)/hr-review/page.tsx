
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeRecord, UserRequest } from "@/lib/types";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Video, Download, Calendar as CalendarIcon, Trash2, Search, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { ScrollArea } from "@/components/ui/scroll-area";

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function HrReviewPage() {
  const { loggedInUser } = useSettings();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [requestSearchTerm, setRequestSearchTerm] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const { toast } = useToast();
  const storage = getStorage();

  const isSeniorStaff = useMemo(() => loggedInUser && seniorRoles.includes(loggedInUser.role), [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }

    const timeRecordsQuery = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId)
    );

    const timeRecordsUnsubscribe = onSnapshot(timeRecordsQuery, (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      setTimeRecords(allRecords);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching time records:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch time records. ' + error.message });
      setLoading(false);
    });

    const requestsQuery = query(
        collection(db, "userRequests"),
        where("businessId", "==", loggedInUser.businessId)
    );

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRequest));
        allRequests.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserRequests(allRequests);
    }, (error) => {
        console.error("Error fetching user requests:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch user requests. ' + error.message });
    });


    return () => {
        timeRecordsUnsubscribe();
        requestsUnsubscribe();
    };
  }, [loggedInUser?.businessId, toast]);

  const filteredTimeRecords = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return timeRecords.filter(record => isWithinInterval(new Date(record.clockInTime), { start, end }))
      .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
  }, [timeRecords, selectedDate]);
  
  useEffect(() => {
      setSelectedRecordIds([]);
  }, [selectedDate, filteredTimeRecords]);
  
  const handleOpenReviewDialog = (request: UserRequest, action: 'Approved' | 'Rejected') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewComments('');
  };

  const handleCloseReviewDialog = () => {
    setSelectedRequest(null);
    setReviewAction(null);
  };
  
  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction || !loggedInUser) return;
    try {
        const requestRef = doc(db, "userRequests", selectedRequest.id);
        await updateDoc(requestRef, {
            status: reviewAction,
            reviewComments,
            reviewerId: loggedInUser.id,
            reviewerName: loggedInUser.name,
            updatedAt: new Date().toISOString(),
        });
        toast({ title: "Request Updated", description: `The request has been ${reviewAction.toLowerCase()}.` });
        handleCloseReviewDialog();
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleExportCSV = (data: any[], tableType: string) => {
    let csvData;
    if (tableType === 'requests') {
        csvData = data.map(req => ({
            "Employee": req.userName,
            "Request Type": req.requestType,
            "Description": req.description,
            "Date Submitted": format(new Date(req.createdAt), "MMM d, yyyy, h:mm a"),
            "Status": req.status,
        }));
    } else {
        csvData = data.map(record => ({
            "Employee": record.userName,
            "Email": record.userEmail,
            "Clock In Time": format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a"),
            "Clock Out Time": record.clockOutTime ? format(new Date(record.clockOutTime), "MMM d, yyyy, h:mm a") : "-",
            "Status": record.status,
        }));
    }

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
  
  const getBadgeVariant = (status: TimeRecord['status'] | UserRequest['status']) => {
    switch (status) {
      case 'pending':
      case 'Pending':
        return 'secondary';
      case 'Clocked In':
      case 'Approved':
        return 'default';
      case 'Clocked Out':
        return 'outline';
      case 'rejected':
      case 'Rejected':
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
  
  const pendingRecords = filteredTimeRecords.filter(r => r.status === 'pending');
  const historicalRecords = filteredTimeRecords.filter(r => r.status !== 'pending');

  const filteredPendingRecords = useMemo(() => {
    if (!pendingSearchTerm) return pendingRecords;
    const lowercasedTerm = pendingSearchTerm.toLowerCase();
    return pendingRecords.filter(record =>
      record.userName.toLowerCase().includes(lowercasedTerm) ||
      record.userEmail.toLowerCase().includes(lowercasedTerm)
    );
  }, [pendingRecords, pendingSearchTerm]);

  const filteredHistoricalRecords = useMemo(() => {
    if (!historySearchTerm) return historicalRecords;
    const lowercasedTerm = historySearchTerm.toLowerCase();
    return historicalRecords.filter(record =>
      record.userName.toLowerCase().includes(lowercasedTerm) ||
      record.userEmail.toLowerCase().includes(lowercasedTerm)
    );
  }, [historicalRecords, historySearchTerm]);

  const filteredUserRequests = useMemo(() => {
      if (!requestSearchTerm) return userRequests;
      const lowercasedTerm = requestSearchTerm.toLowerCase();
      return userRequests.filter(req =>
        req.userName.toLowerCase().includes(lowercasedTerm) ||
        req.requestType.toLowerCase().includes(lowercasedTerm)
      );
  }, [userRequests, requestSearchTerm]);


  const handleSelectAll = (table: 'pending' | 'history', checked: boolean) => {
    const recordIds = (table === 'pending' ? filteredPendingRecords : filteredHistoricalRecords).map(r => r.id);
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
        <PageHeader title="HR Review" description="Review and manage employee clock-in records and requests." />
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
         <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><ClipboardList /> User Requests</CardTitle>
                        <CardDescription>Review and respond to employee requests.</CardDescription>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredUserRequests, 'requests')} disabled={filteredUserRequests.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                </div>
                <div className="mt-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or request type..."
                            className="pl-9"
                            value={requestSearchTerm}
                            onChange={(e) => setRequestSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Request Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading requests...</TableCell></TableRow>
                            ) : filteredUserRequests.length > 0 ? (
                                filteredUserRequests.map(request => (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium">{request.userName}</TableCell>
                                        <TableCell>{request.requestType}</TableCell>
                                        <TableCell className="text-muted-foreground truncate max-w-xs">{request.description}</TableCell>
                                        <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                                        <TableCell><Badge variant={getBadgeVariant(request.status)}>{request.status}</Badge></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {request.status === 'Pending' && isSeniorStaff && (
                                                <>
                                                    <Button size="sm" onClick={() => handleOpenReviewDialog(request, 'Approved')}>Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleOpenReviewDialog(request, 'Rejected')}>Reject</Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">No user requests found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Pending Submissions</CardTitle>
                    <CardDescription>
                    Approve or reject clock-in records after video verification.
                    </CardDescription>
                </div>
                {isSeniorStaff && (
                    <div className="flex items-center gap-2 self-start sm:self-center">
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
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredPendingRecords, 'pending')} disabled={filteredPendingRecords.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </div>
                )}
            </div>
            {isSeniorStaff && (
                 <div className="mt-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or email..."
                            className="pl-9"
                            value={pendingSearchTerm}
                            onChange={(e) => setPendingSearchTerm(e.target.value)}
                        />
                    </div>
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
                            checked={filteredPendingRecords.length > 0 && filteredPendingRecords.every(r => selectedRecordIds.includes(r.id))}
                            onCheckedChange={(checked) => handleSelectAll('pending', !!checked)}
                            aria-label="Select all pending"
                        />
                    </TableHead>
                  )}
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 6 : 5} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : filteredPendingRecords.length > 0 ? (
                  filteredPendingRecords.map((record) => (
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
                      <TableCell className="text-right space-x-2">
                          <Button size="sm" onClick={() => handleStatusUpdate(record.id, 'Clocked In')} disabled={!record.videoUrl || !isSeniorStaff}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(record.id, 'rejected')} disabled={!isSeniorStaff}>Reject</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(record)} disabled={!isSeniorStaff}>Delete</Button>
                      </TableCell>
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
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Time Clock History</CardTitle>
                    <CardDescription>
                    This is a log of all employee clock-in and clock-out events for the selected day.
                    </CardDescription>
                </div>
                {isSeniorStaff && (
                    <div className="flex items-center gap-2 self-start sm:self-center">
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
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredHistoricalRecords, 'history')} disabled={filteredHistoricalRecords.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </div>
                )}
            </div>
            {isSeniorStaff && (
                 <div className="mt-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or email..."
                            className="pl-9"
                            value={historySearchTerm}
                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                        />
                    </div>
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
                              checked={filteredHistoricalRecords.length > 0 && filteredHistoricalRecords.every(r => selectedRecordIds.includes(r.id))}
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
                ) : filteredHistoricalRecords.length > 0 ? (
                  filteredHistoricalRecords.map((record) => (
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
      
       <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && handleCloseReviewDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Request: {selectedRequest?.requestType}</DialogTitle>
            <DialogDescription>
              From: {selectedRequest?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div>
                <Label className="text-muted-foreground">Full Description</Label>
                <ScrollArea className="h-32 w-full rounded-md border p-4 mt-1">
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest?.description}</p>
                </ScrollArea>
             </div>
            <div>
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea 
                  id="comments" 
                  value={reviewComments} 
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Provide feedback or reasons for your decision..."
                  className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseReviewDialog}>Cancel</Button>
            <Button 
                onClick={handleSubmitReview}
                className={reviewAction === 'Rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
                Confirm {reviewAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
