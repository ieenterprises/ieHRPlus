

"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimeRecord } from "@/lib/types";
import { format } from "date-fns";
import { Video, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, deleteObject } from "firebase/storage";

export default function HrReviewPage() {
  const { loggedInUser } = useSettings();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const storage = getStorage();

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      setTimeRecords(records.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loggedInUser?.businessId]);

  const handleApprove = async (recordId: string) => {
    const recordRef = doc(db, 'timeRecords', recordId);
    try {
        await updateDoc(recordRef, { status: 'Clocked In' });
        toast({ title: "Record Approved", description: "The user's clock-in has been approved." });
    } catch (error) {
        console.error("Error approving record:", error);
        toast({ title: "Error", description: "Could not approve the record.", variant: "destructive" });
    }
  };

  const handleReject = async (record: TimeRecord) => {
    try {
        // Delete the record from Firestore
        await deleteDoc(doc(db, 'timeRecords', record.id));

        // If there's a video, delete it from Storage
        if (record.videoUrl) {
            // Extract the storage path from the URL
            try {
                const videoPath = decodeURIComponent(record.videoUrl.split('/o/')[1].split('?')[0]);
                const videoRef = ref(storage, videoPath);
                await deleteObject(videoRef);
            } catch (storageError) {
                console.warn("Could not delete video from storage, it might have already been removed or the URL is malformed:", storageError);
            }
        }
        
        toast({ title: "Record Rejected", description: "The record and associated video have been deleted.", variant: "destructive" });

    } catch (error) {
        console.error("Error rejecting record:", error);
        toast({ title: "Error", description: "Could not reject the record.", variant: "destructive" });
    }
  };
  
  const getBadgeVariant = (status: TimeRecord['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'Clocked In':
        return 'default';
      case 'Clocked Out':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handlePreview = (videoUrl: string) => {
    setPreviewVideoUrl(videoUrl);
  };
  
  const handleDownload = (url: string, userName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification_${userName.replace(' ', '_')}_${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  return (
    <div className="space-y-8">
      <PageHeader title="HR Review" description="Review and manage employee clock-in/out records." />
      <Card>
        <CardHeader>
          <CardTitle>Pending Submissions</CardTitle>
          <CardDescription>
            These are the clock-in records waiting for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Clock Out Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : timeRecords.length > 0 ? (
                  timeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.userName}</TableCell>
                      <TableCell>{record.userEmail}</TableCell>
                      <TableCell>
                        {format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {record.clockOutTime
                          ? format(new Date(record.clockOutTime), "MMM d, yyyy, h:mm a")
                          : "-"}
                      </TableCell>
                       <TableCell>
                        {record.videoUrl ? (
                          <Button variant="outline" size="sm" onClick={() => handlePreview(record.videoUrl!)}>
                              <Video className="mr-2 h-4 w-4" /> View Video
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleApprove(record.id)} disabled={record.status !== 'pending'}>Approve</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleReject(record)} disabled={record.status !== 'pending'}>Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No pending submissions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!previewVideoUrl} onOpenChange={(open) => !open && setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Video</DialogTitle>
             <DialogDescription>Review the employee's clock-in verification video.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewVideoUrl && (
              <video controls autoPlay src={previewVideoUrl} className="w-full rounded-md" />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleDownload(previewVideoUrl!, 'verification')} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => setPreviewVideoUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
