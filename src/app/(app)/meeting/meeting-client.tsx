
"use client";

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';

// Reference to the global ZegoUIKitPrebuilt object from the script
declare global {
  interface Window {
    ZegoUIKitPrebuilt: any;
  }
}

export function MeetingClient() {
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const { loggedInUser } = useSettings();
  const searchParams = useSearchParams();
  const roomIDFromUrl = searchParams.get('roomID');

  useEffect(() => {
    // Ensure this code runs only on the client and the Zego library is available
    if (typeof window === 'undefined' || !window.ZegoUIKitPrebuilt || !loggedInUser || !meetingContainerRef.current) return;

    let zp: any = null;

    const initMeeting = () => {
      const roomID = roomIDFromUrl || (Math.floor(Math.random() * 10000) + "");
      // Use logged-in user's ID and name for uniqueness
      const userID = loggedInUser.id;
      const userName = loggedInUser.name;
      
      // These should be securely managed, but for now, we use the test values provided
      const appID = 1540588384;
      const serverSecret = "e4fbff9f52c90f6cb65915b1b8bfea59";
      const kitToken = window.ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
      
      zp = window.ZegoUIKitPrebuilt.create(kitToken);

      // Join the room
      zp.joinRoom({
          container: meetingContainerRef.current!,
          prejoinViewConfig: {
              joinButton: "Join",
          },
          sharedLinks: [{
              name: 'Personal link',
              url: window.location.protocol + '//' + window.location.host  + window.location.pathname + '?roomID=' + roomID,
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
    };

    initMeeting();

    // Cleanup function to run when the component unmounts
    return () => {
      if (zp) {
        zp.destroy();
      }
    };
  }, [loggedInUser, roomIDFromUrl]);

  return (
    <div ref={meetingContainerRef} className="w-full h-full" id="root" />
  );
}
