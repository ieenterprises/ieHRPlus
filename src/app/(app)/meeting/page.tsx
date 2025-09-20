
"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Video, VideoOff, UserPlus, ScreenShare, Disc, Phone, PhoneOff, MessageSquare, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MeetingState = 'idle' | 'active' | 'ended';

export default function MeetingPage() {
  const { toast } = useToast();
  const { loggedInUser } = useSettings();
  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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
           <Card>
              <CardHeader>
                <CardTitle>Team Chat</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[60vh] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                    <p>Real-time team chat is coming soon.</p>
                  </div>
              </CardContent>
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
