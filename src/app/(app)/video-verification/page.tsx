

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Video, UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { uploadFile, getPublicUrl } from "@/lib/firebase-storage";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const RECORDING_DURATION = 8000; // 8 seconds in milliseconds

export default function VideoVerificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loggedInUser, loadingUser } = useSettings();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !loggedInUser) {
      router.push("/sign-in");
    }
  }, [loggedInUser, loadingUser, router]);

  // Request camera permission and start recording
  useEffect(() => {
    if (!loggedInUser) return;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start recording immediately
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          setRecordedVideo(blob);
          recordedChunksRef.current = [];
          stream.getTracks().forEach(track => track.stop()); // Turn off camera
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);

      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
    }

    setupCamera();
  }, [loggedInUser, toast]);

  // Handle recording progress and stopping
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min((elapsedTime / RECORDING_DURATION) * 100, 100);
        setRecordingProgress(progress);

        if (elapsedTime >= RECORDING_DURATION) {
          clearInterval(interval);
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const handleUpload = async () => {
    if (!recordedVideo || !loggedInUser?.businessId) return;

    setIsUploading(true);
    try {
      const videoFolder = 'verification_videos';
      const fileName = `verification_${loggedInUser.id}_${Date.now()}.webm`;
      const videoFile = new File([recordedVideo], fileName, { type: "video/webm" });
      
      // 1. Upload the file using the existing function
      await uploadFile(loggedInUser.businessId, videoFolder, videoFile, (progress) => {
        // You could display upload progress if you want
      });

      // 2. Get the public URL of the uploaded file
      const videoUrl = await getPublicUrl(loggedInUser.businessId, `${videoFolder}/${fileName}`);
      
      // 3. Update the TimeRecord in Firestore
      const timeRecordId = sessionStorage.getItem('latestTimeRecordId');
      if (timeRecordId) {
          const timeRecordRef = doc(db, 'timeRecords', timeRecordId);
          await updateDoc(timeRecordRef, { videoUrl: videoUrl });
          sessionStorage.removeItem('latestTimeRecordId'); // Clean up
      }

      toast({
        title: "Upload Complete",
        description: "Your verification video has been uploaded and linked.",
      });

      router.push("/dashboard");

    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your verification video. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingUser || !loggedInUser) {
    return <div className="flex h-screen items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Video /> Video Verification
          </CardTitle>
          <CardDescription>
            Please record a brief 8-second video for identity verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-card-foreground/5">
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white">Camera access is required.</p>
              </div>
            )}
          </div>
          {isRecording && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-center text-primary">Recording...</p>
              <Progress value={recordingProgress} />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {recordedVideo && !isUploading ? (
            <Button className="w-full" size="lg" onClick={handleUpload}>
              <UploadCloud className="mr-2 h-5 w-5" />
              Upload to File Manager
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uploading...
                </>
              ) : isRecording ? (
                'Recording in Progress...'
              ) : (
                'Waiting for video...'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
