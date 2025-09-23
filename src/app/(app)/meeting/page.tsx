

"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, MessageSquare, Mail, Send, Search, Users, X, Trash2, Forward, MoreVertical, UserPlus, MessageCircleReply, CheckSquare, Paperclip, Loader2, Smile, Inbox, Reply } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFile, getPublicUrl } from '@/lib/firebase-storage';
import type { User, ChatMessage, InternalMail } from '@/lib/types';
import { format, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VIDEOSDK_TOKEN } from '@/lib/videosdk-config';
import Link from 'next/link';
import { AttachmentPreviewer } from '@/components/attachment-previewer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type ChatMode = 'individual' | 'group';
type MailboxView = "inbox" | "sent";

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
  '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
  '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
  '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
  '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
  '😧', '😮', '😲', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢',
  '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍', '👎', '❤️'
];


// Reference to the global VideoSDK object from the script
declare global {
  interface Window {
    VideoSDK: any;
  }
}

export default function MeetingPage() {
  const { toast } = useToast();
  const { loggedInUser, users } = useSettings();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('video');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [inChatMeeting, setInChatMeeting] = useState(false);
  const [chatMeetingId, setChatMeetingId] = useState<string | null>(null);


  // Chat state
  const [userSearch, setUserSearch] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [forwardRecipients, setForwardRecipients] = useState<string[]>([]);
  const [forwardUserSearch, setForwardUserSearch] = useState('');
  const [isGroupChatDialogOpen, setIsGroupChatDialogOpen] = useState(false);
  const [groupRecipients, setGroupRecipients] = useState<User[]>([]);
  const [groupUserSearch, setGroupUserSearch] = useState('');
  const [activeChatMode, setActiveChatMode] = useState<ChatMode>('individual');
  const [activeGroup, setActiveGroup] = useState<User[]>([]);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // Invite state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRecipients, setInviteRecipients] = useState<string[]>([]);
  const [inviteUserSearch, setInviteUserSearch] = useState('');

  // Mailing state
  const [mails, setMails] = useState<InternalMail[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [viewingMail, setViewingMail] = useState<InternalMail | null>(null);
  const [replyingToMail, setReplyingToMail] = useState<InternalMail | null>(null);
  const [forwardingMail, setForwardingMail] = useState<InternalMail | null>(null);
  const [activeMailbox, setActiveMailbox] = useState<MailboxView>("inbox");
  const [mailSearch, setMailSearch] = useState("");


  // VideoSDK states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isWebCamOn, setIsWebCamOn] = useState(true);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'chat' || hash === 'video' || hash === 'mail') {
        setActiveTab(hash);
    }
    
    const joinMeetingId = searchParams.get('join');
    if (joinMeetingId) {
        if (searchParams.get('in-chat')) {
            setActiveTab('chat');
            joinMeeting(joinMeetingId, true);
        } else {
            setActiveTab('video');
            joinMeeting(joinMeetingId, false);
        }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loggedInUser?.businessId || activeTab !== 'mail') return;
    
    const q = query(
      collection(db, 'internal_mails'),
      where('businessId', '==', loggedInUser.businessId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalMail));
      
      const myMails = allMails.filter(mail => 
          mail.senderId === loggedInUser.id || 
          (mail.toRecipients || []).some(r => r.id === loggedInUser.id) ||
          (mail.ccRecipients || []).some(r => r.id === loggedInUser.id)
      );

      myMails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setMails(myMails);
    });

    return () => unsubscribe();
  }, [loggedInUser?.businessId, activeTab]);

  const createMeeting = async (): Promise<string | null> => {
      if (!process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN) {
        toast({
          variant: "destructive",
          title: "VideoSDK Token Missing",
          description: "Please add your VideoSDK token to a .env file.",
        });
        return null;
      }
      try {
        const url = `https://api.videosdk.live/v2/rooms`;
        const options = {
          method: "POST",
          headers: { Authorization: process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN, "Content-Type": "application/json" },
        };
        const { roomId } = await fetch(url, options).then(res => res.json());
        return roomId;
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Error creating meeting" });
        return null;
      }
  };

  const joinMeeting = (id: string, fromChat: boolean) => {
    if (!process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN) {
        toast({
          variant: "destructive",
          title: "VideoSDK Token Missing",
          description: "Please add your VideoSDK token to a .env file.",
        });
        return;
      }
    if (!id) {
        toast({ variant: "destructive", title: "Meeting ID required" });
        return;
    }

    window.VideoSDK.config(process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN);
    const newMeeting = window.VideoSDK.initMeeting({
        meetingId: id,
        name: loggedInUser?.name || 'Guest',
        micEnabled: true,
        webcamEnabled: true,
    });
    
    setMeeting(newMeeting); // Set meeting object to state
    if (fromChat) {
        setInChatMeeting(true);
        setChatMeetingId(id);
    } else {
        setMeetingId(id);
    }
    
    newMeeting.join();

    newMeeting.on("meeting-joined", () => {
        setParticipants(Array.from(newMeeting.participants.values()));
    });

     newMeeting.on("meeting-left", () => {
        setMeeting(null);
        setMeetingId(null);
        setChatMeetingId(null);
        setInChatMeeting(false);
        setParticipants([]);
    });

    newMeeting.on("participant-joined", (participant: any) => {
        setParticipants(prev => [...prev, participant]);
    });

    newMeeting.on("participant-left", (participant: any) => {
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });
  };
  
  const handleCreateAndJoin = async (fromChat: boolean) => {
      const newMeetingId = await createMeeting();
      if (newMeetingId) {
          joinMeeting(newMeetingId, fromChat);
      }
  };

  const leaveMeeting = () => {
    meeting?.leave();
  };

  const toggleMic = () => {
    if (isMicOn) {
      meeting?.muteMic();
    } else {
      meeting?.unmuteMic();
    }
    setIsMicOn(!isMicOn);
  };

  const toggleWebcam = () => {
    if (isWebCamOn) {
      meeting?.disableWebcam();
    } else {
      meeting?.enableWebcam();
    }
    setIsWebCamOn(!isWebCamOn);
  };

  const sendMeetingInvite = async (recipientId: string, id: string, fromChat: boolean) => {
      if (!loggedInUser || !recipientId || !id) return;

      const inviteLink = `/meeting?join=${id}${fromChat ? '&in-chat=true' : ''}`;
      const inviteMessage = `${loggedInUser.name} is inviting you to a video call. <a href="${inviteLink}" class="text-blue-500 underline">Join Now</a>`;

      const messageData: Omit<ChatMessage, 'id'> = {
          senderId: loggedInUser.id,
          receiverId: recipientId,
          content: inviteMessage,
          timestamp: new Date().toISOString(),
          isRead: false,
          businessId: loggedInUser.businessId,
      };

      try {
          await addDoc(collection(db, 'chatMessages'), messageData);
          toast({ title: 'Invitation sent!' });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error sending invitation' });
      }
  };

  const handleStartVideoCall = async () => {
      if (!selectedChatUser) return;
      
      const newMeetingId = await createMeeting();
      if (newMeetingId) {
          joinMeeting(newMeetingId, true);
          await sendMeetingInvite(selectedChatUser.id, newMeetingId, true);
      }
  };


  // ----- Existing Chat Logic -----
  const filteredUsers = useMemo(() => {
      if (!userSearch) return users.filter(u => u.id !== loggedInUser?.id);
      return users.filter(u => u.id !== loggedInUser?.id && u.name.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch, loggedInUser]);

  useEffect(() => {
    if (!loggedInUser) return;
    const q = query(
        collection(db, 'chatMessages'),
        where('businessId', '==', loggedInUser.businessId),
        where('receiverId', '==', loggedInUser.id),
        where('isRead', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newUnread = new Set<string>();
        snapshot.forEach(doc => {
            newUnread.add(doc.data().senderId);
        });
        setUnreadSenders(newUnread);
    });
    return () => unsubscribe();
  }, [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser || !selectedChatUser) {
        setMessages([]);
        return;
    };

    let combinedMessages: ChatMessage[] = [];
    const messageMap = new Map<string, ChatMessage>();

    const updateAndSortMessages = () => {
        combinedMessages = Array.from(messageMap.values());
        combinedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(combinedMessages);
    }

    const markMessagesAsRead = (snapshot: any) => {
        const batch: any[] = [];
        snapshot.docs.forEach((document: any) => {
            if (document.data().receiverId === loggedInUser.id && !document.data().isRead) {
                batch.push(updateDoc(document.ref, { isRead: true }));
            }
        });
        if (batch.length > 0) {
            Promise.all(batch).catch(err => console.error("Error marking messages as read:", err));
        }
    }
    
    const q1 = query(
        collection(db, 'chatMessages'),
        where('businessId', '==', loggedInUser.businessId),
        where('senderId', '==', loggedInUser.id),
        where('receiverId', '==', selectedChatUser.id)
    );

    const q2 = query(
        collection(db, 'chatMessages'),
        where('businessId', '==', loggedInUser.businessId),
        where('senderId', '==', selectedChatUser.id),
        where('receiverId', '==', loggedInUser.id)
    );

    const unsub1 = onSnapshot(q1, (snapshot) => {
        snapshot.docs.forEach(doc => messageMap.set(doc.id, { id: doc.id, ...doc.data() } as ChatMessage));
        updateAndSortMessages();
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
        snapshot.docs.forEach(doc => messageMap.set(doc.id, { id: doc.id, ...doc.data() } as ChatMessage));
        markMessagesAsRead(snapshot);
        updateAndSortMessages();
    });

    return () => {
        unsub1();
        unsub2();
    };

  }, [loggedInUser, selectedChatUser]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatSearch]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if ((!newMessage.trim() && attachments.length === 0) || !loggedInUser || !selectedChatUser) return;
      
      setIsSending(true);

      try {
          let attachmentUrls: { name: string, url: string }[] = [];
          if (attachments.length > 0) {
              const uploadPromises = attachments.map(async (file) => {
                  const folder = `chat_attachments/${loggedInUser!.id}`;
                  await uploadFile(loggedInUser!.businessId!, folder, file, () => {});
                  const url = await getPublicUrl(loggedInUser!.businessId!, `${folder}/${file.name}`);
                  return { name: file.name, url };
              });
              attachmentUrls = await Promise.all(uploadPromises);
          }

          const messageData: Omit<ChatMessage, 'id'> = {
              senderId: loggedInUser.id,
              receiverId: selectedChatUser.id,
              content: newMessage,
              timestamp: new Date().toISOString(),
              isRead: false,
              businessId: loggedInUser.businessId,
              attachments: attachmentUrls,
          };

          if (replyingToMessage) {
            messageData.replyTo = {
                messageId: replyingToMessage.id,
                senderName: users.find(u => u.id === replyingToMessage.senderId)?.name || 'Unknown',
                content: replyingToMessage.content,
            };
          }
          
          await addDoc(collection(db, 'chatMessages'), messageData);
          setNewMessage('');
          setReplyingToMessage(null);
          setAttachments([]);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error sending message' });
      } finally {
          setIsSending(false);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
          setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
      }
  };

  const handleRemoveAttachment = (fileName: string) => {
      setAttachments(prev => prev.filter(file => file.name !== fileName));
  };
  
  const handleEmojiSelect = (emoji: string) => {
    if (chatInputRef.current) {
        const { selectionStart, selectionEnd, value } = chatInputRef.current;
        const newText = value.substring(0, selectionStart!) + emoji + value.substring(selectionEnd!);
        setNewMessage(newText);
        // Focus and move cursor to after the inserted emoji
        setTimeout(() => {
            chatInputRef.current?.focus();
            chatInputRef.current!.selectionStart = chatInputRef.current!.selectionEnd = selectionStart! + emoji.length;
        }, 0);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!chatSearch) return messages;
    return messages.filter(msg => msg.content.toLowerCase().includes(chatSearch.toLowerCase()));
  }, [messages, chatSearch]);

  const handleDeleteMessage = async () => {
    if (!deletingMessage) return;
    try {
        await deleteDoc(doc(db, 'chatMessages', deletingMessage.id));
        toast({ title: 'Message deleted' });
        setDeletingMessage(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error deleting message' });
    }
  };
  
    const handleToggleForwardRecipient = (userId: string) => {
        setForwardRecipients(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleForwardMessage = async () => {
        if (!forwardingMessage || forwardRecipients.length === 0 || !loggedInUser) return;
        
        const batch = writeBatch(db);
        const originalSender = users.find(u => u.id === forwardingMessage.senderId);
        
        forwardRecipients.forEach(recipientId => {
            const newMessageRef = doc(collection(db, 'chatMessages'));
            const messageData: Omit<ChatMessage, 'id'> = {
                senderId: loggedInUser.id,
                receiverId: recipientId,
                content: `Fwd from ${originalSender?.name || 'Unknown'}: ${forwardingMessage.content}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                businessId: loggedInUser.businessId,
            };
            batch.set(newMessageRef, messageData);
        });

        try {
            await batch.commit();
            toast({ title: `Message forwarded to ${forwardRecipients.length} user(s).` });
            setForwardingMessage(null);
            setForwardRecipients([]);
            setForwardUserSearch('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error forwarding message' });
        }
    };
    
    const filteredForwardUsers = useMemo(() => {
      const allOtherUsers = users.filter(u => u.id !== loggedInUser?.id);
      if (!forwardUserSearch) return allOtherUsers;
      return allOtherUsers.filter(u => u.name.toLowerCase().includes(forwardUserSearch.toLowerCase()));
    }, [users, forwardUserSearch, loggedInUser]);

  const handleSelectIndividualChat = (user: User) => {
    setActiveChatMode('individual');
    setSelectedChatUser(user);
    setActiveGroup([]);
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleToggleGroupRecipient = (user: User) => {
    setGroupRecipients(prev =>
        prev.some(u => u.id === user.id)
            ? prev.filter(u => u.id !== user.id)
            : [...prev, user]
    );
  };

  const handleStartGroupChat = () => {
    if (groupRecipients.length < 2) {
      toast({ variant: 'destructive', title: "Not enough users", description: "Please select at least two users for a group chat." });
      return;
    }
    setActiveChatMode('group');
    setActiveGroup(groupRecipients);
    setMessages([]); // Clear messages for new group chat
    setSelectedChatUser(null);
    setIsGroupChatDialogOpen(false);
    setGroupRecipients([]);
    setGroupUserSearch('');
  };

  const filteredGroupUsers = useMemo(() => {
    const allOtherUsers = users.filter(u => u.id !== loggedInUser?.id);
    if (!groupUserSearch) return allOtherUsers;
    return allOtherUsers.filter(u => u.name.toLowerCase().includes(groupUserSearch.toLowerCase()));
  }, [users, groupUserSearch, loggedInUser]);

    const handleToggleInviteRecipient = (userId: string) => {
        setInviteRecipients(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSendInvites = async () => {
        const currentMeetingId = inChatMeeting ? chatMeetingId : meetingId;
        if (!currentMeetingId || inviteRecipients.length === 0 || !loggedInUser) return;

        const batch = writeBatch(db);
        const inviteMessage = `${loggedInUser.name} has invited you to a meeting. Meeting ID: ${currentMeetingId}`;

        inviteRecipients.forEach(recipientId => {
            sendMeetingInvite(recipientId, currentMeetingId, inChatMeeting);
        });
        
        toast({ title: `Invitation sent to ${inviteRecipients.length} user(s).` });
        setIsInviteDialogOpen(false);
        setInviteRecipients([]);
        setInviteUserSearch('');
    };

    const filteredInviteUsers = useMemo(() => {
        const allOtherUsers = users.filter(u => u.id !== loggedInUser?.id);
        if (!inviteUserSearch) return allOtherUsers;
        return allOtherUsers.filter(u => u.name.toLowerCase().includes(inviteUserSearch.toLowerCase()));
    }, [users, inviteUserSearch, loggedInUser]);


  const ChatHeaderContent = () => {
    if (activeChatMode === 'group') {
      const participantNames = activeGroup.map(u => u.name).join(', ');
      return (
        <CardTitle className="flex items-center gap-3">
          <div className="flex -space-x-4">
            {activeGroup.slice(0, 3).map(user => (
              <Avatar key={user.id} className="h-9 w-9 border-2 border-background">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="truncate">
             <p className="truncate">{participantNames}</p>
             <p className="text-sm font-normal text-muted-foreground">Group Chat</p>
          </div>
        </CardTitle>
      );
    }

    if (selectedChatUser) {
      return (
        <CardTitle className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={selectedChatUser.avatar_url || ''} alt={selectedChatUser.name} />
            <AvatarFallback>{selectedChatUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            {selectedChatUser.name}
            <p className="text-sm font-normal text-muted-foreground">{selectedChatUser.role}</p>
          </div>
        </CardTitle>
      );
    }
    return null;
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessages([]); // Clear selections when toggling mode
  };

  const handleToggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev =>
        prev.includes(messageId)
            ? prev.filter(id => id !== messageId)
            : [...prev, messageId]
    );
  };
  
  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    const batch = writeBatch(db);
    selectedMessages.forEach(msgId => {
      const msgRef = doc(db, 'chatMessages', msgId);
      batch.delete(msgRef);
    });

    try {
      await batch.commit();
      toast({ title: `${selectedMessages.length} message(s) deleted.` });
      // Manually filter the local state to reflect the deletion immediately
      setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
      setIsSelectionMode(false);
      setSelectedMessages([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error deleting messages' });
    }
  };

  const handleSelectAllMessages = () => {
    const allMessageIds = filteredMessages.map(msg => msg.id);
    setSelectedMessages(allMessageIds);
  };

  const getIsAllSelected = () => {
    if (filteredMessages.length === 0) return false;
    return filteredMessages.every(id => selectedMessages.includes(id.id));
  };
  
    const ParticipantView = ({ participant }: { participant: any }) => {
    const micRef = useRef<HTMLAudioElement>(null);
    const webcamRef = useRef<HTMLVideoElement>(null);
    const [micOn, setMicOn] = useState(false);
    const [webcamOn, setWebcamOn] = useState(false);
    
    useEffect(() => {
        let audioStream: MediaStream | null = null;
        let videoStream: MediaStream | null = null;
        
        const audioMediaStream = new MediaStream();
        const videoMediaStream = new MediaStream();

        if (micRef.current) {
            micRef.current.srcObject = audioMediaStream;
            micRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error("audio play error", e) });
        }
        if (webcamRef.current) {
            webcamRef.current.srcObject = videoMediaStream;
            webcamRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error("video play error", e) });
        }

        const handleStreamEnabled = (stream: any) => {
            if (stream.kind === 'audio') {
                setMicOn(true);
                audioStream = stream;
                audioMediaStream.addTrack(stream.track);
            }
            if (stream.kind === 'video') {
                setWebcamOn(true);
                videoStream = stream;
                videoMediaStream.addTrack(stream.track);
            }
        };

        const handleStreamDisabled = (stream: any) => {
            if (stream.kind === 'audio') {
                setMicOn(false);
                if (audioStream) audioMediaStream.removeTrack(audioStream.track);
                audioStream = null;
            }
            if (stream.kind === 'video') {
                setWebcamOn(false);
                if (videoStream) videoMediaStream.removeTrack(videoStream.track);
                videoStream = null;
            }
        };
        
        Array.from(participant.streams.values()).forEach((s: any) => handleStreamEnabled(s));

        participant.on('stream-enabled', handleStreamEnabled);
        participant.on('stream-disabled', handleStreamDisabled);
        
        return () => {
            participant.off('stream-enabled', handleStreamEnabled);
            participant.off('stream-disabled', handleStreamDisabled);
        };
    }, [participant]);

    return (
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
        <audio ref={micRef} autoPlay playsInline muted={participant.isLocal} />
        <video ref={webcamRef} autoPlay playsInline className="h-full w-full object-cover" />
        {!webcamOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <VideoOff className="h-10 w-10 mx-auto mb-2" />
              <p>Video is off</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
            {micOn ? <Mic className="h-3 w-3"/> : <MicOff className="h-3 w-3"/>}
            {participant.displayName}
        </div>
      </div>
    );
  };
  
  const MeetingUI = ({ meetingId, meetingInstance }: { meetingId: string, meetingInstance: any }) => (
    <div className="h-full flex flex-col">
        <CardHeader>
            <CardTitle>Meeting ID: {meetingId}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
            {meetingInstance.localParticipant && <ParticipantView participant={meetingInstance.localParticipant} />}
            {participants.map((participant: any) => (
                <ParticipantView key={participant.id} participant={participant} />
            ))}
        </CardContent>
        <CardFooter className="flex items-center justify-center gap-4 border-t pt-4">
             <Button
                variant={isMicOn ? 'secondary' : 'destructive'}
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleMic}
                aria-label={isMicOn ? 'Mute' : 'Unmute'}
            >
                {isMicOn ? <Mic /> : <MicOff />}
            </Button>
            <Button
                variant={isWebCamOn ? 'secondary' : 'destructive'}
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={toggleWebcam}
                aria-label={isWebCamOn ? 'Turn off video' : 'Turn on video'}
            >
                {isWebCamOn ? <Video /> : <VideoOff />}
            </Button>
             <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                <ScreenShare />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus />
            </Button>
             <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 ml-8" onClick={leaveMeeting}>
                <PhoneOff />
            </Button>
        </CardFooter>
    </div>
  );

  const handleOpenMail = async (mail: InternalMail) => {
    setViewingMail(mail);
    if (loggedInUser && !mail.readBy[loggedInUser.id]) {
      const mailRef = doc(db, 'internal_mails', mail.id);
      await updateDoc(mailRef, {
        [`readBy.${loggedInUser.id}`]: true,
      });
    }
  };

  const handleOpenCompose = (options?: { replyTo?: InternalMail, forward?: InternalMail }) => {
    setReplyingToMail(options?.replyTo || null);
    setForwardingMail(options?.forward || null);
    setIsComposeOpen(true);
  };
  
    const inboxMails = useMemo(() => mails.filter(m => ((m.toRecipients || []).some(r => r.id === loggedInUser?.id) || (m.ccRecipients || []).some(r => r.id === loggedInUser?.id)) && (mailSearch ? (m.subject.toLowerCase().includes(mailSearch.toLowerCase()) || m.senderName.toLowerCase().includes(mailSearch.toLowerCase())) : true)), [mails, loggedInUser, mailSearch]);
    const sentMails = useMemo(() => mails.filter(m => m.senderId === loggedInUser?.id && (mailSearch ? (m.subject.toLowerCase().includes(mailSearch.toLowerCase()) || [...(m.toRecipients || []), ...(m.ccRecipients || [])].some(r => r.name.toLowerCase().includes(mailSearch.toLowerCase()))) : true)), [mails, loggedInUser, mailSearch]);
    const unreadCount = useMemo(() => inboxMails.filter(m => loggedInUser && !m.readBy[loggedInUser.id]).length, [inboxMails, loggedInUser]);

    const getRecipientString = (mail: InternalMail) => {
        const to = (mail.toRecipients || []).map(r => r.id === loggedInUser?.id ? "Me" : r.name).join(', ');
        const cc = (mail.ccRecipients || []).map(r => r.id === loggedInUser?.id ? "Me" : r.name).join(', ');
        return (
            <>
                <p>To: {to}</p>
                {cc && <p className="text-xs text-muted-foreground">CC: {cc}</p>}
            </>
        )
    };


  return (
    <div className="space-y-8">
      <PageHeader
        title={'Communications Hub'}
        description="Connect with your team through video, chat, and mail."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="video">
            <Video className="mr-2 h-4 w-4" />
            Video Meeting
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="mail">
            <Mail className="mr-2 h-4 w-4" />
            Mailing {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="video">
            <Card className="h-[70vh]">
                {meeting && meetingId ? (
                    <MeetingUI meetingId={meetingId} meetingInstance={meeting} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <CardTitle className="text-2xl">Join or Create a Meeting</CardTitle>
                        <div className="flex gap-4">
                            <Button onClick={() => handleCreateAndJoin(false)}>New Meeting</Button>
                            <span className="flex items-center">OR</span>
                            <div className="flex gap-2">
                                <Input type="text" id="meetingIdTxt" placeholder="Enter Meeting ID" />
                                <Button onClick={() => joinMeeting((document.getElementById('meetingIdTxt') as HTMLInputElement).value, false)}>Join Meeting</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </TabsContent>

        <TabsContent value="chat">
           <Card className="h-[70vh] flex">
              <div className="w-1/3 border-r flex flex-col">
                  <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Conversations</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsGroupChatDialogOpen(true)}>
                          <Users className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="relative mt-2">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input 
                                placeholder="Search users..."
                                className="pl-9"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                           />
                      </div>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                      {filteredUsers.map(user => (
                          <button 
                            key={user.id} 
                            className={`w-full text-left p-3 hover:bg-accent ${selectedChatUser?.id === user.id && activeChatMode === 'individual' ? 'bg-accent' : ''}`}
                            onClick={() => handleSelectIndividualChat(user)}
                          >
                              <div className="flex items-center gap-3">
                                  <Avatar>
                                      <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                      <p className="font-semibold">{user.name}</p>
                                      <p className="text-xs text-muted-foreground">{user.role}</p>
                                  </div>
                                  {unreadSenders.has(user.id) && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                  )}
                              </div>
                          </button>
                      ))}
                  </ScrollArea>
              </div>
              <div className="w-2/3 flex flex-col">
                    {inChatMeeting && meeting && chatMeetingId ? (
                         <MeetingUI meetingId={chatMeetingId} meetingInstance={meeting} />
                    ) : selectedChatUser || activeChatMode === 'group' ? (
                        <>
                            <CardHeader className="border-b flex-row items-center justify-between">
                                <ChatHeaderContent />
                                <div className="flex items-center gap-2">
                                     <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Search chat..."
                                            className="pl-9 h-9 w-48"
                                            value={chatSearch}
                                            onChange={(e) => setChatSearch(e.target.value)}
                                        />
                                    </div>
                                    {isSelectionMode ? (
                                        <>
                                            <Button variant="ghost" onClick={() => setIsSelectionMode(false)}>Cancel</Button>
                                            <Button variant="outline" onClick={handleSelectAllMessages} disabled={filteredMessages.length === 0}>Select All</Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" disabled={selectedMessages.length === 0}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete ({selectedMessages.length})
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete {selectedMessages.length} message(s). This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleDeleteSelectedMessages} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    ) : (
                                        <>
                                          <Button variant="outline" size="icon" onClick={handleToggleSelectionMode}>
                                              <CheckSquare className="h-5 w-5" />
                                          </Button>
                                          {activeChatMode === 'individual' && (
                                            <Button variant="outline" size="icon" onClick={handleStartVideoCall}>
                                                <Video className="h-5 w-5"/>
                                            </Button>
                                          )}
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                             <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {filteredMessages.length > 0 ? filteredMessages.map(msg => (
                                        <div 
                                            key={msg.id} 
                                            className={`group relative flex items-start w-full gap-3 ${msg.senderId === loggedInUser?.id ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {isSelectionMode && (
                                                <Checkbox
                                                    checked={selectedMessages.includes(msg.id)}
                                                    onCheckedChange={() => handleToggleMessageSelection(msg.id)}
                                                    className="mt-1"
                                                />
                                            )}
                                            {msg.senderId !== loggedInUser?.id && (
                                              <Avatar className="h-8 w-8">
                                                  <AvatarImage src={users.find(u => u.id === msg.senderId)?.avatar_url || ''} />
                                                  <AvatarFallback>{users.find(u => u.id === msg.senderId)?.name?.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                            )}
                                            <div className={`flex flex-col max-w-sm ${msg.senderId === loggedInUser?.id ? 'items-end' : 'items-start'}`}>
                                                {msg.replyTo && (
                                                    <div className="mb-1 rounded-md bg-black/5 dark:bg-white/5 px-2 py-1 text-xs text-muted-foreground w-full">
                                                        <p className="font-semibold">{msg.replyTo.senderName}</p>
                                                        <p className="truncate">{msg.replyTo.content}</p>
                                                    </div>
                                                )}
                                                {msg.content && (
                                                    <div 
                                                        className={`rounded-lg px-3 py-2 break-words ${msg.senderId === loggedInUser?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                                        dangerouslySetInnerHTML={{ __html: msg.content.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }}
                                                    />
                                                )}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                  <div className="mt-2 w-full">
                                                    <AttachmentPreviewer attachments={msg.attachments} />
                                                  </div>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDistanceToNowStrict(new Date(msg.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {msg.senderId === loggedInUser?.id && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={loggedInUser?.avatar_url || ''} />
                                                    <AvatarFallback>{loggedInUser?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            {!isSelectionMode && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className={`absolute top-0 h-6 w-6 opacity-0 group-hover:opacity-100 ${msg.senderId === loggedInUser?.id ? 'left-0' : 'right-0'}`}>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => setReplyingToMessage(msg)}>
                                                            <MessageCircleReply className="mr-2 h-4 w-4"/>
                                                            Reply
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setForwardingMessage(msg)}>
                                                            <Forward className="mr-2 h-4 w-4"/>
                                                            Forward
                                                        </DropdownMenuItem>
                                                        
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="text-center text-sm text-muted-foreground pt-10">
                                            {activeChatMode === 'group' 
                                                ? 'This is the beginning of your group chat.'
                                                : 'No messages yet. Start the conversation!'}
                                        </div>
                                    )}
                                </div>
                                <div ref={messagesEndRef} />
                            </ScrollArea>
                            <CardFooter className="pt-4 border-t flex flex-col items-start gap-2">
                                {replyingToMessage && (
                                    <div className="w-full relative rounded-md bg-muted p-2 pr-8 text-sm">
                                        <p className="font-semibold text-primary">Replying to {users.find(u => u.id === replyingToMessage.senderId)?.name}</p>
                                        <p className="text-muted-foreground truncate">{replyingToMessage.content}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => setReplyingToMessage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                {attachments.length > 0 && (
                                    <div className="w-full space-y-2">
                                        <p className="text-sm font-medium">Attachments:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map(file => (
                                                <div key={file.name} className="flex items-center gap-2 bg-muted p-2 rounded-md text-sm">
                                                    <span>{file.name}</span>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveAttachment(file.name)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            ref={chatInputRef}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            disabled={isSending}
                                            className="pr-10"
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                                    <Smile className="h-5 w-5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-2">
                                                <div className="grid grid-cols-8 gap-1">
                                                    {EMOJIS.map(emoji => (
                                                        <Button 
                                                            key={emoji}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-xl"
                                                            onClick={() => handleEmojiSelect(emoji)}
                                                        >
                                                            {emoji}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                     <Button asChild variant="ghost" size="icon">
                                        <Label htmlFor="chat-attachments">
                                            <Paperclip className="h-5 w-5" />
                                            <span className="sr-only">Attach files</span>
                                        </Label>
                                    </Button>
                                    <Input id="chat-attachments" type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <Button type="submit" size="icon" disabled={isSending}>
                                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <MessageSquare className="h-16 w-16 mb-4" />
                            <h3 className="text-lg font-semibold">Select a user to start chatting</h3>
                            <p className="max-w-xs">Or, start a new group chat using the icon in the top left.</p>
                        </div>
                    )}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="mail">
           <Card className="h-[70vh] flex">
             <div className="w-1/3 max-w-sm border-r flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Mailing</CardTitle>
                      <Button size="sm" onClick={() => handleOpenCompose()}>
                        <Send className="mr-2 h-4 w-4" /> New Mail
                      </Button>
                    </div>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search mail..." className="pl-9" value={mailSearch} onChange={(e) => setMailSearch(e.target.value)} />
                    </div>
                </CardHeader>
                <Tabs value={activeMailbox} onValueChange={(v) => setActiveMailbox(v as MailboxView)} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="mx-4">
                        <TabsTrigger value="inbox" className="w-full">Inbox {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}</TabsTrigger>
                        <TabsTrigger value="sent" className="w-full">Sent</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="flex-1">
                        <TabsContent value="inbox" className="m-0">
                          {inboxMails.map(mail => (
                            <button key={mail.id} onClick={() => handleOpenMail(mail)} className={`w-full text-left block p-4 border-b hover:bg-accent ${viewingMail?.id === mail.id ? 'bg-accent' : ''}`}>
                              <div className="flex justify-between items-start">
                                <p className={`font-semibold truncate ${loggedInUser && !mail.readBy[loggedInUser.id] ? 'text-primary' : ''}`}>{mail.senderName}</p>
                                <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatDistanceToNow(new Date(mail.timestamp), { addSuffix: true })}</p>
                              </div>
                              <p className={`truncate ${loggedInUser && !mail.readBy[loggedInUser.id] ? 'font-bold' : ''}`}>{mail.subject}</p>
                              <p className="text-xs text-muted-foreground truncate">{[...(mail.toRecipients || []), ...(mail.ccRecipients || [])].map(r => r.name).join(', ')}</p>
                            </button>
                          ))}
                        </TabsContent>
                        <TabsContent value="sent" className="m-0">
                          {sentMails.map(mail => (
                             <button key={mail.id} onClick={() => handleOpenMail(mail)} className={`w-full text-left block p-4 border-b hover:bg-accent ${viewingMail?.id === mail.id ? 'bg-accent' : ''}`}>
                              <div className="flex justify-between items-start">
                                <p className="font-semibold truncate">To: {[...(mail.toRecipients || []), ...(mail.ccRecipients || [])].map(r => r.name).join(', ')}</p>
                                <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{formatDistanceToNow(new Date(mail.timestamp), { addSuffix: true })}</p>
                              </div>
                              <p className="truncate font-medium">{mail.subject}</p>
                              <p className="text-xs text-muted-foreground truncate">{mail.body}</p>
                            </button>
                          ))}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
             </div>
             <div className="w-2/3 flex flex-col">
                {viewingMail ? (
                  <div className="flex flex-col h-full">
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="truncate">{viewingMail.subject}</CardTitle>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleOpenCompose({ replyTo: viewingMail })}>
                                    <Reply className="mr-2 h-4 w-4" /> Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenCompose({ forward: viewingMail })}>
                                    <Forward className="mr-2 h-4 w-4" /> Forward
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                                <AvatarImage src={users.find(u=>u.id === viewingMail.senderId)?.avatar_url || ''} />
                                <AvatarFallback>{viewingMail.senderName.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div>
                                <p className="font-semibold">{viewingMail.senderName}</p>
                                {getRecipientString(viewingMail)}
                           </div>
                        </div>
                      </div>
                       <p className="text-xs text-muted-foreground pt-2">{format(new Date(viewingMail.timestamp), "MMM d, yyyy 'at' h:mm a")}</p>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-6">
                        {viewingMail.forwardedFrom && (
                            <div className="text-xs text-muted-foreground border-l-2 pl-2 mb-4">
                                <p>---------- Forwarded message ---------</p>
                                <p>From: {viewingMail.forwardedFrom.senderName}</p>
                                <p>Date: {viewingMail.forwardedFrom.date}</p>
                            </div>
                        )}
                        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{viewingMail.body}</div>
                        {viewingMail.attachments && viewingMail.attachments.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-semibold mb-2">Attachments</h4>
                            <AttachmentPreviewer attachments={viewingMail.attachments} />
                          </div>
                        )}
                    </ScrollArea>
                    <CardFooter className="border-t pt-4">
                      <Button onClick={() => handleOpenCompose({ replyTo: viewingMail })}>
                        <Reply className="mr-2 h-4 w-4" /> Reply
                      </Button>
                    </CardFooter>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Inbox className="h-16 w-16 mb-4" />
                    <h3 className="text-lg font-semibold">Select an item to read</h3>
                    <p className="max-w-xs">Nothing is selected.</p>
                  </div>
                )}
             </div>
           </Card>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this message.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       <Dialog open={!!forwardingMessage} onOpenChange={(open) => {if (!open) setForwardingMessage(null)}}>
        <DialogContent className="flex flex-col h-[80vh]">
            <DialogHeader>
                <DialogTitle>Forward Message</DialogTitle>
                <DialogDescription>Select who to forward this message to.</DialogDescription>
            </DialogHeader>
            <div className="p-4 border rounded-md bg-muted text-sm">
                <p className="break-words">{forwardingMessage?.content}</p>
            </div>
             <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search users..."
                    className="pl-9"
                    value={forwardUserSearch}
                    onChange={(e) => setForwardUserSearch(e.target.value)}
                />
            </div>
            <ScrollArea className="flex-1 mt-4 border rounded-md">
                <div className="p-2">
                    {filteredForwardUsers.map(user => (
                        <div 
                        key={user.id} 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                        >
                            <Checkbox 
                                id={`fwd-user-${user.id}`}
                                checked={forwardRecipients.includes(user.id)}
                                onCheckedChange={() => handleToggleForwardRecipient(user.id)}
                            />
                            <label htmlFor={`fwd-user-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
                                <Avatar>
                                    <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.role}</p>
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <DialogFooter>
                 <Button variant="ghost" onClick={() => setForwardingMessage(null)}>Cancel</Button>
                <Button onClick={handleForwardMessage} disabled={forwardRecipients.length === 0}>
                    <Send className="mr-2 h-4 w-4" />
                    Forward ({forwardRecipients.length})
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isGroupChatDialogOpen} onOpenChange={setIsGroupChatDialogOpen}>
      <DialogContent className="flex flex-col h-[80vh]">
        <DialogHeader>
            <DialogTitle>New Group Chat</DialogTitle>
            <DialogDescription>Select two or more users to start a temporary group chat.</DialogDescription>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search users..."
              className="pl-9"
              value={groupUserSearch}
              onChange={(e) => setGroupUserSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 mt-4 border rounded-md">
            <div className="p-2">
                {filteredGroupUsers.map(user => (
                    <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                    >
                        <Checkbox 
                            id={`grp-user-${user.id}`}
                            checked={groupRecipients.some(u => u.id === user.id)}
                            onCheckedChange={() => handleToggleGroupRecipient(user)}
                        />
                        <label htmlFor={`grp-user-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
                            <Avatar>
                                <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </label>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
              <Button variant="ghost" onClick={() => setIsGroupChatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStartGroupChat} disabled={groupRecipients.length < 2}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Chat ({groupRecipients.length})
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
      <DialogContent className="flex flex-col h-[80vh]">
        <DialogHeader>
            <DialogTitle>Invite to Meeting</DialogTitle>
            <DialogDescription>Select users to invite to the current meeting.</DialogDescription>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search users..."
              className="pl-9"
              value={inviteUserSearch}
              onChange={(e) => setInviteUserSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 mt-4 border rounded-md">
            <div className="p-2">
                {filteredInviteUsers.map(user => (
                    <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                    >
                        <Checkbox 
                            id={`inv-user-${user.id}`}
                            checked={inviteRecipients.includes(user.id)}
                            onCheckedChange={() => handleToggleInviteRecipient(user.id)}
                        />
                        <label htmlFor={`inv-user-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
                            <Avatar>
                                <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </label>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
              <Button variant="ghost" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvites} disabled={inviteRecipients.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Send Invites ({inviteRecipients.length})
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ComposeMailDialog
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        replyingTo={replyingToMail}
        forwardingMail={forwardingMail}
    />
    </div>
  );
}

const ComposeMailDialog = ({ isOpen, onClose, replyingTo, forwardingMail }: { isOpen: boolean, onClose: () => void, replyingTo: InternalMail | null, forwardingMail: InternalMail | null }) => {
    const { loggedInUser, users } = useSettings();
    const [toRecipients, setToRecipients] = useState<User[]>([]);
    const [ccRecipients, setCcRecipients] = useState<User[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [mailAttachments, setMailAttachments] = useState<File[]>([]);
    const [isSendingMail, setIsSendingMail] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (forwardingMail) {
            setToRecipients([]);
            setCcRecipients([]);
            setSubject(forwardingMail.subject.startsWith("Fwd: ") ? forwardingMail.subject : `Fwd: ${forwardingMail.subject}`);
            const fwdBody = `\n\n\n--- Forwarded message ---\nFrom: ${forwardingMail.senderName}\nDate: ${format(new Date(forwardingMail.timestamp), 'PPpp')}\nSubject: ${forwardingMail.subject}\nTo: ${(forwardingMail.toRecipients || []).map(r => r.name).join(', ')}\n\n${forwardingMail.body}`;
            setBody(fwdBody);
            setMailAttachments([]); // Do not forward attachments by default
        } else if (replyingTo && loggedInUser) {
            const allParticipants = [
                {id: replyingTo.senderId, name: replyingTo.senderName}, 
                ...(replyingTo.toRecipients || []),
                ...(replyingTo.ccRecipients || []),
            ].filter(p => p.id !== loggedInUser.id);
            
            const to = users.find(u => u.id === replyingTo.senderId);
            const cc = Array.from(new Set(allParticipants.filter(p => p.id !== replyingTo.senderId).map(p => p.id)))
                .map(id => users.find(u => u.id === id)).filter(Boolean) as User[];

            setToRecipients(to ? [to] : []);
            setCcRecipients(cc);
            setSubject(replyingTo.subject.startsWith("Re: ") ? replyingTo.subject : `Re: ${replyingTo.subject}`);
            setBody(`\n\n\n--- On ${format(new Date(replyingTo.timestamp), 'PPpp')}, ${replyingTo.senderName} wrote: ---\n${replyingTo.body}`);
            setMailAttachments([]);
        } else {
            setToRecipients([]);
            setCcRecipients([]);
            setSubject('');
            setBody('');
            setMailAttachments([]);
        }
    }, [replyingTo, forwardingMail, isOpen, loggedInUser, users]);

    const handleToggleRecipient = (user: User, list: 'to' | 'cc') => {
        const setList = list === 'to' ? setToRecipients : setCcRecipients;
        setList(prev => 
            prev.some(u => u.id === user.id) 
            ? prev.filter(u => u.id !== user.id)
            : [...prev, user]
        );
    };

    const handleFileChangeForMail = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setMailAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleRemoveMailAttachment = (fileName: string) => {
        setMailAttachments(prev => prev.filter(file => file.name !== fileName));
    };

    const handleSendMail = async () => {
        if (!loggedInUser || toRecipients.length === 0 || !subject.trim() || !body.trim()) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please add recipients, a subject, and a message body." });
            return;
        }

        setIsSendingMail(true);
        try {
            let attachmentUrls: { name: string; url: string }[] = [];
            if (mailAttachments.length > 0) {
                const uploadPromises = mailAttachments.map(async (file) => {
                    const folder = `mail_attachments/${loggedInUser.id}`;
                    await uploadFile(loggedInUser.businessId!, folder, file, () => {});
                    const url = await getPublicUrl(loggedInUser.businessId!, `${folder}/${file.name}`);
                    return { name: file.name, url };
                });
                attachmentUrls = await Promise.all(uploadPromises);
            }

            const mailData: Omit<InternalMail, 'id'> = {
                senderId: loggedInUser.id,
                senderName: loggedInUser.name,
                toRecipients: toRecipients.map(u => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })),
                ccRecipients: ccRecipients.map(u => ({ id: u.id, name: u.name, avatar_url: u.avatar_url })),
                subject,
                body,
                attachments: attachmentUrls,
                timestamp: new Date().toISOString(),
                readBy: { [loggedInUser.id]: true },
                businessId: loggedInUser.businessId,
                threadId: replyingTo?.threadId || forwardingMail?.threadId || Math.random().toString(36).substring(2),
            };

            if (forwardingMail) {
                mailData.forwardedFrom = {
                    senderName: forwardingMail.senderName,
                    date: format(new Date(forwardingMail.timestamp), 'PPpp')
                };
            }

            await addDoc(collection(db, 'internal_mails'), mailData);
            toast({ title: 'Mail Sent!' });
            onClose();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error sending mail", description: error.message });
        } finally {
            setIsSendingMail(false);
        }
    };
    
    const filteredUsers = useMemo(() => {
      const allOtherUsers = users.filter(u => u.id !== loggedInUser?.id);
      if (!recipientSearch) return allOtherUsers;
      return allOtherUsers.filter(u => u.name.toLowerCase().includes(recipientSearch.toLowerCase()));
    }, [users, recipientSearch, loggedInUser]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl flex flex-col h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{replyingTo ? "Reply" : forwardingMail ? "Forward" : "Compose New Mail"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-4">
                        <Label htmlFor="to" className="text-right">To:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                                  {toRecipients.length > 0 ? toRecipients.map(u => u.name).join(', ') : 'Select recipients...'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <div className="p-2 border-b"><Input placeholder="Search users..." className="pl-8" value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} /></div>
                                <ScrollArea className="h-64">{filteredUsers.map(user => (<div key={user.id} className="flex items-center p-2 cursor-pointer hover:bg-accent" onClick={() => handleToggleRecipient(user, 'to')}><Checkbox className="mr-2" checked={toRecipients.some(r => r.id === user.id)} /><span>{user.name}</span></div>))}</ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-[80px_1fr] items-center gap-4">
                        <Label htmlFor="cc" className="text-right">CC:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                                  {ccRecipients.length > 0 ? ccRecipients.map(u => u.name).join(', ') : 'Select recipients...'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <div className="p-2 border-b"><Input placeholder="Search users..." className="pl-8" value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} /></div>
                                <ScrollArea className="h-64">{filteredUsers.map(user => (<div key={user.id} className="flex items-center p-2 cursor-pointer hover:bg-accent" onClick={() => handleToggleRecipient(user, 'cc')}><Checkbox className="mr-2" checked={ccRecipients.some(r => r.id === user.id)} /><span>{user.name}</span></div>))}</ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid grid-cols-[80px_1fr] items-center gap-4">
                        <Label htmlFor="subject" className="text-right">Subject:</Label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                </div>
                <Textarea 
                    placeholder="Write your message here..."
                    className="flex-1"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
                {mailAttachments.length > 0 && (
                    <div className="space-y-2 pt-4">
                        <p className="text-sm font-medium">Attachments:</p>
                        <div className="flex flex-wrap gap-2">
                            {mailAttachments.map(file => (
                                <div key={file.name} className="flex items-center gap-2 bg-muted p-2 rounded-md text-sm">
                                    <span>{file.name}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveMailAttachment(file.name)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button asChild variant="ghost">
                        <Label htmlFor="mail-attachments" className="cursor-pointer">
                            <Paperclip className="mr-2 h-4 w-4" />
                            Attach File
                        </Label>
                    </Button>
                    <Input id="mail-attachments" type="file" multiple className="hidden" onChange={handleFileChangeForMail} />
                    <div className="flex-1" />
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSendMail} disabled={isSendingMail}>
                        {isSendingMail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Mail
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
    



