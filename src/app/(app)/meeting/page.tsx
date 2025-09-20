

"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Video, VideoOff, UserPlus, ScreenShare, Disc, Phone, PhoneOff, MessageSquare, Mail, Send, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, where, onSnapshot, addDoc, orderBy, or, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, ChatMessage } from '@/lib/types';
import { format, formatDistanceToNowStrict } from 'date-fns';

type MeetingState = 'idle' | 'active' | 'ended';

export default function MeetingPage() {
  const { toast } = useToast();
  const { loggedInUser, users } = useSettings();
  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Chat state
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const cleanupStream = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  const startMeeting = async () => {
    if (!meetingTitle) {
        toast({
            variant: 'destructive',
            title: 'Title Required',
            description: 'Please enter a title for the meeting before starting.',
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
  };
  
  const returnToLobby = () => {
    setMeetingTitle('');
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

  // Effect for fetching all messages and identifying unread ones
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

  // Effect for fetching messages for a specific chat
  useEffect(() => {
    if (!loggedInUser || !selectedChatUser) return;

    const q = query(
      collection(db, 'chatMessages'),
      where('businessId', '==', loggedInUser.businessId),
      or(
        where('senderId', '==', loggedInUser.id, 'receiverId', '==', selectedChatUser.id),
        where('senderId', '==', selectedChatUser.id, 'receiverId', '==', loggedInUser.id)
      ),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
      
      // Mark messages as read
      const batch = [];
      for (const doc of snapshot.docs) {
          if (doc.data().receiverId === loggedInUser.id && !doc.data().isRead) {
              batch.push(updateDoc(doc.ref, { isRead: true }));
          }
      }
      if (batch.length > 0) {
          await Promise.all(batch);
      }
    });

    return () => unsubscribe();

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

  return (
    <div className="space-y-8">
      <PageHeader
        title={meetingState === 'active' ? meetingTitle : 'Communications Hub'}
        description="Connect with your team through video, chat, and mail."
      />

      <Tabs defaultValue="video" className="w-full">
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
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 min-h-[50vh]">
                {/* Local Video */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-primary">
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  {meetingState === 'active' && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {loggedInUser?.name || 'You'}
                    </div>
                  )}
                  
                  {/* Overlays */}
                  {meetingState === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 gap-4">
                        <div className="w-full max-w-sm space-y-2">
                             <Label htmlFor="meeting-title" className="text-white">
                                Meeting Title
                            </Label>
                            <Input 
                                id="meeting-title"
                                value={meetingTitle}
                                onChange={(e) => setMeetingTitle(e.target.value)}
                                placeholder="e.g., Weekly Sync"
                                className="bg-white/90"
                            />
                        </div>
                        <Button size="lg" onClick={startMeeting} disabled={!meetingTitle}>
                            <Phone className="mr-2" /> Start Meeting
                        </Button>
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
                   {hasPermissions === false && meetingState !== 'ended' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                         <Alert variant="destructive" className="max-w-sm">
                            <AlertTitle>Permissions Required</AlertTitle>
                            <AlertDescription>
                            Camera and microphone access is required. Please grant permissions in your browser settings and refresh the page.
                            </AlertDescription>
                        </Alert>
                    </div>
                  )}
                </div>

                {/* Placeholder for remote videos - only shown when meeting is active */}
                {meetingState === 'active' && Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                        <p className="text-muted-foreground text-sm">Waiting for user...</p>
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
                    <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                        <ScreenShare />
                    </Button>
                    <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                        <UserPlus />
                    </Button>
                     <Button variant="secondary" size="icon" className="rounded-full h-12 w-12" disabled>
                        <Disc />
                    </Button>
                    <Button variant="destructive" size="icon" className="rounded-full h-12 w-12 ml-8" onClick={endMeeting}>
                        <PhoneOff />
                    </Button>
                </CardFooter>
            )}
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
                        <>
                            <CardHeader className="border-b">
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

