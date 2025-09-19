
"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Clock, CalendarCheck2, LogIn, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type UserRequest } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const requestTypes = {
  "Financial Requests": ["Salary Advance", "Salary Correction", "Benefits Information"],
  "Leave & Time-Off Requests": ["Leave of Absence", "Maternity/Paternity Leave"],
  "Workplace & Professional Development": ["Training & Growth Opportunities", "Feedback & Performance Review", "Changes in Job Description or Contract"],
  "Workplace Environment & Support": ["Grievance Redressal", "Reasonable Accommodations"],
};

export default function DashboardPage() {
  const { loggedInUser, logout } = useSettings();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loggedInUser?.id) return;

    const q = query(collection(db, "userRequests"), where("userId", "==", loggedInUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRequest))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(userRequests);
    });

    return () => unsubscribe();
  }, [loggedInUser?.id]);

  const handleSwitchUser = () => {
    // We log out without clocking out, preserving the "Clocked In" status.
    logout(false);
  };
  
  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedInUser) return;
    
    const formData = new FormData(event.currentTarget);
    const requestType = formData.get('requestType') as string;
    const description = formData.get('description') as string;

    if (!requestType || !description) {
        toast({ title: "Missing Information", description: "Please select a request type and provide a description.", variant: "destructive" });
        return;
    }

    try {
        await addDoc(collection(db, "userRequests"), {
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            businessId: loggedInUser.businessId,
            requestType,
            description,
            status: "Pending",
            createdAt: new Date().toISOString(),
        });
        toast({ title: "Request Submitted", description: "Your request has been sent for review." });
        setIsRequestDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const getStatusBadgeVariant = (status: UserRequest['status']) => {
    switch (status) {
      case 'Pending': return 'secondary';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
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
                            <DialogDescription>Select the type of request you want to make and provide details.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="requestType" className="text-right">Request Type</Label>
                                <Select name="requestType" required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a request type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(requestTypes).map(([group, types]) => (
                                            <div key={group}>
                                                <p className="px-2 py-1.5 text-sm font-semibold">{group}</p>
                                                {types.map(type => (
                                                    <SelectItem key={type} value={type} className="pl-4">{type}</SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="description" className="text-right pt-2">Description</Label>
                                <Textarea id="description" name="description" className="col-span-3" required placeholder="Please provide a detailed description of your request..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Submit Request</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Request Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[120px]">Date Submitted</TableHead>
                        <TableHead className="w-[120px] text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length > 0 ? (
                        requests.map(request => (
                            <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.requestType}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-sm">{request.description}</TableCell>
                                <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">You have not made any requests yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    