
"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Video, VideoOff, UserPlus, ScreenShare, Disc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';

export default function MeetingPage() {
  const { toast } = useToast();
  const { loggedInUser } = useSettings();
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getMediaPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setHasPermissions(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
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

    getMediaPermissions();

    return () => {
      // Cleanup: stop all media tracks when the component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

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
        title="Company Meeting Room"
        description="This is the central meeting place for all employees."
      />

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 min-h-[50vh]">
            {/* Local Video */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-primary">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {loggedInUser?.name || 'You'}
              </div>
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center text-white">
                        <VideoOff className="h-10 w-10 mx-auto mb-2" />
                        <p>Video is off</p>
                    </div>
                </div>
              )}
               {hasPermissions === false && (
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

            {/* Placeholder for remote videos */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                    <p className="text-muted-foreground text-sm">Waiting for user...</p>
                </div>
            ))}
            
          </div>
        </CardContent>
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
        </CardFooter>
      </Card>
    </div>
  );
}
