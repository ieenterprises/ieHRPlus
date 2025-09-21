

"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, MessageSquare, Mail, Send, Search, Users, X, Trash2, Forward, MoreVertical, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, ChatMessage } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogHeader, DialogFooter, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { VIDEOSDK_TOKEN } from '@/lib/videosdk-config';
import Link from 'next/link';

type ChatMode = 'individual' | 'group';

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

  // Chat state
  const [userSearch, setUserSearch] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Invite state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteRecipients, setInviteRecipients] = useState<string[]>([]);
  const [inviteUserSearch, setInviteUserSearch] = useState('');


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
        setActiveTab('video');
        joinMeeting(joinMeetingId);
    }
  }, [searchParams]);

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
        if (roomId) {
          joinMeeting(roomId);
        }
        return roomId;
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Error creating meeting" });
        return null;
      }
  };

  const joinMeeting = (id: string) => {
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
    setMeetingId(id); // Set meeting ID to state
    
    newMeeting.join();

    newMeeting.on("meeting-joined", () => {
        setParticipants(Array.from(newMeeting.participants.values()));
    });

     newMeeting.on("meeting-left", () => {
        setMeeting(null);
        setMeetingId(null);
        setParticipants([]);
    });

    newMeeting.on("participant-joined", (participant: any) => {
        setParticipants(prev => [...prev, participant]);
    });

    newMeeting.on("participant-left", (participant: any) => {
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });
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

  const sendMeetingInvite = async (recipientId: string, meetingId: string) => {
      if (!loggedInUser || !recipientId || !meetingId) return;

      const inviteLink = `/meeting?join=${meetingId}`;
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
      setActiveTab('video');
      const newMeetingId = await createMeeting();
      if (newMeetingId) {
          await sendMeetingInvite(selectedChatUser.id, newMeetingId);
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
      if (!newMessage.trim() || !loggedInUser || !selectedChatUser) return;
      
      const messageData: Omit<ChatMessage, 'id'> = {
          senderId: loggedInUser.id,
          receiverId: selectedChatUser.id,
          content: newMessage,
          timestamp: new Date().toISOString(),
          isRead: false,
          businessId: loggedInUser.businessId,
      };
      
      try {
          await addDoc(collection(db, 'chatMessages'), messageData);
          setNewMessage('');
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error sending message' });
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
        if (!meetingId || inviteRecipients.length === 0 || !loggedInUser) return;

        const batch = writeBatch(db);
        const inviteMessage = `${loggedInUser.name} has invited you to a meeting. Meeting ID: ${meetingId}`;

        inviteRecipients.forEach(recipientId => {
            const newMessageRef = doc(collection(db, 'chatMessages'));
            const messageData: Omit<ChatMessage, 'id'> = {
                senderId: loggedInUser.id,
                receiverId: recipientId,
                content: inviteMessage,
                timestamp: new Date().toISOString(),
                isRead: false,
                businessId: loggedInUser.businessId,
            };
            batch.set(newMessageRef, messageData);
        });

        try {
            await batch.commit();
            toast({ title: `Invitation sent to ${inviteRecipients.length} user(s).` });
            setIsInviteDialogOpen(false);
            setInviteRecipients([]);
            setInviteUserSearch('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error sending invitations' });
        }
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
  
    const ParticipantView = ({ participant }: { participant: any }) => {
    const micRef = useRef<HTMLAudioElement>(null);
    const webcamRef = useRef<HTMLVideoElement>(null);
    const [micOn, setMicOn] = useState(false);
    const [webcamOn, setWebcamOn] = useState(false);
    
    useEffect(() => {
      const audioStream = Array.from(participant.streams.values()).find((s: any) => s.kind === 'audio');
      const videoStream = Array.from(participant.streams.values()).find((s: any) => s.kind === 'video');

      if (audioStream) {
        setMicOn(true);
        if (micRef.current) {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(audioStream.track);
          micRef.current.srcObject = mediaStream;
          micRef.current.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error("audio play error", e)
            }
          });
        }
      }

      if (videoStream) {
        setWebcamOn(true);
        if (webcamRef.current) {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(videoStream.track);
          webcamRef.current.srcObject = mediaStream;
          webcamRef.current.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error("video play error", e);
            }
          });
        }
      }

      const handleStreamEnabled = (stream: any) => {
        if (stream.kind === 'audio') {
          setMicOn(true);
          if (micRef.current) {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(stream.track);
            micRef.current.srcObject = mediaStream;
            micRef.current.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("audio play error", e)
                }
            });
          }
        }
        if (stream.kind === 'video') {
          setWebcamOn(true);
          if (webcamRef.current) {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(stream.track);
            webcamRef.current.srcObject = mediaStream;
            webcamRef.current.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("video play error", e);
                }
            });
          }
        }
      };

      const handleStreamDisabled = (stream: any) => {
        if (stream.kind === 'audio') setMicOn(false);
        if (stream.kind === 'video') setWebcamOn(false);
      };

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
            Mailing
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="video">
            <Card className="h-[70vh]">
                {meeting && meetingId ? (
                    <div className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Meeting ID: {meetingId}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
                            {meeting.localParticipant && <ParticipantView participant={meeting.localParticipant} />}
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
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <CardTitle className="text-2xl">Join or Create a Meeting</CardTitle>
                        <div className="flex gap-4">
                            <Button onClick={() => createMeeting()}>New Meeting</Button>
                            <span className="flex items-center">OR</span>
                            <div className="flex gap-2">
                                <Input type="text" id="meetingIdTxt" placeholder="Enter Meeting ID" />
                                <Button onClick={() => joinMeeting((document.getElementById('meetingIdTxt') as HTMLInputElement).value)}>Join Meeting</Button>
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
                    {selectedChatUser || activeChatMode === 'group' ? (
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
                                    {activeChatMode === 'individual' && (
                                      <Button variant="outline" size="icon" onClick={handleStartVideoCall}>
                                          <Video className="h-5 w-5"/>
                                      </Button>
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
                                            {msg.senderId !== loggedInUser?.id && (
                                              <Avatar className="h-8 w-8">
                                                  <AvatarImage src={users.find(u => u.id === msg.senderId)?.avatar_url || ''} />
                                                  <AvatarFallback>{users.find(u => u.id === msg.senderId)?.name?.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                            )}
                                            <div className={`flex flex-col ${msg.senderId === loggedInUser?.id ? 'items-end' : 'items-start'}`}>
                                                <div 
                                                    className={`rounded-lg px-3 py-2 max-w-sm break-words ${msg.senderId === loggedInUser?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                                    dangerouslySetInnerHTML={{ __html: msg.content.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }}
                                                />
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className={`absolute top-0 h-6 w-6 opacity-0 group-hover:opacity-100 ${msg.senderId === loggedInUser?.id ? 'left-0' : 'right-0'}`}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => setForwardingMessage(msg)}>
                                                        <Forward className="mr-2 h-4 w-4"/>
                                                        Forward
                                                    </DropdownMenuItem>
                                                    {msg.senderId === loggedInUser?.id && (
                                                        <DropdownMenuItem onClick={() => setDeletingMessage(msg)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4"/>
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                            <CardFooter className="pt-4 border-t">
                                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                                    <Input 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                    />
                                    <Button type="submit" size="icon">
                                        <Send className="h-4 w-4" />
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
           <Card>
              <CardHeader>
                <CardTitle>Internal Mailing</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[60vh] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Mail className="mx-auto h-12 w-12 mb-4" />
                    <p>Internal mailing system to be implemented.</p>
                  </div>
              </CardContent>
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
    </div>
  );
}

    

    



    