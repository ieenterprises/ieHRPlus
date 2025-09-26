
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Paperclip, MoreVertical, X, CheckSquare, Trash2, Loader2, Users, MessageCircleReply, Forward, Smile, Folder, Upload, MessageSquare } from 'lucide-react';
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AttachmentPreviewer } from '@/components/attachment-previewer';
import { FileManagerPickerDialog } from '@/components/file-manager-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, writeBatch, getDocs, Unsubscribe, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User, ChatMessage, Group, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { getPublicUrl, uploadFile } from '@/lib/firebase-storage';

type ChatMode = 'individual' | 'group';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍', '👎', '❤️'
];


export function ChatClient() {
    const { loggedInUser, users, groups } = useSettings();
    const { toast } = useToast();

    const [userSearch, setUserSearch] = useState('');
    const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
    const [unreadGroups, setUnreadGroups] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const [chatSearch, setChatSearch] = useState('');
    const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
    const [forwardRecipients, setForwardRecipients] = useState<string[]>([]);
    const [forwardUserSearch, setForwardUserSearch] = useState('');
    const [isGroupChatDialogOpen, setIsGroupChatDialogOpen] = useState(false);
    const [groupRecipients, setGroupRecipients] = useState<User[]>([]);
    const [groupUserSearch, setGroupUserSearch] = useState('');
    const [groupName, setGroupName] = useState('');
    const [activeChatMode, setActiveChatMode] = useState<ChatMode>('individual');
    const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);

    const filteredUsers = useMemo(() => {
      if (!userSearch) return users.filter(u => u.id !== loggedInUser?.id);
      return users.filter(u => u.id !== loggedInUser?.id && u.name.toLowerCase().includes(userSearch.toLowerCase()));
    }, [users, userSearch, loggedInUser]);

    const myGroups = useMemo(() => groups.filter(g => g.members.some(m => m.id === loggedInUser?.id)), [groups, loggedInUser]);

    useEffect(() => {
        if (!loggedInUser) return;
        
        const qIndividual = query(
            collection(db, 'chatMessages'),
            where('businessId', '==', loggedInUser.businessId),
            where('receiverId', '==', loggedInUser.id),
            where('isRead', '==', false)
        );
        const unsubIndividual = onSnapshot(qIndividual, (snapshot) => {
            const newUnread = new Set<string>();
            snapshot.forEach(doc => {
                newUnread.add(doc.data().senderId);
            });
            setUnreadSenders(newUnread);
        });

        const groupUnsubs: Unsubscribe[] = [];
        myGroups.forEach(group => {
            const qGroup = query(
                collection(db, 'chatMessages'),
                where('businessId', '==', loggedInUser!.businessId),
                where('groupId', '==', group.id)
            );
            const unsub = onSnapshot(qGroup, (snapshot) => {
                let isUnread = false;
                snapshot.forEach(doc => {
                    const message = doc.data() as ChatMessage;
                    if (message.senderId !== loggedInUser.id && !(message as any).readBy?.[loggedInUser.id!]) {
                        isUnread = true;
                    }
                });
                setUnreadGroups(prev => {
                    const newSet = new Set(prev);
                    if (isUnread) newSet.add(group.id); else newSet.delete(group.id);
                    return newSet;
                });
            });
            groupUnsubs.push(unsub);
        });

        return () => {
            unsubIndividual();
            groupUnsubs.forEach(unsub => unsub());
        };
    }, [loggedInUser, myGroups]);

    useEffect(() => {
        const isReady = loggedInUser && (activeChatMode === 'individual' ? selectedChatUser : selectedGroup);
        if (!isReady) { setMessages([]); return; }

        let q: any;
        if (activeChatMode === 'individual' && selectedChatUser) {
            q = query(collection(db, 'chatMessages'), where('businessId', '==', loggedInUser!.businessId), where('senderId', 'in', [loggedInUser!.id, selectedChatUser.id]), where('receiverId', 'in', [loggedInUser!.id, selectedChatUser.id]));
        } else if (activeChatMode === 'group' && selectedGroup) {
            q = query(collection(db, 'chatMessages'), where('businessId', '==', loggedInUser!.businessId), where('groupId', '==', selectedGroup.id));
        }
        if (!q) return;

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            if (activeChatMode === 'individual' && selectedChatUser) {
                const individualMessages = newMessages.filter(m => !m.groupId && m.senderId !== m.receiverId);
                individualMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setMessages(individualMessages);
                const batch = writeBatch(db);
                let hasUnread = false;
                snapshot.docs.forEach(doc => {
                    if (doc.data().receiverId === loggedInUser!.id && !doc.data().isRead) {
                        batch.update(doc.ref, { isRead: true }); hasUnread = true;
                    }
                });
                if (hasUnread) await batch.commit();
            } else if (activeChatMode === 'group' && selectedGroup) {
                newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setMessages(newMessages);
                const batch = writeBatch(db);
                let hasUnread = false;
                snapshot.docs.forEach(doc => {
                    const msg = doc.data() as ChatMessage;
                    if (msg.senderId !== loggedInUser!.id && !(msg as any).readBy?.[loggedInUser!.id]) {
                        batch.update(doc.ref, { [`readBy.${loggedInUser!.id}`]: true }); hasUnread = true;
                    }
                });
                if (hasUnread) await batch.commit();
            }
        });
        return () => unsubscribe();
    }, [loggedInUser, selectedChatUser, activeChatMode, selectedGroup]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatSearch]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !loggedInUser) return;

        const targetId = activeChatMode === 'individual' ? selectedChatUser?.id : selectedGroup?.id;
        if (!targetId) return;

        setIsSending(true);
        try {
            const uploadedAttachments = await Promise.all(
                (attachments.filter(a => (a as any).source === 'local') as (Attachment & {file: File})[]).map(async (attachment) => {
                    const folder = `chat_attachments`;
                    // The creatorId is always the logged in user.
                    await uploadFile(loggedInUser!.businessId!, loggedInUser.id, folder, attachment.file, loggedInUser.id);
                    const fullPath = [loggedInUser.businessId, 'user_files', loggedInUser.id, folder, attachment.file.name].join('/');
                    const url = await getPublicUrl(loggedInUser!.businessId!, fullPath);
                    return { name: attachment.name, url };
                })
            );
            const finalAttachments = [...attachments.filter(a => !(a as any).source), ...uploadedAttachments];

            const messageData: Omit<ChatMessage, 'id'> & { readBy?: {[key: string]: boolean} } = {
                senderId: loggedInUser.id, content: newMessage, timestamp: new Date().toISOString(), isRead: false, businessId: loggedInUser.businessId, attachments: finalAttachments,
            };
            if (activeChatMode === 'group') {
                messageData.groupId = targetId;
                messageData.readBy = { [loggedInUser.id]: true };
                delete messageData.isRead; delete messageData.receiverId;
            } else { messageData.receiverId = targetId; }

            if (replyingToMessage) {
                messageData.replyTo = { messageId: replyingToMessage.id, senderName: users.find(u => u.id === replyingToMessage.senderId)?.name || 'Unknown', content: replyingToMessage.content };
            }
            
            await addDoc(collection(db, 'chatMessages'), messageData);
            setNewMessage(''); setReplyingToMessage(null); setAttachments([]);
        } catch (error) { toast({ variant: 'destructive', title: 'Error sending message' }); } finally { setIsSending(false); }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && loggedInUser) {
          const newFiles = Array.from(event.target.files).map(file => ({ name: file.name, url: URL.createObjectURL(file), source: 'local', file: file }));
          setAttachments(prev => [...prev, ...newFiles as any]);
      }
    };
    
    const handleRemoveAttachment = (attachmentToRemove: Attachment) => {
        setAttachments(prev => prev.filter(att => att.url !== attachmentToRemove.url));
    };

    const handleEmojiSelect = (emoji: string) => {
      if (chatInputRef.current) {
          const { selectionStart, value } = chatInputRef.current;
          const newText = value.substring(0, selectionStart!) + emoji + value.substring(selectionStart!);
          setNewMessage(newText);
          setTimeout(() => { chatInputRef.current?.focus(); chatInputRef.current!.selectionStart = chatInputRef.current!.selectionEnd = selectionStart! + emoji.length; }, 0);
      }
    };

    const filteredMessages = useMemo(() => {
        if (!chatSearch) return messages;
        return messages.filter(msg => msg.content.toLowerCase().includes(chatSearch.toLowerCase()));
    }, [messages, chatSearch]);

    const handleDeleteSelectedMessages = async () => {
        if (selectedMessages.length === 0) return;
        const batch = writeBatch(db);
        selectedMessages.forEach(msgId => batch.delete(doc(db, 'chatMessages', msgId)));
        try {
            await batch.commit();
            toast({ title: `${selectedMessages.length} message(s) deleted.` });
            setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
            setIsSelectionMode(false); setSelectedMessages([]);
        } catch (error) { toast({ variant: 'destructive', title: 'Error deleting messages' }); }
    };

    const handleForwardMessage = async () => {
        if (!forwardingMessage || forwardRecipients.length === 0 || !loggedInUser) return;
        const batch = writeBatch(db);
        const originalSender = users.find(u => u.id === forwardingMessage.senderId);
        forwardRecipients.forEach(recipientId => {
            constnewMessageRef = doc(collection(db, 'chatMessages'));
            const messageData: Omit<ChatMessage, 'id'> = { senderId: loggedInUser.id, receiverId: recipientId, content: `Fwd from ${originalSender?.name || 'Unknown'}: ${forwardingMessage.content}`, timestamp: new Date().toISOString(), isRead: false, businessId: loggedInUser.businessId, attachments: forwardingMessage.attachments };
            batch.set(newMessageRef, messageData);
        });
        try {
            await batch.commit();
            toast({ title: `Message forwarded to ${forwardRecipients.length} user(s).` });
            setForwardingMessage(null); setForwardRecipients([]); setForwardUserSearch('');
        } catch (error) { toast({ variant: 'destructive', title: 'Error forwarding message' }); }
    };

    const handleCreateGroupChat = async () => {
        if (!loggedInUser || groupRecipients.length < 1 || !groupName.trim()) return;
        const allMembers = [loggedInUser, ...groupRecipients];
        const newGroup: Omit<Group, 'id'> = { name: groupName.trim(), members: allMembers.map(u => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })), creatorId: loggedInUser.id, businessId: loggedInUser.businessId, createdAt: new Date().toISOString() };
        try {
            const docRef = await addDoc(collection(db, 'groups'), newGroup);
            handleSelectGroupChat({ ...newGroup, id: docRef.id });
            setIsGroupChatDialogOpen(false); setGroupRecipients([]); setGroupUserSearch(''); setGroupName('');
            toast({ title: "Group Created!", description: `You can now chat in "${newGroup.name}".`});
        } catch (error) { toast({ variant: 'destructive', title: "Error Creating Group" }); }
    };

    const handleDeleteGroup = async () => {
        if (!selectedGroup) return;
        setIsDeletingGroup(true);
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'groups', selectedGroup.id));
            const messagesQuery = query(collection(db, 'chatMessages'), where('groupId', '==', selectedGroup.id));
            const messagesSnapshot = await getDocs(messagesQuery);
            messagesSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            toast({ title: 'Group Deleted' });
            setSelectedGroup(null); setMessages([]);
        } catch (error) { toast({ variant: 'destructive', title: 'Error Deleting Group' }); } finally { setIsDeletingGroup(false); }
    };

    const handleSelectIndividualChat = (user: User) => { setActiveChatMode('individual'); setSelectedChatUser(user); setSelectedGroup(null); setIsSelectionMode(false); setSelectedMessages([]); };
    const handleSelectGroupChat = (group: Group) => { setActiveChatMode('group'); setSelectedGroup(group); setSelectedChatUser(null); setIsSelectionMode(false); setSelectedMessages([]); };

    const ChatHeaderContent = () => {
        if (activeChatMode === 'group' && selectedGroup) {
            return (
                <CardTitle className="flex items-center gap-3">
                    <div className="flex -space-x-4">
                        {selectedGroup.members.slice(0, 3).map(user => (
                            <Avatar key={user.id} className="h-9 w-9 border-2 border-background"><AvatarImage src={user.avatar_url || ''} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                        ))}
                    </div>
                    <div className="truncate"><p className="truncate">{selectedGroup.name}</p><p className="text-sm font-normal text-muted-foreground">Group Chat ({selectedGroup.members.length})</p></div>
                </CardTitle>
            );
        }
        if (activeChatMode === 'individual' && selectedChatUser) {
            return (
                <CardTitle className="flex items-center gap-3">
                    <Avatar><AvatarImage src={selectedChatUser.avatar_url || ''} alt={selectedChatUser.name} /><AvatarFallback>{selectedChatUser.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>{selectedChatUser.name}<p className="text-sm font-normal text-muted-foreground">{selectedChatUser.role}</p></div>
                </CardTitle>
            );
        }
        return null;
    };
    
    return (
        <Card className="h-[70vh] flex">
           <div className="w-1/3 border-r flex flex-col">
              <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle>Conversations</CardTitle><Button variant="ghost" size="icon" onClick={() => setIsGroupChatDialogOpen(true)}><Users className="h-5 w-5" /></Button></div>
                  <div className="relative mt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search users or groups..." className="pl-9" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
              </CardHeader>
              <ScrollArea className="flex-1">
                  {myGroups.filter(g => g.name.toLowerCase().includes(userSearch.toLowerCase())).map(group => (<button key={group.id} className={`w-full text-left p-3 hover:bg-accent ${selectedGroup?.id === group.id && activeChatMode === 'group' ? 'bg-accent' : ''}`} onClick={() => handleSelectGroupChat(group)}><div className="flex items-center gap-3"><Avatar><AvatarFallback><Users className="h-5 w-5"/></AvatarFallback></Avatar><div className="flex-1 truncate"><p className="font-semibold truncate">{group.name}</p><p className="text-xs text-muted-foreground">{group.members.length} members</p></div>{unreadGroups.has(group.id) && (<div className="h-2.5 w-2.5 rounded-full bg-primary" />)}</div></button>))}
                  {filteredUsers.map(user => (<button key={user.id} className={`w-full text-left p-3 hover:bg-accent ${selectedChatUser?.id === user.id && activeChatMode === 'individual' ? 'bg-accent' : ''}`} onClick={() => handleSelectIndividualChat(user)}><div className="flex items-center gap-3"><Avatar><AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar><div className="flex-1"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.role}</p></div>{unreadSenders.has(user.id) && (<div className="h-2.5 w-2.5 rounded-full bg-primary" />)}</div></button>))}
              </ScrollArea>
           </div>
           <div className="w-2/3 flex flex-col">
                {selectedChatUser || selectedGroup ? (
                    <>
                        <CardHeader className="border-b flex-row items-center justify-between">
                            <ChatHeaderContent />
                            <div className="flex items-center gap-2">
                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search chat..." className="pl-9 h-9 w-48" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} /></div>
                                {isSelectionMode ? (<>
                                    <Button variant="ghost" onClick={() => {setIsSelectionMode(false); setSelectedMessages([]);}}>Cancel</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" disabled={selectedMessages.length === 0}><Trash2 className="mr-2 h-4 w-4" />Delete ({selectedMessages.length})</Button></AlertDialogTrigger>
                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {selectedMessages.length} message(s).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedMessages} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                    </AlertDialog>
                                </>) : (<>
                                    <Button variant="outline" size="icon" onClick={() => setIsSelectionMode(true)}><CheckSquare className="h-5 w-5" /></Button>
                                    {activeChatMode === 'group' && selectedGroup?.members.some(m => m.id === loggedInUser?.id) && (<AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={isDeletingGroup}>{isDeletingGroup ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}</Button></AlertDialogTrigger>
                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Group?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the group and all its messages.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                    </AlertDialog>)}
                                </>)}
                            </div>
                        </CardHeader>
                         <ScrollArea className="flex-1 p-4"><div className="space-y-4">
                            {filteredMessages.map(msg => (
                                <div key={msg.id} className={`group relative flex items-start w-full gap-3 ${msg.senderId === loggedInUser?.id ? 'justify-end' : 'justify-start'}`}>
                                    {isSelectionMode && (<Checkbox checked={selectedMessages.includes(msg.id)} onCheckedChange={() => setSelectedMessages(p => p.includes(msg.id) ? p.filter(id => id !== msg.id) : [...p, msg.id])} className="mt-1" />)}
                                    {msg.senderId !== loggedInUser?.id && (<Avatar className="h-8 w-8"><AvatarImage src={users.find(u => u.id === msg.senderId)?.avatar_url || ''} /><AvatarFallback>{users.find(u => u.id === msg.senderId)?.name?.charAt(0)}</AvatarFallback></Avatar>)}
                                    <div className={`flex flex-col max-w-sm ${msg.senderId === loggedInUser?.id ? 'items-end' : 'items-start'}`}>
                                        {activeChatMode === 'group' && msg.senderId !== loggedInUser?.id && (<p className="text-xs text-muted-foreground mb-1 ml-1">{users.find(u => u.id === msg.senderId)?.name}</p>)}
                                        {msg.replyTo && (<div className="mb-1 rounded-md bg-black/5 dark:bg-white/5 px-2 py-1 text-xs text-muted-foreground w-full"><p className="font-semibold">{msg.replyTo.senderName}</p><p className="truncate">{msg.replyTo.content}</p></div>)}
                                        {msg.content && (<div className={`rounded-lg px-3 py-2 break-words ${msg.senderId === loggedInUser?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} dangerouslySetInnerHTML={{ __html: msg.content.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }} />)}
                                        {msg.attachments && msg.attachments.length > 0 && (<div className="mt-2 w-full"><AttachmentPreviewer attachments={msg.attachments} /></div>)}
                                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNowStrict(new Date(msg.timestamp), { addSuffix: true })}</p>
                                    </div>
                                    {msg.senderId === loggedInUser?.id && (<Avatar className="h-8 w-8"><AvatarImage src={loggedInUser?.avatar_url || ''} /><AvatarFallback>{loggedInUser?.name?.charAt(0)}</AvatarFallback></Avatar>)}
                                    {!isSelectionMode && (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className={`absolute top-0 h-6 w-6 opacity-0 group-hover:opacity-100 ${msg.senderId === loggedInUser?.id ? 'left-0' : 'right-0'}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => setReplyingToMessage(msg)}><MessageCircleReply className="mr-2 h-4 w-4"/>Reply</DropdownMenuItem><DropdownMenuItem onClick={() => setForwardingMessage(msg)}><Forward className="mr-2 h-4 w-4"/>Forward</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
                                </div>
                            ))}
                         </div><div ref={messagesEndRef} /></ScrollArea>
                        <CardFooter className="pt-4 border-t flex flex-col items-start gap-2">
                            {replyingToMessage && (<div className="w-full relative rounded-md bg-muted p-2 pr-8 text-sm"><p className="font-semibold text-primary">Replying to {users.find(u => u.id === replyingToMessage.senderId)?.name}</p><p className="text-muted-foreground truncate">{replyingToMessage.content}</p><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setReplyingToMessage(null)}><X className="h-4 w-4" /></Button></div>)}
                            {attachments.length > 0 && (<div className="w-full space-y-2"><p className="text-sm font-medium">Attachments:</p><AttachmentPreviewer attachments={attachments} onRemove={handleRemoveAttachment} /></div>)}
                            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                                <div className="relative flex-1"><Input ref={chatInputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={isSending} className="pr-10" /><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"><Smile className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent className="w-auto p-2"><div className="grid grid-cols-8 gap-1">{EMOJIS.map(emoji => (<Button key={emoji} variant="ghost" size="icon" className="text-xl" onClick={() => handleEmojiSelect(emoji)}>{emoji}</Button>))}</div></PopoverContent></Popover></div>
                                <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><div className="flex flex-col"><Label htmlFor="chat-attachments" className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer rounded-t-md"><Upload className="h-4 w-4" /> Upload from Computer</Label><Input id="chat-attachments" type="file" multiple className="hidden" onChange={handleFileChange} /><button type="button" onClick={() => setIsFilePickerOpen(true)} className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer rounded-b-md text-sm"><Folder className="h-4 w-4" /> Choose from File Manager</button></div></PopoverContent></Popover>
                                <Button type="submit" size="icon" disabled={isSending}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                            </form>
                        </CardFooter>
                    </>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground"><MessageSquare className="h-16 w-16 mb-4" /><h3 className="text-lg font-semibold">Select a conversation</h3><p className="max-w-xs">Choose a user or a group to start chatting.</p></div>)}
           </div>

            <Dialog open={!!forwardingMessage} onOpenChange={(open) => !open && setForwardingMessage(null)}>
                <DialogContent className="flex flex-col h-[80vh]"><DialogHeader><DialogTitle>Forward Message</DialogTitle><DialogDescription>Select who to forward this message to.</DialogDescription></DialogHeader>
                    <div className="p-4 border rounded-md bg-muted text-sm"><p className="break-words">{forwardingMessage?.content}</p></div>
                    <div className="relative mt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search users..." className="pl-9" value={forwardUserSearch} onChange={(e) => setForwardUserSearch(e.target.value)} /></div>
                    <ScrollArea className="flex-1 mt-4 border rounded-md"><div className="p-2">{users.filter(u => u.id !== loggedInUser?.id && u.name.toLowerCase().includes(forwardUserSearch.toLowerCase())).map(user => (<div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Checkbox id={`fwd-user-${user.id}`} checked={forwardRecipients.includes(user.id)} onCheckedChange={() => setForwardRecipients(p => p.includes(user.id) ? p.filter(id => id !== user.id) : [...p, user.id])} /><label htmlFor={`fwd-user-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer"><Avatar><AvatarImage src={user.avatar_url || ''} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar><div className="flex-1"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.role}</p></div></label></div>))}</div></ScrollArea>
                    <DialogFooter><Button variant="ghost" onClick={() => setForwardingMessage(null)}>Cancel</Button><Button onClick={handleForwardMessage} disabled={forwardRecipients.length === 0}><Send className="mr-2 h-4 w-4" />Forward ({forwardRecipients.length})</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isGroupChatDialogOpen} onOpenChange={setIsGroupChatDialogOpen}>
              <DialogContent className="flex flex-col h-[80vh]"><DialogHeader><DialogTitle>New Group Chat</DialogTitle><DialogDescription>Select users to start a group chat.</DialogDescription></DialogHeader>
                <div className="space-y-2"><Label htmlFor="group-name">Group Name</Label><Input id="group-name" placeholder="e.g., Project Team" value={groupName} onChange={(e) => setGroupName(e.target.value)} required /></div>
                <div className="relative mt-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search users..." className="pl-9" value={groupUserSearch} onChange={(e) => setGroupUserSearch(e.target.value)} /></div>
                <ScrollArea className="flex-1 mt-4 border rounded-md"><div className="p-2">{users.filter(u => u.id !== loggedInUser?.id && u.name.toLowerCase().includes(groupUserSearch.toLowerCase())).map(user => (<div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Checkbox id={`grp-user-${user.id}`} checked={groupRecipients.some(u => u.id === user.id)} onCheckedChange={() => setGroupRecipients(p => p.some(u => u.id === user.id) ? p.filter(u => u.id !== user.id) : [...p, user])} /><label htmlFor={`grp-user-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer"><Avatar><AvatarImage src={user.avatar_url || ''} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar><div className="flex-1"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.role}</p></div></label></div>))}</div></ScrollArea>
                <DialogFooter><Button variant="ghost" onClick={() => setIsGroupChatDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateGroupChat} disabled={groupRecipients.length < 1 || !groupName.trim()}><MessageSquare className="mr-2 h-4 w-4" />Start Chat ({groupRecipients.length})</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            <FileManagerPickerDialog open={isFilePickerOpen} onOpenChange={setIsFilePickerOpen} onSelect={(files) => setAttachments(prev => [...prev, ...files])} multiple />
        </Card>
    );
}
