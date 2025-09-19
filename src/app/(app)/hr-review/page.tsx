

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

    // Query for pending and recently handled records
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

  const handleStatusUpdate = async (recordId: string, status: 'Clocked In' | 'rejected') => {
    try {
      const recordRef = doc(db, "timeRecords", recordId);
      await updateDoc(recordRef, { status });
      toast({
        title: "Record Updated",
        description: `The record has been ${status === 'rejected' ? 'rejected' : 'approved'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (record: TimeRecord) => {
      if (!record.id) return;
      try {
        // If there's a video, delete it from storage first
        if (record.videoUrl) {
            // Create a reference to the file to delete
            const videoRef = ref(storage, record.videoUrl);
            await deleteObject(videoRef);
        }

        // Then delete the Firestore document
        await deleteDoc(doc(db, "timeRecords", record.id));
        
        toast({
            title: "Record Deleted",
            description: "The time record and associated video have been permanently deleted.",
            variant: "destructive"
        });
      } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
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
            Approve or reject clock-in records after video verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : timeRecords.filter(r => r.status === 'pending').length > 0 ? (
                  timeRecords.filter(r => r.status === 'pending').map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.userName}</TableCell>
                      <TableCell>
                        {format(new Date(record.clockInTime), "MMM d, yyyy, h:mm a")}
                      </TableCell>
                       <TableCell>
                        {record.videoUrl ? (
                          <Button variant="outline" size="sm" onClick={() => handlePreview(record.videoUrl!)}>
                              <Video className="mr-2 h-4 w-4" /> View Video
                          </Button>
                        ) : (
                          "No Video"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                          <Button size="sm" onClick={() => handleStatusUpdate(record.id, 'Clocked In')} disabled={!record.videoUrl}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(record.id, 'rejected')}>Reject</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(record)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No pending submissions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Clock History</CardTitle>
          <CardDescription>
            This is a log of all employee clock-in and clock-out events.
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : timeRecords.filter(r => r.status !== 'pending').length > 0 ? (
                  timeRecords.filter(r => r.status !== 'pending').map((record) => (
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
                        <Badge variant={getBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No historical records found.
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
