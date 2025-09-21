
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Clock, CalendarCheck2, LogIn, PlusCircle, AlertCircle, File as FileIcon, Loader2, Calendar as CalendarIcon, HelpCircle, Gift, Download, Search, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type UserRequest, type HRQuery, type Reward } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentPreviewer } from "@/components/attachment-previewer";
import Papa from "papaparse";

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function DashboardPage() {
  const { loggedInUser, users, logout, userRequests: allUserRequests, hrQueries: allHrQueries, rewards: allRewards, currency } = useSettings();
  const [myRequests, setMyRequests] = useState<UserRequest[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<UserRequest[]>([]);
  const [myQueries, setMyQueries] = useState<HRQuery[]>([]);
  const [myRewards, setMyRewards] = useState<Reward[]>([]);
  
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [responseAttachments, setResponseAttachments] = useState<File[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const [respondingQuery, setRespondingQuery] = useState<HRQuery | null>(null);
  const [viewingReward, setViewingReward] = useState<Reward | null>(null);
  
  const [requestSearch, setRequestSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [rewardSearch, setRewardSearch] = useState("");
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const { toast } = useToast();
  
  const isSeniorStaff = useMemo(() => loggedInUser && seniorRoles.includes(loggedInUser.role), [loggedInUser]);

  const seniorStaffList = useMemo(() => users.filter(u => seniorRoles.includes(u.role)), [users]);
  const pendingQueries = useMemo(() => myQueries.filter(q => q.status === 'Sent' || q.status === 'Read'), [myQueries]);
  const pendingRewards = useMemo(() => myRewards.filter(r => r.status === 'Proposed'), [myRewards]);

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
    
    const rewardsForMe = allRewards.filter(r => r.assigneeId === loggedInUser.id);
    rewardsForMe.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyRewards(rewardsForMe);

  }, [allUserRequests, allHrQueries, allRewards, loggedInUser?.id]);

  useEffect(() => {
    if (!loggedInUser) return;
    const q = query(
        collection(db, 'chatMessages'),
        where('businessId', '==', loggedInUser.businessId),
        where('receiverId', '==', loggedInUser.id),
        where('isRead', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const uniqueSenders = new Set(snapshot.docs.map(doc => doc.data().senderId));
        setUnreadChatCount(uniqueSenders.size);
    });
    return () => unsubscribe();
  }, [loggedInUser]);

  const filteredMyRequests = useMemo(() => {
      if (!requestSearch) return myRequests;
      const lowercasedTerm = requestSearch.toLowerCase();
      return myRequests.filter(req => 
          req.requestType.toLowerCase().includes(lowercasedTerm) ||
          req.description.toLowerCase().includes(lowercasedTerm) ||
          req.status.toLowerCase().includes(lowercasedTerm)
      );
  }, [myRequests, requestSearch]);

  const filteredMyQueries = useMemo(() => {
      if (!querySearch) return myQueries;
      const lowercasedTerm = querySearch.toLowerCase();
      return myQueries.filter(q =>
          q.title.toLowerCase().includes(lowercasedTerm) ||
          q.requesterName.toLowerCase().includes(lowercasedTerm) ||
          q.status.toLowerCase().includes(lowercasedTerm)
      );
  }, [myQueries, querySearch]);
  
  const filteredMyRewards = useMemo(() => {
      if (!rewardSearch) return myRewards;
      const lowercasedTerm = rewardSearch.toLowerCase();
      return myRewards.filter(r =>
          r.title.toLowerCase().includes(lowercasedTerm) ||
          r.proposerName.toLowerCase().includes(lowercasedTerm) ||
          r.status.toLowerCase().includes(lowercasedTerm)
      );
  }, [myRewards, rewardSearch]);

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
    const amount = formData.get('amount') as string;
    
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
            amount: amount ? parseFloat(amount) : undefined,
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

  const handleQueryResponseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedInUser?.businessId || !respondingQuery) return;

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = formData.get('response') as string;

    if (!response) {
      toast({ title: "Response Required", description: "Please enter a response.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      let attachmentUrls: { name: string, url: string }[] = [];
      if (responseAttachments.length > 0) {
        const uploadPromises = responseAttachments.map(async (file) => {
          const folder = `hr_query_responses/${loggedInUser.id}`;
          await uploadFile(loggedInUser.businessId!, folder, file, () => {});
          const url = await getPublicUrl(loggedInUser.businessId!, `${folder}/${file.name}`);
          return { name: file.name, url };
        });
        attachmentUrls = await Promise.all(uploadPromises);
      }

      const queryRef = doc(db, 'hr_queries', respondingQuery.id);
      await updateDoc(queryRef, {
        status: 'Responded',
        response: response,
        responseAttachments: attachmentUrls,
        respondedAt: new Date().toISOString(),
      });

      toast({ title: "Response Sent", description: "Your response has been sent to HR/management." });
      setRespondingQuery(null);
      setResponseAttachments([]);

    } catch (error: any) {
      toast({ title: "Response Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = (data: any[], fileName: string) => {
    if (data.length === 0) {
      toast({ title: "No Data to Export" });
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
          setAttachments(Array.from(event.target.files));
      }
  };

  const handleResponseFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
          setResponseAttachments(Array.from(event.target.files));
      }
  };
  
  const getStatusBadgeVariant = (status: UserRequest['status'] | HRQuery['status'] | Reward['status']) => {
    switch (status) {
      case 'Pending':
      case 'Sent':
      case 'Proposed':
        return 'secondary';
      case 'Approved':
      case 'Responded':
      case 'Acknowledged':
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

  const openQueryDialog = async (query: HRQuery) => {
    setRespondingQuery(query);
    setIsQueryDialogOpen(true);
    // Mark as read if status is 'Sent'
    if (query.status === 'Sent') {
        const queryRef = doc(db, 'hr_queries', query.id);
        await updateDoc(queryRef, { status: 'Read' });
    }
  };
  
  const openRewardDialog = async (reward: Reward) => {
    setViewingReward(reward);
    setIsRewardDialogOpen(true);
    if (reward.status === 'Proposed') {
        const rewardRef = doc(db, 'rewards', reward.id);
        await updateDoc(rewardRef, { status: 'Acknowledged' });
    }
  };
  
  const closeQueryDialog = () => {
    setRespondingQuery(null);
    setIsQueryDialogOpen(false);
    setResponseAttachments([]);
  };

  const closeRewardDialog = () => {
    setViewingReward(null);
    setIsRewardDialogOpen(false);
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

      {unreadChatCount > 0 && (
        <Card className="border-purple-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                    <MessageSquare />
                    You Have Unread Messages
                </CardTitle>
                <CardDescription>
                    You have unread messages from {unreadChatCount} {unreadChatCount > 1 ? 'people' : 'person'}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/meeting">View Chats ({unreadChatCount})</Link>
                </Button>
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
      
      {pendingRewards.length > 0 && (
          <Card className="border-green-500">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                      <Gift />
                      You Have New Rewards
                  </CardTitle>
                  <CardDescription>
                      You have been recognized for your hard work! View your rewards below.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild>
                      <Link href="#my-rewards-section">View Rewards ({pendingRewards.length})</Link>
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
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                      <HelpCircle />
                      My Queries
                  </CardTitle>
                  <CardDescription>
                      These are requests for information sent to you by HR or management.
                  </CardDescription>
              </div>
              {isSeniorStaff && (
                  <div className="flex w-full sm:w-auto items-center gap-2">
                      <div className="relative flex-1 sm:flex-initial">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                              placeholder="Search queries..."
                              className="pl-9"
                              value={querySearch}
                              onChange={(e) => setQuerySearch(e.target.value)}
                          />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredMyQueries, 'my_queries')}>
                          <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                  </div>
              )}
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date Sent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredMyQueries.length > 0 ? (
                          filteredMyQueries.map(query => (
                              <TableRow key={query.id}>
                                  <TableCell className="font-medium">{query.title}</TableCell>
                                  <TableCell>{query.requesterName}</TableCell>
                                  <TableCell>
                                      {query.amount != null ? `${currency}${query.amount.toFixed(2)}` : 'N/A'}
                                  </TableCell>
                                  <TableCell>{format(new Date(query.createdAt), 'MMM d, yyyy')}</TableCell>
                                  <TableCell>
                                      <Badge variant={getStatusBadgeVariant(query.status)}>{query.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Button size="sm" onClick={() => openQueryDialog(query)}>
                                        {query.status === 'Responded' ? 'Preview' : 'View & Respond'}
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">You have no queries.</TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      
       <Card id="my-rewards-section">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                      <Gift />
                      My Rewards
                  </CardTitle>
                  <CardDescription>
                      A log of all rewards and recognitions you have received.
                  </CardDescription>
              </div>
              {isSeniorStaff && (
                  <div className="flex w-full sm:w-auto items-center gap-2">
                      <div className="relative flex-1 sm:flex-initial">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                              placeholder="Search rewards..."
                              className="pl-9"
                              value={rewardSearch}
                              onChange={(e) => setRewardSearch(e.target.value)}
                          />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredMyRewards, 'my_rewards')}>
                          <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                  </div>
              )}
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date Sent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredMyRewards.length > 0 ? (
                          filteredMyRewards.map(reward => (
                              <TableRow key={reward.id}>
                                  <TableCell className="font-medium">{reward.title}</TableCell>
                                  <TableCell>{reward.proposerName}</TableCell>
                                   <TableCell>
                                      {reward.amount != null ? `${currency}${reward.amount.toFixed(2)}` : 'N/A'}
                                  </TableCell>
                                  <TableCell>{format(new Date(reward.createdAt), 'MMM d, yyyy')}</TableCell>
                                  <TableCell>
                                      <Badge variant={getStatusBadgeVariant(reward.status)}>{reward.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Button size="sm" variant="outline" onClick={() => openRewardDialog(reward)}>
                                        View
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">You have no rewards.</TableCell>
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
             <div className="flex w-full sm:w-auto items-center gap-2 self-start sm:self-center">
                {isSeniorStaff && (
                    <>
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search requests..."
                                className="pl-9"
                                value={requestSearch}
                                onChange={(e) => setRequestSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV(filteredMyRequests, 'my_requests')}>
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </>
                )}
                <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New</Button>
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
                                    <Label htmlFor="amount" className="text-right">Amount (Optional)</Label>
                                    <Input id="amount" name="amount" type="number" step="0.01" className="col-span-3" placeholder="e.g., 500.00" />
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
                                                        <FileIcon item={{ type: 'file', name: file.name, metadata: {size: 0, updated: '', timeCreated: ''} }} />
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
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Request Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="w-[120px]">Date Submitted</TableHead>
                            <TableHead className="w-[150px]">Status</TableHead>
                            <TableHead>Assigned To</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMyRequests.length > 0 ? (
                            filteredMyRequests.map(request => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.requestType}</TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-sm">{request.description}</TableCell>
                                    <TableCell>
                                        {request.amount != null ? `${currency}${request.amount.toFixed(2)}` : 'N/A'}
                                    </TableCell>
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
                                <TableCell colSpan={6} className="text-center h-24">You have not made any requests yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isQueryDialogOpen} onOpenChange={closeQueryDialog}>
        <DialogContent className="sm:max-w-xl">
          {respondingQuery && (
            <form onSubmit={handleQueryResponseSubmit}>
              <DialogHeader>
                <DialogTitle>Query: {respondingQuery.title}</DialogTitle>
                <DialogDescription>
                  From: {respondingQuery.requesterName} on {format(new Date(respondingQuery.createdAt), 'PPP')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Query Details</Label>
                  <ScrollArea className="h-24 w-full rounded-md border p-4 bg-secondary/50">
                    <p className="text-sm whitespace-pre-wrap">{respondingQuery.description}</p>
                  </ScrollArea>
                </div>
                 {respondingQuery.amount != null && (
                    <div className="text-sm font-medium">
                        Associated Amount/Fine: <span className="font-bold text-destructive">{currency}{respondingQuery.amount.toFixed(2)}</span>
                    </div>
                )}
                {respondingQuery.attachments && respondingQuery.attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Attachments from Requester</Label>
                    <AttachmentPreviewer attachments={respondingQuery.attachments} />
                  </div>
                )}
                <div className="grid items-start gap-4">
                  <Label htmlFor="response" className="pt-2">Your Response</Label>
                  <Textarea id="response" name="response" className="" required placeholder="Please provide a detailed response..." disabled={respondingQuery.status === 'Responded'} defaultValue={respondingQuery.response || ''} />
                </div>
                <div className="grid items-start gap-4">
                  <Label htmlFor="response-attachments" className="pt-2">Add Attachments</Label>
                  <div className="">
                    <Input id="response-attachments" type="file" multiple onChange={handleResponseFileChange} disabled={respondingQuery.status === 'Responded'}/>
                    {responseAttachments.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        {responseAttachments.map(file => (
                          <div key={file.name} className="flex items-center gap-2">
                            <FileIcon item={{ type: 'file', name: file.name, metadata: {size: 0, updated: '', timeCreated: ''} }} />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {respondingQuery.status === 'Responded' && respondingQuery.responseAttachments && respondingQuery.responseAttachments.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Your Submitted Attachments</Label>
                        <AttachmentPreviewer attachments={respondingQuery.responseAttachments} />
                    </div>
                )}
              </div>
              <DialogFooter>
                {respondingQuery.status !== 'Responded' && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Response
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={closeQueryDialog}>Close</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
       <Dialog open={isRewardDialogOpen} onOpenChange={closeRewardDialog}>
        <DialogContent className="sm:max-w-xl">
          {viewingReward && (
            <>
              <DialogHeader>
                <DialogTitle>Reward: {viewingReward.title}</DialogTitle>
                <DialogDescription>
                  From: {viewingReward.proposerName} on {format(new Date(viewingReward.createdAt), 'PPP')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Reward Details</Label>
                  <ScrollArea className="h-24 w-full rounded-md border p-4 bg-secondary/50">
                    <p className="text-sm whitespace-pre-wrap">{viewingReward.description}</p>
                  </ScrollArea>
                </div>
                {viewingReward.amount != null && (
                    <div className="text-sm font-medium">
                        Amount: <span className="font-bold text-green-600">{currency}{viewingReward.amount.toFixed(2)}</span>
                    </div>
                )}
                {viewingReward.attachments && viewingReward.attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Attachments</Label>
                    <AttachmentPreviewer attachments={viewingReward.attachments} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeRewardDialog}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    