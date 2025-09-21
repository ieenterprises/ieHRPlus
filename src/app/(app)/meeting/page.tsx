

"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Video, VideoOff, UserPlus, ScreenShare, Disc, Phone, PhoneOff, MessageSquare, Mail, Send, Search, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, where, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, ChatMessage } from '@/lib/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

type MeetingState = 'idle' | 'active' | 'ended';
type AudioCallState = 'idle' | 'calling' | 'active' | 'ended';

export default function MeetingPage() {
  const { toast } = useToast();
  const { loggedInUser, users } = useSettings();
  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Chat and Video Call state
  const [userSearch, setUserSearch] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMeetingUsers, setSelectedMeetingUsers] = useState<User[]>([]);
  const [showMeetingChat, setShowMeetingChat] = useState(false);
  const [meetingChatMessage, setMeetingChatMessage] = useState('');

  // Audio Call State
  const [audioCallState, setAudioCallState] = useState<AudioCallState>('idle');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('video');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'chat' || hash === 'video' || hash === 'mail') {
        setActiveTab(hash);
    }
  }, []);


  const meetingTitle = useMemo(() => {
    if (selectedMeetingUsers.length === 0) return 'New Meeting';
    if (selectedMeetingUsers.length === 1) return `Meeting with ${selectedMeetingUsers[0].name}`;
    return `Meeting with ${selectedMeetingUsers.length} people`;
  }, [selectedMeetingUsers]);

  const cleanupStream = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
  };
  
  useEffect(() => {
    return () => {
      cleanupStream();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startMeeting = async () => {
    if (selectedMeetingUsers.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Users Selected',
            description: 'Please select at least one user to start a meeting.',
        });
        return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setHasPermissions(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setMeetingState('active');
      setIsMuted(false);
      setIsVideoOff(false);
      setShowMeetingChat(true); // Open chat by default when meeting starts
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setHasPermissions(false);
      toast({
        variant: 'destructive',
        title: 'Media Access Denied',
        description: 'Please enable camera and microphone permissions to join the meeting.',
      });
    }
  };
  
  const endMeeting = () => {
    cleanupStream();
    setMeetingState('ended');
    setShowMeetingChat(false);
  };
  
  const returnToLobby = () => {
    setSelectedMeetingUsers([]);
    setMeetingState('idle');
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };
  
  const filteredUsers = useMemo(() => {
      if (!userSearch) return users.filter(u => u.id !== loggedInUser?.id);
      return users.filter(u => u.id !== loggedInUser?.id && u.name.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch, loggedInUser]);

  const handleToggleMeetingUser = (user: User) => {
    setSelectedMeetingUsers(prev =>
        prev.some(u => u.id === user.id)
            ? prev.filter(u => u.id !== user.id)
            : [...prev, user]
    );
  };
  
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
  }, [messages]);
  
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

  const handleSendMeetingMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!meetingChatMessage.trim() || !loggedInUser) return;
      
      // In a real app, this would send to all participants.
      // For now, it sends to the first selected user as a demo.
      const firstParticipant = selectedMeetingUsers[0];
      if (!firstParticipant) return;

      const messageData: Omit<ChatMessage, 'id'> = {
          senderId: loggedInUser.id,
          receiverId: firstParticipant.id,
          content: meetingChatMessage,
          timestamp: new Date().toISOString(),
          isRead: false,
          businessId: loggedInUser.businessId,
      };
      
      try {
          await addDoc(collection(db, 'chatMessages'), messageData);
          setMeetingChatMessage('');
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error sending message' });
      }
  };
  
  // Audio Call Handlers
  const startAudioCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setAudioCallState('calling');
      // In a real app, you'd signal the other user here.
      // For now, we'll simulate it moving to 'active' after a delay.
      setTimeout(() => setAudioCallState('active'), 3000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: 'Please enable microphone permissions to make a call.',
      });
    }
  };

  const endAudioCall = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setAudioCallState('ended');
    // Go back to chat view after ending
    setTimeout(() => setAudioCallState('idle'), 1500);
  };
  
  const toggleCallAudio = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(prev => !prev);
    }
  };

  useEffect(() => {
    // Reset audio call state if chat user changes
    setAudioCallState('idle');
  }, [selectedChatUser]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={meetingState === 'active' ? meetingTitle : 'Communications Hub'}
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
           <Card className="h-[70vh] flex">
              {/* Lobby / User Selection Panel */}
              <div className={`border-r flex flex-col ${meetingState === 'active' ? 'w-1/4' : 'w-1/3'}`}>
                  <CardHeader>
                      <CardTitle>Select Users</CardTitle>
                       <CardDescription>Choose who to invite to the meeting.</CardDescription>
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
                          <div 
                            key={user.id} 
                            className="flex items-center gap-3 p-3"
                          >
                              <Checkbox 
                                id={`user-check-${user.id}`}
                                checked={selectedMeetingUsers.some(u => u.id === user.id)}
                                onCheckedChange={() => handleToggleMeetingUser(user)}
                                disabled={meetingState !== 'idle'}
                              />
                               <label htmlFor={`user-check-${user.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
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
                  </ScrollArea>
                  {meetingState === 'idle' && (
                    <CardFooter className="pt-4 border-t">
                      <Button 
                          className="w-full" 
                          onClick={startMeeting}
                          disabled={selectedMeetingUsers.length === 0}
                      >
                          <Phone className="mr-2" /> Start Call with {selectedMeetingUsers.length} user(s)
                      </Button>
                    </CardFooter>
                  )}
              </div>
              
              {/* Meeting Area */}
              <div className="flex-1 flex flex-col bg-muted/30">
                  <div className="flex-1 flex">
                      <div className="flex-1 flex flex-col">
                          <CardContent className="p-0 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 min-h-full">
                                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-primary">
                                    <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                                    {meetingState === 'active' && (
                                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            {loggedInUser?.name || 'You'}
                                        </div>
                                    )}
                                    {meetingState === 'idle' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 gap-4 text-center text-white">
                                            <Video className="h-12 w-12 mb-2" />
                                            <h3 className="font-semibold text-lg">Ready to join?</h3>
                                            <p className="text-sm">Select users and start the call.</p>
                                        </div>
                                    )}
                                    {meetingState === 'ended' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 gap-4">
                                            <h3 className="text-xl font-semibold text-white">Meeting has ended.</h3>
                                            <Button size="lg" variant="outline" onClick={returnToLobby}>
                                                Return to Lobby
                                            </Button>
                                        </div>
                                    )}
                                    {meetingState === 'active' && isVideoOff && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                            <div className="text-center text-white">
                                                <VideoOff className="h-10 w-10 mx-auto mb-2" />
                                                <p>Video is off</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {meetingState === 'active' && selectedMeetingUsers.map((user) => (
                                    <div key={user.id} className="relative aspect-video bg-muted rounded-lg flex items-center justify-center border">
                                        <div className="text-center">
                                          <Avatar className="h-16 w-16 mx-auto mb-2">
                                              <AvatarImage src={user.avatar_url || ''} />
                                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <p className="text-muted-foreground text-sm">Connecting to {user.name}...</p>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            {user.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                          </CardContent>
                          {meetingState === 'active' && (
                            <CardFooter className="flex items-center justify-center gap-4 border-t pt-4">
                                <Button
                                    variant={isMuted ? 'destructive' : 'secondary'}
                                    size="icon"
                                    className="rounded-full h-12 w-12"
                                    onClick={toggleAudio}
                                    disabled={hasPermissions === false}
                                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? <MicOff /> : <Mic />}
                                </Button>
                                <Button
                                    variant={isVideoOff ? 'destructive' : 'secondary'}
                                    size="icon"
                                    className="rounded-full h-12 w-12"
                                    onClick={toggleVideo}
                                    disabled={hasPermissions === false}
                                    aria-label={isVideoOff ? 'Turn on video' : 'Turn off video'}
                                >
                                    {isVideoOff ? <VideoOff /> : <Video />}
                                </Button>
                                <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" onClick={() => setShowMeetingChat(!showMeetingChat)}>
                                    <MessageSquare />
                                </Button>
                                <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                                    <ScreenShare />
                                </Button>
                                <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                                    <Disc />
                                </Button>
                                <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 ml-8" onClick={endMeeting}>
                                    <PhoneOff />
                                </Button>
                            </CardFooter>
                        )}
                      </div>

                       {/* Meeting Chat Panel */}
                      {meetingState === 'active' && showMeetingChat && (
                          <div className="w-1/3 border-l flex flex-col bg-background">
                              <div className="p-4 border-b">
                                  <h3 className="font-semibold flex items-center justify-between">
                                      Meeting Chat
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMeetingChat(false)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                  </h3>
                              </div>
                              <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {/* A placeholder for chat messages */}
                                     <div className="text-center text-xs text-muted-foreground pt-4">Messages with participants will appear here.</div>
                                </div>
                              </ScrollArea>
                              <div className="p-4 border-t">
                                  <form onSubmit={handleSendMeetingMessage} className="flex w-full items-center gap-2">
                                      <Input 
                                          value={meetingChatMessage}
                                          onChange={(e) => setMeetingChatMessage(e.target.value)}
                                          placeholder="Type a message..."
                                      />
                                      <Button type="submit" size="icon">
                                          <Send className="h-4 w-4" />
                                      </Button>
                                  </form>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="chat">
           <Card className="h-[70vh] flex">
              <div className="w-1/3 border-r flex flex-col">
                  <CardHeader>
                      <CardTitle>Conversations</CardTitle>
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
                            className={`w-full text-left p-3 hover:bg-accent ${selectedChatUser?.id === user.id ? 'bg-accent' : ''}`}
                            onClick={() => setSelectedChatUser(user)}
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
                    {selectedChatUser ? (
                        audioCallState === 'idle' ? (
                        <>
                            <CardHeader className="border-b flex-row items-center justify-between">
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
                                <Button variant="outline" size="icon" onClick={startAudioCall}>
                                    <Phone className="h-5 w-5"/>
                                </Button>
                            </CardHeader>
                             <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {messages.map(msg => (
                                        <div 
                                            key={msg.id} 
                                            className={`flex items-end gap-2 ${msg.senderId === loggedInUser?.id ? 'justify-end' : ''}`}
                                        >
                                            {msg.senderId !== loggedInUser?.id && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={selectedChatUser?.avatar_url || ''} />
                                                    <AvatarFallback>{selectedChatUser?.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div>
                                                <div className={`rounded-lg px-3 py-2 max-w-sm break-words ${msg.senderId === loggedInUser?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    {msg.content}
                                                </div>
                                                <p className={`text-xs text-muted-foreground mt-1 ${msg.senderId === loggedInUser?.id ? 'text-right' : ''}`}>
                                                    {formatDistanceToNowStrict(new Date(msg.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                             {msg.senderId === loggedInUser?.id && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={loggedInUser?.avatar_url || ''} />
                                                    <AvatarFallback>{loggedInUser?.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    ))}
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
                            <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/30">
                                <Avatar className="h-32 w-32 mb-4 ring-4 ring-background">
                                    <AvatarImage src={selectedChatUser.avatar_url || ''} alt={selectedChatUser.name} />
                                    <AvatarFallback className="text-4xl">{selectedChatUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-3xl font-bold">{selectedChatUser.name}</h2>
                                <p className="text-muted-foreground mt-2">
                                    {audioCallState === 'calling' && 'Ringing...'}
                                    {audioCallState === 'active' && 'Connected'}
                                    {audioCallState === 'ended' && 'Call Ended'}
                                </p>
                                <div className="flex items-center justify-center gap-4 mt-8">
                                    <Button
                                        variant={isAudioMuted ? 'destructive' : 'secondary'}
                                        size="icon"
                                        className="rounded-full h-16 w-16"
                                        onClick={toggleCallAudio}
                                        disabled={audioCallState !== 'active'}
                                    >
                                        {isAudioMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                                    </Button>
                                     <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={endAudioCall}>
                                        <PhoneOff className="h-8 w-8" />
                                    </Button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <MessageSquare className="h-16 w-16 mb-4" />
                            <h3 className="text-lg font-semibold">Select a user to start chatting</h3>
                            <p className="max-w-xs">Choose someone from the list on the left to view your conversation or start a new one.</p>
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
    </div>
  );
}
