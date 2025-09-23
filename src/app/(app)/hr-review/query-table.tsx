
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Loader2, File as FileIconLucide, X, CheckCircle, Trash2, Download, Search, Calendar as CalendarIcon } from "lucide-react";
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

export function HRQueryTable() {
  const { loggedInUser, users, hrQueries, currency } = useSettings();
  const [mySentQueries, setMySentQueries] = useState<HRQuery[]>([]);
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewingQuery, setReviewingQuery] = useState<HRQuery | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQueryIds, setSelectedQueryIds] = useState<string[]>([]);
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
    
    const sentByMe = hrQueries.filter(q => 
        q.requesterId === loggedInUser.id &&
        isWithinInterval(new Date(q.createdAt), { start, end })
    );

    sentByMe.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMySentQueries(sentByMe);

  }, [hrQueries, loggedInUser?.id, dateRange]);
  
  useEffect(() => {
    setSelectedQueryIds([]);
  }, [mySentQueries]);

  const filteredQueries = useMemo(() => {
    if (!searchTerm) return mySentQueries;
    const lowercasedTerm = searchTerm.toLowerCase();
    return mySentQueries.filter(q => 
        q.assigneeName.toLowerCase().includes(lowercasedTerm) ||
        q.title.toLowerCase().includes(lowercasedTerm) ||
        q.status.toLowerCase().includes(lowercasedTerm)
    );
  }, [mySentQueries, searchTerm]);
  
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
  
  const handleDeleteSelected = async () => {
    if (selectedQueryIds.length === 0) return;
    const batch = writeBatch(db);
    selectedQueryIds.forEach(id => {
        batch.delete(doc(db, "hr_queries", id));
    });

    try {
        await batch.commit();
        toast({
            title: `${selectedQueryIds.length} Quer(y/ies) Deleted`,
            description: "The selected queries have been permanently removed.",
        });
        setSelectedQueryIds([]);
    } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
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
  
    const handleExportCSV = () => {
    const csvData = filteredQueries.map(q => ({
      "Sent To": q.assigneeName,
      "Title": q.title,
      "Description": q.description,
      "Amount": q.amount,
      "Date Sent": format(new Date(q.createdAt), "MMM d, yyyy"),
      "Status": q.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hr_queries_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };

  const handleSelectAll = (checked: boolean) => {
      setSelectedQueryIds(checked ? filteredQueries.map(q => q.id) : []);
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    setSelectedQueryIds(prev => 
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
                {selectedQueryIds.length > 0 && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedQueryIds.length})
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected queries. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredQueries.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Dialog open={isQueryDialogOpen} onOpenChange={setIsQueryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Query</Button>
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
        </div>
        <div className="overflow-x-auto border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead padding="checkbox">
                            <Checkbox
                                checked={filteredQueries.length > 0 && selectedQueryIds.length === filteredQueries.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Select all queries"
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
                    {filteredQueries.length > 0 ? (
                        filteredQueries.map(query => (
                            <TableRow key={query.id} data-state={selectedQueryIds.includes(query.id) && "selected"}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedQueryIds.includes(query.id)}
                                        onCheckedChange={(checked) => handleSelectRecord(query.id, !!checked)}
                                        aria-label="Select query"
                                    />
                                </TableCell>
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
                            <TableCell colSpan={8} className="text-center h-24">You have no queries for the selected date range.</TableCell>
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

    