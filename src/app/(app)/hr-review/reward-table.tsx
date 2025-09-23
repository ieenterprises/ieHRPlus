
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { PlusCircle, Loader2, File as FileIconLucide, CheckCircle, Trash2, Download, Search, Calendar as CalendarIcon } from "lucide-react";
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
import { collection, addDoc, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentPreviewer } from "@/components/attachment-previewer";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Papa from "papaparse";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export function RewardTable() {
  const { loggedInUser, users, rewards, currency } = useSettings();
  const [mySentRewards, setMySentRewards] = useState<Reward[]>([]);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewingReward, setReviewingReward] = useState<Reward | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const { toast } = useToast();

  const allOtherUsers = useMemo(() => users.filter(u => u.id !== loggedInUser?.id), [users, loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.id) return;

    const start = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(new Date());
    const end = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());
    
    const sentByMe = rewards.filter(r => 
        r.proposerId === loggedInUser.id &&
        isWithinInterval(new Date(r.createdAt), { start, end })
    );

    sentByMe.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMySentRewards(sentByMe);

  }, [rewards, loggedInUser?.id, dateRange]);
  
  useEffect(() => {
    setSelectedRewardIds([]);
  }, [mySentRewards]);

  const filteredRewards = useMemo(() => {
    if (!searchTerm) return mySentRewards;
    const lowercasedTerm = searchTerm.toLowerCase();
    return mySentRewards.filter(r => 
        r.assigneeName.toLowerCase().includes(lowercasedTerm) ||
        r.title.toLowerCase().includes(lowercasedTerm) ||
        r.status.toLowerCase().includes(lowercasedTerm)
    );
  }, [mySentRewards, searchTerm]);
  
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

  const handleDeleteSelected = async () => {
    if (selectedRewardIds.length === 0) return;
    const batch = writeBatch(db);
    selectedRewardIds.forEach(id => {
        batch.delete(doc(db, "rewards", id));
    });

    try {
        await batch.commit();
        toast({
            title: `${selectedRewardIds.length} Reward(s) Deleted`,
            description: "The selected rewards have been permanently removed.",
        });
        setSelectedRewardIds([]);
    } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
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
  
  const handleExportCSV = () => {
    const csvData = filteredRewards.map(r => ({
      "Sent To": r.assigneeName,
      "Title": r.title,
      "Description": r.description,
      "Amount": r.amount,
      "Date Sent": format(new Date(r.createdAt), "MMM d, yyyy"),
      "Status": r.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `employee_rewards_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };

  const handleSelectAll = (checked: boolean) => {
      setSelectedRewardIds(checked ? filteredRewards.map(r => r.id) : []);
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    setSelectedRewardIds(prev => 
        checked ? [...prev, id] : prev.filter(pId => pId !== id)
    );
  };
  
  const DatePicker = () => (
     <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
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
    <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
             <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, title, status..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DatePicker />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2 self-end sm:self-center">
                {selectedRewardIds.length > 0 && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedRewardIds.length})
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected rewards. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredRewards.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Propose Reward</Button>
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
        </div>
        <div className="overflow-x-auto border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                         <TableHead padding="checkbox">
                            <Checkbox
                                checked={filteredRewards.length > 0 && selectedRewardIds.length === filteredRewards.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Select all rewards"
                            />
                        </TableHead>
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
                    {filteredRewards.length > 0 ? (
                        filteredRewards.map(reward => (
                            <TableRow key={reward.id} data-state={selectedRewardIds.includes(reward.id) && "selected"}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedRewardIds.includes(reward.id)}
                                        onCheckedChange={(checked) => handleSelectRecord(reward.id, !!checked)}
                                        aria-label="Select reward"
                                    />
                                </TableCell>
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
                            <TableCell colSpan={8} className="text-center h-24">You have no proposed rewards for the selected date range.</TableCell>
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

    

    