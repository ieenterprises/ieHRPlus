
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { PlusCircle, Loader2, File as FileIconLucide, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Reward } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentPreviewer } from "@/components/attachment-previewer";

export function RewardTable() {
  const { loggedInUser, users, rewards, currency } = useSettings();
  const [mySentRewards, setMySentRewards] = useState<Reward[]>([]);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewingReward, setReviewingReward] = useState<Reward | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const allOtherUsers = useMemo(() => users.filter(u => u.id !== loggedInUser?.id), [users, loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.id) return;

    const sentByMe = rewards.filter(r => r.proposerId === loggedInUser.id);
    sentByMe.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMySentRewards(sentByMe);

  }, [rewards, loggedInUser?.id]);
  
  const handleOpenReviewDialog = (reward: Reward) => {
    setReviewingReward(reward);
    setIsReviewDialogOpen(true);
  };
  
  const handleCloseReward = async (rewardId: string) => {
    try {
        const rewardRef = doc(db, 'rewards', rewardId);
        await updateDoc(rewardRef, { status: 'Closed' });
        toast({ title: "Reward Closed", description: "This reward has been marked as closed." });
        setIsReviewDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not close reward: ${error.message}`, variant: "destructive" });
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
                // Upload to a temporary/general folder first
                const tempFolder = `reward_attachments/${loggedInUser.id}`;
                await uploadFile(loggedInUser.businessId!, tempFolder, file, () => {});
                const url = await getPublicUrl(loggedInUser.businessId!, `${tempFolder}/${file.name}`);

                // Also upload a copy to the employee's personal documents
                const personalDocsFolder = `documents`;
                await uploadFile(loggedInUser.businessId!, assigneeUser.id, personalDocsFolder, file, () => {});

                return { name: file.name, url };
            });
            attachmentUrls = await Promise.all(uploadPromises);
        }

        const newReward: Omit<Reward, 'id'> & { amount?: number } = {
            proposerId: loggedInUser.id,
            proposerName: loggedInUser.name,
            assigneeId,
            assigneeName: assigneeUser?.name || '',
            businessId: loggedInUser.businessId,
            title,
            description,
            attachments: attachmentUrls,
            status: "Proposed",
            createdAt: new Date().toISOString(),
        };

        if (amount) {
            newReward.amount = parseFloat(amount);
        }

        await addDoc(collection(db, "rewards"), newReward);
        
        toast({ title: "Reward Proposed", description: "Your reward proposal has been sent to the employee." });
        setIsRewardDialogOpen(false);
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
  
  const getStatusBadgeVariant = (status: Reward['status']) => {
    switch (status) {
      case 'Proposed': return 'secondary';
      case 'Acknowledged': return 'default';
      case 'Closed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <>
        <div className="flex justify-end mb-4">
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Propose New Reward</Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={handleRewardSubmit}>
                        <DialogHeader>
                            <DialogTitle>New Reward Proposal</DialogTitle>
                            <DialogDescription>Recognize an employee for their hard work.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="assigneeId" className="text-right">To Employee</Label>
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
                                <Input id="title" name="title" className="col-span-3" required placeholder="e.g., Employee of the Month" />
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="description" className="text-right pt-2">Reason / Description</Label>
                                <Textarea id="description" name="description" className="col-span-3" required placeholder="Please provide details..." />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Amount (Optional)</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" className="col-span-3" placeholder="e.g., 200.00 for a bonus" />
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
                                Propose Reward
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
                    {mySentRewards.length > 0 ? (
                        mySentRewards.map(reward => (
                            <TableRow key={reward.id}>
                                <TableCell className="font-medium">{reward.assigneeName}</TableCell>
                                <TableCell>{reward.title}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-xs">{reward.description}</TableCell>
                                <TableCell>
                                    {reward.amount != null ? `${currency}${reward.amount.toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell>{format(new Date(reward.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(reward.status)}>{reward.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleOpenReviewDialog(reward)}>
                                        View Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">You have not proposed any rewards.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                {reviewingReward && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Review Reward: {reviewingReward.title}</DialogTitle>
                            <DialogDescription>
                                Sent to: {reviewingReward.assigneeName} on {format(new Date(reviewingReward.createdAt), 'PPP')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="space-y-2">
                                <Label className="font-semibold">Reward Details</Label>
                                <ScrollArea className="h-24 w-full rounded-md border p-4 bg-secondary/50">
                                    <p className="text-sm whitespace-pre-wrap">{reviewingReward.description}</p>
                                </ScrollArea>
                                 {reviewingReward.amount != null && (
                                    <div className="text-sm font-medium">
                                        Amount: <span className="font-bold text-green-600">{currency}{reviewingReward.amount.toFixed(2)}</span>
                                    </div>
                                )}
                                {reviewingReward.attachments && reviewingReward.attachments.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-muted-foreground">Attachments</Label>
                                        <AttachmentPreviewer attachments={reviewingReward.attachments} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                            {reviewingReward.status !== 'Closed' && (
                                <Button onClick={() => handleCloseReward(reviewingReward.id)}>
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

    