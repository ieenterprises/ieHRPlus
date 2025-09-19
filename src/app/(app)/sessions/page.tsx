

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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { TimeRecord, User } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ActiveSession = TimeRecord & {
    user: User | undefined;
};

export default function SessionsPage() {
  const { loggedInUser, users, logout } = useSettings();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId),
      where("status", "in", ["Clocked In", "pending"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      const sessions: ActiveSession[] = records
        .map(record => ({
          ...record,
          user: users.find(u => u.id === record.userId),
        }))
        .filter(session => session.user && session.userId !== loggedInUser.id); // Exclude the currently logged-in user

      setActiveSessions(sessions.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loggedInUser?.businessId, loggedInUser?.id, users]);
  
  const handleTakeOverSessionClick = (session: ActiveSession) => {
    setSelectedSession(session);
  };

  const handleVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSession || !selectedSession.user) return;
    
    setIsVerifying(true);

    try {
        // Step 1: Sign out the current user without clocking them out
        await logout(false);
        
        // Step 2: Sign in the user whose session we are taking over
        await signInWithEmailAndPassword(auth, selectedSession.user.email, password);

        // Step 3: On success, redirect them to their dashboard.
        // The auth state change will be picked up by the layout, and they will be logged in.
        toast({
            title: "Authentication Successful",
            description: `Welcome back, ${selectedSession.user.name}. Redirecting to your dashboard...`,
        });
        
        handleCloseDialog();
        router.push('/dashboard');
        
    } catch (error: any) {
        toast({
            title: "Authentication Failed",
            description: "The password you entered is incorrect. Please try again.",
            variant: "destructive",
        });
        // If re-authentication fails, we need to sign the original user back in or send to sign-in
        router.push('/sign-in');
    } finally {
        setIsVerifying(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedSession(null);
    setPassword("");
    setPasswordVisible(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Active Sessions"
        description="Manage sessions for users who are clocked in but not currently active on this device."
      />
      <Card>
        <CardHeader>
          <CardTitle>Clocked-In Users</CardTitle>
          <CardDescription>
            Select a user to take over their session and access their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading active sessions...
                    </TableCell>
                  </TableRow>
                ) : activeSessions.length > 0 ? (
                  activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={session.user?.avatar_url || ''} alt={session.user?.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{session.user?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div>{session.user?.name}</div>
                                <div className="text-sm text-muted-foreground">{session.user?.email}</div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.clockInTime), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(session.clockInTime), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleTakeOverSessionClick(session)}>
                            Resume Session
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No other active sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <form onSubmit={handleVerification}>
            <DialogHeader>
                <DialogTitle>Resume Session for {selectedSession?.user?.name}</DialogTitle>
                <DialogDescription>
                    To resume this session and go to the dashboard, please enter the user's password for verification.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Password for {selectedSession?.user?.email}</Label>
                     <div className="relative">
                        <Input 
                            id="password" 
                            name="password" 
                            type={passwordVisible ? "text" : "password"} 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7" onClick={() => setPasswordVisible(!passwordVisible)}>
                            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" disabled={isVerifying}>
                    {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Resume
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
