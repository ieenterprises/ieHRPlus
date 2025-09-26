
"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/lib/types';

// Reference to the global ZegoUIKitPrebuilt object from the script
declare global {
  interface Window {
    ZegoUIKitPrebuilt: any;
  }
}

export function MeetingClient() {
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const { loggedInUser, users } = useSettings();
  const searchParams = useSearchParams();
  const roomIDFromUrl = searchParams.get('roomID');
  const [permissionError, setPermissionError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Ensure this code runs only on the client and the Zego library is available
    if (typeof window === 'undefined' || !window.ZegoUIKitPrebuilt || !loggedInUser || !meetingContainerRef.current) return;

    let zp: any = null;

    const initMeeting = async () => {
      setPermissionError(false);
      const roomID = roomIDFromUrl || (Math.floor(Math.random() * 10000) + "");
      const userID = loggedInUser.id;
      const userName = loggedInUser.name;
      
      const appID = 1540588384;
      const serverSecret = "e4fbff9f52c90f6cb65915b1b8bfea59";
      const kitToken = window.ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
      
      zp = window.ZegoUIKitPrebuilt.create(kitToken);

      const meetingLink = window.location.protocol + '//' + window.location.host + window.location.pathname + '?tab=video&roomID=' + roomID;

      try {
          // Join the room
          await zp.joinRoom({
              container: meetingContainerRef.current!,
               prejoinViewConfig: {
                  joinButton: "Join",
              },
              onJoinRoom: async () => {
                  if (!loggedInUser) return;
                  const otherUsers = users.filter(u => u.id !== loggedInUser.id);
                  if (otherUsers.length === 0) return;
                  
                  try {
                      const batch = writeBatch(db);
                      otherUsers.forEach(user => {
                          const messageData: Omit<ChatMessage, 'id'> = {
                              senderId: loggedInUser.id,
                              receiverId: user.id,
                              content: `A video meeting has been started by ${loggedInUser.name}. Click to join: <a href="${meetingLink}" target="_blank">${meetingLink}</a>`,
                              timestamp: new Date().toISOString(),
                              isRead: false,
                              businessId: loggedInUser.businessId,
                          };
                          const messageRef = doc(collection(db, 'chatMessages'));
                          batch.set(messageRef, messageData);
                      });

                      await batch.commit();

                      toast({
                          title: "Meeting Notification Sent",
                          description: "All users have been notified via chat about this meeting.",
                      });
                  } catch (error) {
                      toast({
                          title: "Notification Error",
                          description: "Could not notify users about the meeting.",
                          variant: "destructive"
                      });
                  }
              },
              sharedLinks: [{
                  name: 'Personal link',
                  url: meetingLink,
              }],
              scenario: {
                  mode: window.ZegoUIKitPrebuilt.VideoConference,
              },
              turnOnMicrophoneWhenJoining: true,
              turnOnCameraWhenJoining: true,
              showMyCameraToggleButton: true,
              showMyMicrophoneToggleButton: true,
              showAudioVideoSettingsButton: true,
              showScreenSharingButton: true,
              showTextChat: true,
              showUserList: true,
              maxUsers: 50,
              layout: "Auto",
              showLayoutButton: true,
          });
      } catch (error: any) {
          console.error("Error during Zego joinRoom:", error);
          if (error.name === 'NotAllowedError') {
              setPermissionError(true);
          }
      }
    };

    initMeeting();

    // Cleanup function to run when the component unmounts
    return () => {
      if (zp) {
        zp.destroy();
      }
    };
  }, [loggedInUser, roomIDFromUrl, users, toast]);

  return (
    <>
      {permissionError && (
        <div className="p-4">
          <Alert variant="destructive">
            <VideoOff className="h-4 w-4" />
            <AlertTitle>Camera & Microphone Access Denied</AlertTitle>
            <AlertDescription>
              To join the video meeting, you must allow access to your camera and microphone.
              Please check your browser's site settings for this page and grant the necessary permissions, then refresh.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div ref={meetingContainerRef} className="w-full h-full" id="root" style={{ display: permissionError ? 'none' : 'block' }} />
    </>
  );
}
