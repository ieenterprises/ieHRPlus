

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Clock, CalendarCheck2, LogIn, PlusCircle, AlertCircle, File as FileIcon, Loader2, Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type UserRequest, type HRQuery } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function DashboardPage() {
  const { loggedInUser, users, logout, userRequests: allUserRequests, hrQueries: allHrQueries } = useSettings();
  const [myRequests, setMyRequests] = useState<UserRequest[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<UserRequest[]>([]);
  const [myQueries, setMyQueries] = useState<HRQuery[]>([]);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  const seniorStaffList = useMemo(() => users.filter(u => seniorRoles.includes(u.role)), [users]);
  const pendingQueries = useMemo(() => myQueries.filter(q => q.status === 'Sent' || q.status === 'Read'), [myQueries]);

  useEffect(() => {
    if (!loggedInUser?.id) return;

    const mySubmittedRequests = allUserRequests.filter(req => req.userId === loggedInUser.id);
    mySubmittedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyRequests(mySubmittedRequests);
    
    const assignedToMe = allUserRequests.filter(req => req.assignedToId === loggedInUser.id && (req.status === 'Forwarded' || req.status === 'Pending'));
    assignedToMe.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAssignedRequests(assignedToMe);

    const queriesForMe = allHrQueries.filter(q => q.assigneeId === loggedInUser.id);
    queriesForMe.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyQueries(queriesForMe);

  }, [allUserRequests, allHrQueries, loggedInUser?.id]);

  const handleSwitchUser = () => {
    logout(false);
  };
  
  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedInUser?.businessId) return;

    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    const requestType = formData.get('requestType') as string;
    const description = formData.get('description') as string;
    const assignedToId = formData.get('assignedToId') as string;
    
    const assignedToUser = users.find(u => u.id === assignedToId);

    if (!requestType || !description) {
        toast({ title: "Missing Information", description: "Please enter a request type and provide a description.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
        let attachmentUrls: { name: string, url: string }[] = [];
        if (attachments.length > 0) {
            const uploadPromises = attachments.map(async (file) => {
                const folder = `request_attachments/${loggedInUser.id}`;
                await uploadFile(loggedInUser.businessId!, folder, file, () => {});
                const url = await getPublicUrl(loggedInUser.businessId!, `${folder}/${file.name}`);
                return { name: file.name, url };
            });
            attachmentUrls = await Promise.all(uploadPromises);
        }

        const newRequest: Partial<UserRequest> = {
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            businessId: loggedInUser.businessId,
            requestType,
            description,
            attachments: attachmentUrls,
            assignedToId: assignedToId || null,
            assignedToName: assignedToUser?.name || null,
            status: "Pending",
            createdAt: new Date().toISOString(),
        };

        if (dateRange?.from) {
            newRequest.startDate = dateRange.from.toISOString();
        }
        if (dateRange?.to) {
            newRequest.endDate = dateRange.to.toISOString();
        }

        await addDoc(collection(db, "userRequests"), newRequest);
        
        toast({ title: "Request Submitted", description: "Your request has been sent for review." });
        setIsRequestDialogOpen(false);
        setAttachments([]);
        setDateRange(undefined);
    } catch (error: any) {
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
          setAttachments(Array.from(event.target.files));
      }
  };
  
  const getStatusBadgeVariant = (status: UserRequest['status'] | HRQuery['status']) => {
    switch (status) {
      case 'Pending':
      case 'Sent':
        return 'secondary';
      case 'Approved':
      case 'Responded':
        return 'default';
      case 'Rejected':
      case 'Closed':
        return 'destructive';
      case 'Forwarded':
      case 'Read':
        return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
            title={`Welcome, ${loggedInUser?.name || 'User'}!`}
            description="This is your personal dashboard."
        />
        <Button onClick={handleSwitchUser}>
            <LogIn className="mr-2 h-4 w-4" /> Switch User
        </Button>
      </div>
      
      {assignedRequests.length > 0 && (
        <Card className="border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <AlertCircle />
                    Pending Your Review
                </CardTitle>
                <CardDescription>
                    These requests have been assigned to you for review and approval.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Request Type</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>Forwarded By</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignedRequests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium">{req.requestType}</TableCell>
                                <TableCell>{req.userName}</TableCell>
                                <TableCell>{req.forwardedByName || 'Direct'}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild size="sm">
                                        <Link href="/hr-review">Review Request</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

      {pendingQueries.length > 0 && (
          <Card className="border-blue-500">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                      <HelpCircle />
                      You Have Pending Queries
                  </CardTitle>
                  <CardDescription>
                      HR or management requires information from you. Please review and respond to the queries listed below.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild>
                      <Link href="#my-queries-section">View Queries ({pendingQueries.length})</Link>
                  </Button>
              </CardContent>
          </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      My Profile
                  </CardTitle>
                  <CardDescription>Your personal and role information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={loggedInUser?.avatar_url || ''} alt={loggedInUser?.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{loggedInUser?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-bold text-lg">{loggedInUser?.name}</p>
                          <p className="text-sm text-muted-foreground">{loggedInUser?.email}</p>
                      </div>
                  </div>
                  <div>
                      <p className="text-sm font-medium">Role</p>
                      <Badge variant="secondary">{loggedInUser?.role}</Badge>
                  </div>
              </CardContent>
          </Card>
           <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        My Recent Activity
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">...</div>
                    <p className="text-xs text-muted-foreground">
                        Your latest clock-ins and actions.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        My Leave Balance
                    </CardTitle>
                    <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">...</div>
                    <p className="text-xs text-muted-foreground">
                        Your available vacation and sick days.
                    </p>
                </CardContent>
            </Card>
      </div>

      <Card id="my-queries-section">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                  <HelpCircle />
                  My Queries
              </CardTitle>
              <CardDescription>
                  These are requests for information sent to you by HR or management.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>Date Sent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {myQueries.length > 0 ? (
                          myQueries.map(query => (
                              <TableRow key={query.id}>
                                  <TableCell className="font-medium">{query.title}</TableCell>
                                  <TableCell>{query.requesterName}</TableCell>
                                  <TableCell>{format(new Date(query.createdAt), 'MMM d, yyyy')}</TableCell>
                                  <TableCell>
                                      <Badge variant={getStatusBadgeVariant(query.status)}>{query.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Button size="sm">View & Respond</Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">You have no queries.</TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>Submit and track requests for leave, salary, and more.</CardDescription>
            </div>
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Make a New Request</Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleRequestSubmit}>
                        <DialogHeader>
                            <DialogTitle>New Request</DialogTitle>
                            <DialogDescription>Provide a request type, a detailed description, and optionally assign it to a manager.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="requestType" className="text-right">Request Type</Label>
                                <Input id="requestType" name="requestType" className="col-span-3" required placeholder="e.g., Salary Advance, Leave of Absence" />
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="description" className="text-right pt-2">Description</Label>
                                <Textarea id="description" name="description" className="col-span-3" required placeholder="Please provide a detailed description..." />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Dates</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                        "col-span-3 justify-start text-left font-normal",
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
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="assignedToId" className="text-right">Assign To</Label>
                                <Select name="assignedToId">
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Optional: Assign to a manager..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {seniorStaffList.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="attachments" className="text-right pt-2">Attachments</Label>
                                <div className="col-span-3">
                                    <Input id="attachments" type="file" multiple onChange={handleFileChange} />
                                    {attachments.length > 0 && (
                                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                            {attachments.map(file => (
                                                <div key={file.name} className="flex items-center gap-2">
                                                    <FileIcon className="h-4 w-4" />
                                                    <span>{file.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Request
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Request Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[120px]">Date Submitted</TableHead>
                            <TableHead className="w-[150px]">Status</TableHead>
                            <TableHead>Assigned To</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {myRequests.length > 0 ? (
                            myRequests.map(request => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.requestType}</TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-sm">{request.description}</TableCell>
                                    <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {request.assignedToName && (
                                            <Badge variant="outline">{request.assignedToName}</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">You have not made any requests yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

