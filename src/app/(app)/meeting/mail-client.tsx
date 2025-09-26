
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, MoreVertical, CheckSquare, Trash2, Loader2, Inbox, Reply, Forward, Paperclip, Upload, Folder } from 'lucide-react';
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentPreviewer } from '@/components/attachment-previewer';
import { FileManagerPickerDialog } from '@/components/file-manager-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import type { User, InternalMail, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { getPublicUrl, uploadFile } from '@/lib/firebase-storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type MailboxView = "inbox" | "sent";

export function MailClient() {
    const { loggedInUser, users } = useSettings();
    const { toast } = useToast();

    const [mails, setMails] = useState<InternalMail[]>([]);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [viewingMail, setViewingMail] = useState<InternalMail | null>(null);
    const [replyingTo, setReplyingTo] = useState<InternalMail | null>(null);
    const [forwardingMail, setForwardingMail] = useState<InternalMail | null>(null);
    const [activeMailbox, setActiveMailbox] = useState<MailboxView>("inbox");
    const [mailSearch, setMailSearch] = useState("");
    const [isMailSelectionMode, setIsMailSelectionMode] = useState(false);
    const [selectedMailIds, setSelectedMailIds] = useState<string[]>([]);

    const otherUsers = useMemo(() => users.filter(u => u.id !== loggedInUser?.id), [users, loggedInUser]);

    useEffect(() => {
        if (!loggedInUser) return;
        const q = query(
            collection(db, 'internal_mails'),
            where('businessId', '==', loggedInUser.businessId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allMails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail));
            allMails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setMails(allMails);
        });
        return () => unsubscribe();
    }, [loggedInUser]);

    const inboxMails = useMemo(() => mails.filter(m => (m.toRecipients.some(r => r.id === loggedInUser?.id) || m.ccRecipients.some(r => r.id === loggedInUser?.id)) && (mailSearch ? (m.subject.toLowerCase().includes(mailSearch.toLowerCase()) || m.senderName.toLowerCase().includes(mailSearch.toLowerCase())) : true)), [mails, loggedInUser, mailSearch]);
    const sentMails = useMemo(() => mails.filter(m => m.senderId === loggedInUser?.id && (mailSearch ? (m.subject.toLowerCase().includes(mailSearch.toLowerCase()) || [...m.toRecipients, ...m.ccRecipients].some(r => r.name.toLowerCase().includes(mailSearch.toLowerCase()))) : true)), [mails, loggedInUser, mailSearch]);
    
    const isUnread = (mail: InternalMail) => loggedInUser && !mail.readBy[loggedInUser.id];

    const handleOpenMail = async (mail: InternalMail) => {
        setViewingMail(mail);
        if (loggedInUser && !mail.readBy[loggedInUser.id]) {
            await updateDoc(doc(db, 'internal_mails', mail.id), { [`readBy.${loggedInUser.id}`]: true });
        }
    };

    const handleOpenCompose = (options?: { replyTo?: InternalMail, forward?: InternalMail }) => {
        setReplyingTo(options?.replyTo || null);
        setForwardingMail(options?.forward || null);
        setIsComposeOpen(true);
    };

    const handleDeleteSelectedMails = async () => {
        if (selectedMailIds.length === 0) return;
        const batch = writeBatch(db);
        selectedMailIds.forEach(mailId => batch.delete(doc(db, 'internal_mails', mailId)));
        try {
            await batch.commit();
            toast({ title: `${selectedMailIds.length} mail(s) deleted.` });
            setMails(prev => prev.filter(mail => !selectedMailIds.includes(mail.id)));
            setIsMailSelectionMode(false); setSelectedMailIds([]); setViewingMail(null);
        } catch (error) { toast({ variant: 'destructive', title: 'Error deleting mails' }); }
    };
    
    return (
      <Card className="h-[70vh] flex">
        <div className="w-1/3 max-w-sm border-r flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Mailing</CardTitle>
                    {isMailSelectionMode ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setIsMailSelectionMode(false); setSelectedMailIds([]); }}>Cancel</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={selectedMailIds.length === 0}><Trash2 className="mr-2 h-4 w-4" />Delete ({selectedMailIds.length})</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected mail(s).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedMails} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => { setIsMailSelectionMode(true); setSelectedMailIds([]); }}><CheckSquare className="h-4 w-4" /></Button>
                            <Button size="sm" onClick={() => handleOpenCompose()}><Send className="mr-2 h-4 w-4" /> New Mail</Button>
                        </div>
                    )}
                </div>
                <div className="relative mt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search mail..." className="pl-9" value={mailSearch} onChange={(e) => setMailSearch(e.target.value)} /></div>
            </CardHeader>
            <Tabs value={activeMailbox} onValueChange={(v) => setActiveMailbox(v as MailboxView)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-4"><TabsTrigger value="inbox" className="w-full">Inbox {inboxMails.filter(isUnread).length > 0 && <Badge className="ml-2">{inboxMails.filter(isUnread).length}</Badge>}</TabsTrigger><TabsTrigger value="sent" className="w-full">Sent</TabsTrigger></TabsList>
                <ScrollArea className="flex-1">
                    <TabsContent value="inbox" className="m-0">
                      {inboxMails.map(mail => (
                        <div key={mail.id} className={`flex items-center border-b hover:bg-accent ${viewingMail?.id === mail.id ? 'bg-accent' : ''}`}>
                            {isMailSelectionMode && (<div className="p-4"><Checkbox checked={selectedMailIds.includes(mail.id)} onCheckedChange={() => setSelectedMailIds(p => p.includes(mail.id) ? p.filter(id => id !== mail.id) : [...p, mail.id])} /></div>)}
                            <button onClick={() => handleOpenMail(mail)} className="w-full text-left block p-4">
                                <div className="flex justify-between items-center">
                                    <p className={`font-semibold truncate ${isUnread(mail) ? 'text-primary' : ''}`}>{mail.senderName}</p>
                                    <p className={`text-xs ${isUnread(mail) ? 'text-primary' : 'text-muted-foreground'}`}>{mail.timestamp ? formatDistanceToNow(new Date(mail.timestamp), { addSuffix: true }) : ''}</p>
                                </div>
                                <p className={`truncate ${isUnread(mail) ? 'font-bold' : ''}`}>{mail.subject}</p>
                                <p className="text-xs text-muted-foreground truncate">{[...mail.toRecipients, ...mail.ccRecipients].map(r => r.name).join(', ')}</p>
                            </button>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="sent" className="m-0">
                      {sentMails.map(mail => (
                        <div key={mail.id} className={`flex items-center border-b hover:bg-accent ${viewingMail?.id === mail.id ? 'bg-accent' : ''}`}>
                            {isMailSelectionMode && (<div className="p-4"><Checkbox checked={selectedMailIds.includes(mail.id)} onCheckedChange={() => setSelectedMailIds(p => p.includes(mail.id) ? p.filter(id => id !== mail.id) : [...p, mail.id])} /></div>)}
                            <button onClick={() => handleOpenMail(mail)} className="w-full text-left block p-4">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold truncate">To: {[...mail.toRecipients, ...mail.ccRecipients].map(r => r.name).join(', ')}</p>
                                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{mail.timestamp ? formatDistanceToNow(new Date(mail.timestamp), { addSuffix: true }) : ''}</p>
                                </div>
                                <p className="truncate font-medium">{mail.subject}</p><p className="text-sm text-muted-foreground truncate">{mail.body}</p>
                            </button>
                        </div>
                      ))}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
        <div className="w-2/3 flex flex-col">
            {viewingMail ? (
              <div className="flex flex-col h-full">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between"><CardTitle className="truncate">{viewingMail.subject}</CardTitle><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => handleOpenCompose({ replyTo: viewingMail })}><Reply className="mr-2 h-4 w-4" /> Reply</DropdownMenuItem><DropdownMenuItem onClick={() => handleOpenCompose({ forward: viewingMail })}><Forward className="mr-2 h-4 w-4" /> Forward</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={users.find(u=>u.id === viewingMail.senderId)?.avatar_url || ''} /><AvatarFallback>{viewingMail.senderName.charAt(0)}</AvatarFallback></Avatar><div><p className="font-semibold">{viewingMail.senderName}</p><p>To: {viewingMail.toRecipients.map(r => r.name).join(', ')}</p>{viewingMail.ccRecipients.length > 0 && <p className="text-xs text-muted-foreground">CC: {viewingMail.ccRecipients.map(r => r.name).join(', ')}</p>}</div></div>
                  </div>
                   <p className="text-xs text-muted-foreground pt-2">{viewingMail.timestamp ? format(new Date(viewingMail.timestamp), "MMM d, yyyy 'at' h:mm a") : ''}</p>
                </CardHeader>
                <ScrollArea className="flex-1 p-6">
                    {viewingMail.forwardedFrom && (<div className="text-xs text-muted-foreground border-l-2 pl-2 mb-4"><p>---------- Forwarded message ---------</p><p>From: {viewingMail.forwardedFrom.senderName}</p><p>Date: {viewingMail.forwardedFrom.date}</p></div>)}
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: viewingMail.body.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }} />
                    {viewingMail.attachments && viewingMail.attachments.length > 0 && (<div className="mt-6"><h4 className="font-semibold mb-2">Attachments</h4><AttachmentPreviewer attachments={viewingMail.attachments} /></div>)}
                </ScrollArea>
                <CardFooter className="border-t pt-4"><Button onClick={() => handleOpenCompose({ replyTo: viewingMail })}><Reply className="mr-2 h-4 w-4" /> Reply</Button></CardFooter>
              </div>
            ) : (<div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground"><Inbox className="h-16 w-16 mb-4" /><h3 className="text-lg font-semibold">Select an item to read</h3><p className="max-w-xs">Nothing is selected.</p></div>)}
        </div>
        <ComposeMailDialog isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} replyingTo={replyingTo} forwardingMail={forwardingMail} users={otherUsers} />
      </Card>
    );
}

const ComposeMailDialog = ({ isOpen, onClose, replyingTo, forwardingMail, users }: { isOpen: boolean, onClose: () => void, replyingTo: InternalMail | null, forwardingMail: InternalMail | null, users: User[] }) => {
    const { loggedInUser } = useSettings();
    const [toRecipients, setToRecipients] = useState<User[]>([]);
    const [ccRecipients, setCcRecipients] = useState<User[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [mailAttachments, setMailAttachments] = useState<Attachment[]>([]);
    const [isSendingMail, setIsSendingMail] = useState(false);
    const [isMailFilePickerOpen, setIsMailFilePickerOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (forwardingMail) {
            setToRecipients([]); setCcRecipients([]);
            setSubject(forwardingMail.subject.startsWith("Fwd: ") ? forwardingMail.subject : `Fwd: ${forwardingMail.subject}`);
            setBody(`\n\n--- Forwarded message ---\nFrom: ${forwardingMail.senderName}\nDate: ${format(new Date(forwardingMail.timestamp), 'PPpp')}\nSubject: ${forwardingMail.subject}\nTo: ${forwardingMail.toRecipients.map(r => r.name).join(', ')}\n\n${forwardingMail.body}`);
            setMailAttachments([]);
        } else if (replyingTo) {
            const to = users.find(u => u.id === replyingTo.senderId);
            const allParticipants = [...replyingTo.toRecipients, ...replyingTo.ccRecipients].filter(p => p.id !== loggedInUser?.id && p.id !== replyingTo.senderId);
            const cc = Array.from(new Set(allParticipants.map(p => p.id))).map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
            setToRecipients(to ? [to] : []); setCcRecipients(cc);
            setSubject(replyingTo.subject.startsWith("Re: ") ? replyingTo.subject : `Re: ${replyingTo.subject}`);
            setBody(`\n\n--- On ${format(new Date(replyingTo.timestamp), 'PPpp')}, ${replyingTo.senderName} wrote: ---\n${replyingTo.body}`);
            setMailAttachments([]);
        } else {
            setToRecipients([]); setCcRecipients([]); setSubject(''); setBody(''); setMailAttachments([]);
        }
    }, [replyingTo, forwardingMail, isOpen, loggedInUser, users]);

    const handleToggleRecipient = (user: User, list: 'to' | 'cc') => {
        const setList = list === 'to' ? setToRecipients : setCcRecipients;
        setList(prev => prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]);
    };
    
    const handleFileChangeForMail = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files).map(file => ({ name: file.name, url: URL.createObjectURL(file), source: 'local', file: file }));
            setMailAttachments(prev => [...prev, ...newFiles as any]);
        }
    };
    
    const handleRemoveMailAttachment = (attachmentToRemove: Attachment) => {
        setMailAttachments(prev => prev.filter(att => att.url !== attachmentToRemove.url));
    };

    const handleSendMail = async () => {
        if (!loggedInUser || toRecipients.length === 0 || !subject.trim() || !body.trim()) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please add recipients, a subject, and a message body." });
            return;
        }
        setIsSendingMail(true);
        try {
            const uploadedAttachments = await Promise.all(
                (mailAttachments.filter(a => (a as any).source === 'local') as (Attachment & {file: File})[]).map(async (attachment) => {
                    const folder = `mail_attachments`;
                    // Upload to sender's own folder
                    await uploadFile(loggedInUser.businessId!, loggedInUser.id, folder, attachment.file, loggedInUser.id);
                    const url = await getPublicUrl(loggedInUser.businessId!, [loggedInUser.businessId, 'user_files', loggedInUser.id, folder, attachment.file.name].join('/'));
                    return { name: attachment.name, url };
                })
            );
            const finalAttachments = [...mailAttachments.filter(a => !(a as any).source), ...uploadedAttachments];

            const mailData: Omit<InternalMail, 'id'> = {
                senderId: loggedInUser.id, senderName: loggedInUser.name,
                toRecipients: toRecipients.map(u => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })),
                ccRecipients: ccRecipients.map(u => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })),
                subject, body, attachments: finalAttachments, timestamp: new Date().toISOString(), readBy: { [loggedInUser.id]: true }, businessId: loggedInUser.businessId,
                threadId: replyingTo?.threadId || forwardingMail?.threadId || Math.random().toString(36).substring(2),
            };
            if (forwardingMail) mailData.forwardedFrom = { senderName: forwardingMail.senderName, date: format(new Date(forwardingMail.timestamp), 'PPpp') };

            await addDoc(collection(db, 'internal_mails'), mailData);
            toast({ title: 'Mail Sent!' });
            onClose();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error sending mail", description: error.message });
        } finally { setIsSendingMail(false); }
    };
    
    const filteredUsers = useMemo(() => {
        if (!recipientSearch) return users;
        return users.filter(u => u.name.toLowerCase().includes(recipientSearch.toLowerCase()));
    }, [users, recipientSearch]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl flex flex-col h-[90vh]">
                <DialogHeader><DialogTitle>{replyingTo ? "Reply" : forwardingMail ? "Forward" : "Compose New Mail"}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <RecipientInput label="To:" recipients={toRecipients} onToggle={(user) => handleToggleRecipient(user, 'to')} allUsers={filteredUsers} search={recipientSearch} onSearchChange={setRecipientSearch} />
                    <RecipientInput label="CC:" recipients={ccRecipients} onToggle={(user) => handleToggleRecipient(user, 'cc')} allUsers={filteredUsers} search={recipientSearch} onSearchChange={setRecipientSearch} />
                    <div className="grid grid-cols-[80px_1fr] items-center gap-4"><Label htmlFor="subject" className="text-right">Subject:</Label><Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                </div>
                <Textarea placeholder="Write your message here..." className="flex-1" value={body} onChange={(e) => setBody(e.target.value)} />
                {mailAttachments.length > 0 && (<div className="space-y-2 pt-4"><p className="text-sm font-medium">Attachments:</p><AttachmentPreviewer attachments={mailAttachments} onRemove={handleRemoveMailAttachment} /></div>)}
                <DialogFooter>
                    <Popover><PopoverTrigger asChild><Button variant="ghost"><Paperclip className="mr-2 h-4 w-4" /> Attach File</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><div className="flex flex-col"><Label htmlFor="mail-attachments" className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer rounded-t-md"><Upload className="h-4 w-4" /> Upload</Label><Input id="mail-attachments" type="file" multiple className="hidden" onChange={handleFileChangeForMail} /><button type="button" onClick={() => setIsMailFilePickerOpen(true)} className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer rounded-b-md text-sm"><Folder className="h-4 w-4" /> File Manager</button></div></PopoverContent></Popover>
                    <div className="flex-1" />
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSendMail} disabled={isSendingMail}>{isSendingMail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Mail</Button>
                </DialogFooter>
                 <FileManagerPickerDialog open={isMailFilePickerOpen} onOpenChange={setIsMailFilePickerOpen} onSelect={(files) => setMailAttachments(prev => [...prev, ...files])} multiple />
            </DialogContent>
        </Dialog>
    );
};

const RecipientInput = ({ label, recipients, onToggle, allUsers, search, onSearchChange }: { label: string, recipients: User[], onToggle: (user: User) => void, allUsers: User[], search: string, onSearchChange: (val: string) => void }) => (
    <div className="grid grid-cols-[80px_1fr] items-start gap-4">
        <Label className="text-right pt-2">{label}</Label>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal min-h-10 h-auto" type="button">
                  {recipients.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {recipients.map(u => <Badge key={u.id} variant="secondary">{u.name}</Badge>)}
                    </div>
                  ) : 'Select recipients...'}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-2 border-b"><Input placeholder="Search users..." value={search} onChange={(e) => onSearchChange(e.target.value)} /></div>
                <ScrollArea className="h-64">{allUsers.map(user => (<div key={user.id} className="flex items-center p-2 cursor-pointer hover:bg-accent" onClick={() => onToggle(user)}><Checkbox className="mr-2" checked={recipients.some(r => r.id === user.id)} /><span>{user.name}</span></div>))}</ScrollArea>
            </PopoverContent>
        </Popover>
    </div>
);

    