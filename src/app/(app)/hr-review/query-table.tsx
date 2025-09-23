
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Loader2, File as FileIconLucide, X, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type HRQuery } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentPreviewer } from "@/components/attachment-previewer";

export function HRQueryTable() {
  const { loggedInUser, users, hrQueries, currency } = useSettings();
  const [mySentQueries, setMySentQueries] = useState<HRQuery[]>([]);
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewingQuery, setReviewingQuery] = useState<HRQuery | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const allOtherUsers = useMemo(() => users.filter(u => u.id !== loggedInUser?.id), [users, loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.id) return;

    const sentByMe = hrQueries.filter(q => q.requesterId === loggedInUser.id);
    sentByMe.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMySentQueries(sentByMe);

  }, [hrQueries, loggedInUser?.id]);
  
  const handleOpenReviewDialog = (query: HRQuery) => {
    setReviewingQuery(query);
    setIsReviewDialogOpen(true);
  };
  
  const handleCloseQuery = async (queryId: string) => {
    try {
        const queryRef = doc(db, 'hr_queries', queryId);
        await updateDoc(queryRef, { status: 'Closed' });
        toast({ title: "Query Closed", description: "This query has been marked as closed." });
        setIsReviewDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not close query: ${error.message}`, variant: "destructive" });
    }
  };

  const handleQuerySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedInUser?.businessId) return;

    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const amount = formData.get('amount') as string;
    
    const assigneeUser = users.find(u => u.id === assigneeId);

    if (!title || !description || !assigneeId || !assigneeUser) {
        toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
        let attachmentUrls: { name: string, url: string }[] = [];
        if (attachments.length > 0) {
            const uploadPromises = attachments.map(async (file) => {
                // Upload to a temporary/general query folder first
                const tempFolder = `hr_query_attachments/${loggedInUser.id}`;
                await uploadFile(loggedInUser.businessId!, tempFolder, file, () => {});
                const url = await getPublicUrl(loggedInUser.businessId!, `${tempFolder}/${file.name}`);
                
                // Also upload a copy to the employee's personal documents
                const personalDocsFolder = `documents`;
                await uploadFile(loggedInUser.businessId!, assigneeUser.id, personalDocsFolder, file, () => {});

                return { name: file.name, url };
            });
            attachmentUrls = await Promise.all(uploadPromises);
        }

        const newQuery: Omit<HRQuery, 'id'> & { amount?: number } = {
            requesterId: loggedInUser.id,
            requesterName: loggedInUser.name,
            assigneeId,
            assigneeName: assigneeUser?.name || '',
            businessId: loggedInUser.businessId,
            title,
            description,
            attachments: attachmentUrls,
            status: "Sent",
            createdAt: new Date().toISOString(),
        };

        if (amount) {
            newQuery.amount = parseFloat(amount);
        }

        await addDoc(collection(db, "hr_queries"), newQuery);
        
        toast({ title: "Query Sent", description: "Your query has been sent to the employee." });
        setIsQueryDialogOpen(false);
        setAttachments([]);
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
  
  const getStatusBadgeVariant = (status: HRQuery['status']) => {
    switch (status) {
      case 'Sent': return 'secondary';
      case 'Read': return 'outline';
      case 'Responded': return 'default';
      case 'Closed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <>
        <div className="flex justify-end mb-4">
            <Dialog open={isQueryDialogOpen} onOpenChange={setIsQueryDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Send New Query</Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleQuerySubmit}>
                        <DialogHeader>
                            <DialogTitle>New HR Query</DialogTitle>
                            <DialogDescription>Send an official request for information to an employee.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="assigneeId" className="text-right">Assign To</Label>
                                <Select name="assigneeId" required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select an employee..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allOtherUsers.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">Title / Subject</Label>
                                <Input id="title" name="title" className="col-span-3" required placeholder="e.g., Clarification on Expense Report" />
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="description" className="text-right pt-2">Description</Label>
                                <Textarea id="description" name="description" className="col-span-3" required placeholder="Please provide details..." />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Amount (Optional)</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" className="col-span-3" placeholder="e.g., 50.00 for a fine" />
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="attachments" className="text-right pt-2">Attachments</Label>
                                <div className="col-span-3">
                                    <Input id="attachments" type="file" multiple onChange={handleFileChange} />
                                    {attachments.length > 0 && (
                                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                            {attachments.map(file => (
                                                <div key={file.name} className="flex items-center gap-2">
                                                    <FileIconLucide className="h-4 w-4" />
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
                                Send Query
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sent To</TableHead>
                        <TableHead className="w-[250px]">Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="w-[120px]">Date Sent</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mySentQueries.length > 0 ? (
                        mySentQueries.map(query => (
                            <TableRow key={query.id}>
                                <TableCell className="font-medium">{query.assigneeName}</TableCell>
                                <TableCell>{query.title}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-xs">{query.description}</TableCell>
                                <TableCell>
                                    {query.amount != null ? `${currency}${query.amount.toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell>{format(new Date(query.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(query.status)}>{query.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleOpenReviewDialog(query)}>
                                        {query.status === 'Responded' ? 'Review Response' : 'View'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">You have not sent any queries.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                {reviewingQuery && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Review Query: {reviewingQuery.title}</DialogTitle>
                            <DialogDescription>
                                Sent to: {reviewingQuery.assigneeName} on {format(new Date(reviewingQuery.createdAt), 'PPP')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="space-y-2">
                                <Label className="font-semibold">Original Query</Label>
                                <ScrollArea className="h-24 w-full rounded-md border p-4 bg-secondary/50">
                                    <p className="text-sm whitespace-pre-wrap">{reviewingQuery.description}</p>
                                </ScrollArea>
                                {reviewingQuery.amount != null && (
                                    <div className="text-sm font-medium">
                                        Amount/Fine: <span className="font-bold text-destructive">{currency}{reviewingQuery.amount.toFixed(2)}</span>
                                    </div>
                                )}
                                {reviewingQuery.attachments && reviewingQuery.attachments.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-muted-foreground">Attachments</Label>
                                        <AttachmentPreviewer attachments={reviewingQuery.attachments} />
                                    </div>
                                )}
                            </div>

                            {reviewingQuery.status === 'Responded' || reviewingQuery.status === 'Closed' ? (
                                <div className="space-y-2">
                                    <Label className="font-semibold">Employee's Response</Label>
                                     <ScrollArea className="h-24 w-full rounded-md border p-4">
                                        <p className="text-sm whitespace-pre-wrap">{reviewingQuery.response || 'No text response provided.'}</p>
                                    </ScrollArea>
                                    {reviewingQuery.responseAttachments && reviewingQuery.responseAttachments.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            <Label className="text-muted-foreground">Response Attachments</Label>
                                            <AttachmentPreviewer attachments={reviewingQuery.responseAttachments} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground p-4 border rounded-md">
                                    The employee has not responded to this query yet.
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                            {reviewingQuery.status === 'Responded' && (
                                <Button onClick={() => handleCloseQuery(reviewingQuery.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Closed
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}

    