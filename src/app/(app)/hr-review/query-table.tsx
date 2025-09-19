
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Loader2, File as FileIcon } from "lucide-react";
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
import { collection, addDoc } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function HRQueryTable() {
  const { loggedInUser, users, hrQueries } = useSettings();
  const [mySentQueries, setMySentQueries] = useState<HRQuery[]>([]);
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
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

  const handleQuerySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedInUser?.businessId) return;

    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assigneeId = formData.get('assigneeId') as string;
    
    const assigneeUser = users.find(u => u.id === assigneeId);

    if (!title || !description || !assigneeId) {
        toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
        let attachmentUrls: { name: string, url: string }[] = [];
        if (attachments.length > 0) {
            const uploadPromises = attachments.map(async (file) => {
                const folder = `hr_query_attachments/${loggedInUser.id}`;
                await uploadFile(loggedInUser.businessId!, folder, file, () => {});
                const url = await getPublicUrl(loggedInUser.businessId!, `${folder}/${file.name}`);
                return { name: file.name, url };
            });
            attachmentUrls = await Promise.all(uploadPromises);
        }

        const newQuery: Omit<HRQuery, 'id'> = {
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
                        <TableHead className="w-[120px]">Date Sent</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mySentQueries.length > 0 ? (
                        mySentQueries.map(query => (
                            <TableRow key={query.id}>
                                <TableCell className="font-medium">{query.assigneeName}</TableCell>
                                <TableCell>{query.title}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-xs">{query.description}</TableCell>
                                <TableCell>{format(new Date(query.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(query.status)}>{query.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">You have not sent any queries.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </>
  );
}
