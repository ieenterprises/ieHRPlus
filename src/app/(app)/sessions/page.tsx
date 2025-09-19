
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
import { collection, onSnapshot, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { TimeRecord, User } from "@/lib/types";
import { format, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Calendar as CalendarIcon, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";

type ActiveSession = TimeRecord & {
    user: User | undefined;
};

export default function SessionsPage() {
  const { loggedInUser, users, logout } = useSettings();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const q = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId),
      where("clockInTime", ">=", start.toISOString()),
      where("clockInTime", "<=", end.toISOString()),
      orderBy("clockInTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
      const populatedSessions: ActiveSession[] = records
        .map(record => ({
          ...record,
          user: users.find(u => u.id === record.userId),
        }))
        .filter(session => session.user);

      setSessions(populatedSessions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sessions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loggedInUser?.businessId, users, selectedDate]);
  
  const handleTakeOverSessionClick = (session: ActiveSession) => {
    setSelectedSession(session);
  };

  const handleVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSession || !selectedSession.user) return;
    
    setIsVerifying(true);

    try {
        await logout(false);
        await signInWithEmailAndPassword(auth, selectedSession.user.email, password);

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
  
  const handleExportCSV = () => {
    const csvData = sessions.map(session => ({
      "Employee": session.user?.name,
      "Email": session.user?.email,
      "Clock In Time": format(new Date(session.clockInTime), "MMM d, yyyy, h:mm a"),
      "Clock Out Time": session.clockOutTime ? format(new Date(session.clockOutTime), "MMM d, yyyy, h:mm a") : "-",
      "Duration": session.clockOutTime ? formatDistanceToNow(new Date(session.clockOutTime), { addSuffix: false }) : formatDistanceToNow(new Date(session.clockInTime), { addSuffix: true }),
      "Status": session.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sessions_report_${format(selectedDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };
  
  const getStatusVariant = (status: TimeRecord['status']) => {
    if (status === 'Clocked Out' || status === 'rejected') return 'outline';
    if (status === 'pending') return 'secondary';
    return 'default';
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Active Sessions"
          description="Manage sessions for users who are clocked in but not currently active on this device."
        />
        <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={"outline"}
                className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                />
            </PopoverContent>
        </Popover>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clocked-In Users</CardTitle>
            <CardDescription>
              Select a user to access their dashboard and clock out.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sessions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Duration</TableHead>
                   <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading active sessions...
                    </TableCell>
                  </TableRow>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
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
                        {session.clockOutTime 
                            ? formatDistanceToNow(new Date(session.clockOutTime), { addSuffix: false }) // This won't be accurate, better to calculate duration
                            : formatDistanceToNow(new Date(session.clockInTime), { addSuffix: true })
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(session.status)}>{session.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTakeOverSessionClick(session)}
                            disabled={session.status === 'Clocked Out' || session.status === 'rejected' || session.userId === loggedInUser?.id}
                        >
                            Take Over Session
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No sessions found for {format(selectedDate, "PPP")}.
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
                <DialogTitle>Take Over Session for {selectedSession?.user?.name}</DialogTitle>
                <DialogDescription>
                    To access this user's dashboard and clock out, please enter their password for verification.
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
                    Verify & Access Dashboard
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
