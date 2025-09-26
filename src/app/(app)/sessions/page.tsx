
"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/hooks/use-settings";
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { TimeRecord, User } from "@/lib/types";
import { format, formatDistanceToNow, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Calendar as CalendarIcon, Download, Trash2, Search, LogOut as LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "react-day-picker";

type ActiveSession = TimeRecord & {
    user: User | undefined;
};

const seniorRoles = ["Owner", "Administrator", "Manager"];

export default function SessionsPage() {
  const { loggedInUser, users, logout } = useSettings();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const isSeniorStaff = useMemo(() => loggedInUser && seniorRoles.includes(loggedInUser.role), [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser?.businessId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const q = query(
      collection(db, "timeRecords"),
      where("businessId", "==", loggedInUser.businessId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));

      const start = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(new Date());
      const end = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      
      const filteredRecords = allRecords.filter(record => {
        const clockInDate = new Date(record.clockInTime);
        return isWithinInterval(clockInDate, { start, end });
      });

      filteredRecords.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
      
      const populatedSessions: ActiveSession[] = filteredRecords
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
  }, [loggedInUser?.businessId, dateRange, users]);

  useEffect(() => {
      setSelectedRecordIds([]);
  }, [dateRange, sessions]);
  
  const filteredSessions = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return sessions.filter(session => 
      session.user?.name.toLowerCase().includes(lowercasedTerm) ||
      session.user?.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [sessions, searchTerm]);

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
  
  const handleClockOut = async (session: ActiveSession) => {
    if (!session || !session.id) return;

    try {
        const sessionRef = doc(db, 'timeRecords', session.id);
        await updateDoc(sessionRef, {
            status: 'Clocked Out',
            clockOutTime: new Date().toISOString()
        });
        toast({
            title: "User Clocked Out",
            description: `${session.user?.name || 'The user'} has been clocked out successfully.`
        });
    } catch (error: any) {
        toast({
            title: "Clock Out Failed",
            description: error.message,
            variant: "destructive"
        });
    }
  };


  const handleCloseDialog = () => {
    setSelectedSession(null);
    setPassword("");
    setPasswordVisible(false);
  }
  
  const handleExportCSV = () => {
    const csvData = filteredSessions.map(session => ({
      "Employee": session.user?.name,
      "Email": session.user?.email,
      "Clock In Time": format(new Date(session.clockInTime), "MMM d, yyyy, h:mm a"),
      "Clock Out Time": session.clockOutTime ? format(new Date(session.clockOutTime), "MMM d, yyyy, h:mm a") : "-",
      "Status": session.status,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const datePart = dateRange?.from 
        ? dateRange.to 
            ? `${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}` 
            : format(dateRange.from, 'yyyy-MM-dd')
        : 'all_time';

    link.setAttribute("download", `sessions_report_${datePart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };
  
  const handleDeleteSelected = async () => {
    const batch = writeBatch(db);
    selectedRecordIds.forEach(id => {
        batch.delete(doc(db, "timeRecords", id));
    });

    try {
        await batch.commit();
        toast({
            title: `${selectedRecordIds.length} Session(s) Deleted`,
            description: "The selected sessions have been permanently removed.",
        });
        setSelectedRecordIds([]);
    } catch (error: any) {
         toast({
            title: "Deletion Failed",
            description: error.message,
            variant: "destructive"
        });
    }
  };

  const handleSelectAll = (checked: boolean) => {
      setSelectedRecordIds(checked ? filteredSessions.map(s => s.id) : []);
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    setSelectedRecordIds(prev => 
        checked ? [...prev, id] : prev.filter(pId => pId !== id)
    );
  };
  
  const DatePicker = () => (
     <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Active Sessions"
          description="Manage sessions for users who are clocked in but not currently active on this device."
        />
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Clocked-In Users</CardTitle>
            <CardDescription>
              Select a user to access their dashboard and clock out.
            </CardDescription>
          </div>
          {isSeniorStaff && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search by name or email..."
                          className="pl-9 w-full"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                <DatePicker />
                {selectedRecordIds.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ({selectedRecordIds.length})
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected sessions. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredSessions.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSeniorStaff && (
                    <TableHead padding="checkbox">
                        <Checkbox
                            checked={filteredSessions.length > 0 && selectedRecordIds.length === filteredSessions.length}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            aria-label="Select all sessions"
                        />
                    </TableHead>
                  )}
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead>Clock Out Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isSeniorStaff ? 5 : 4} className="h-24 text-center">
                      Loading active sessions...
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id} data-state={selectedRecordIds.includes(session.id) && "selected"}>
                      {isSeniorStaff && (
                          <TableCell padding="checkbox">
                              <Checkbox
                                  checked={selectedRecordIds.includes(session.id)}
                                  onCheckedChange={(checked) => handleSelectRecord(session.id, !!checked)}
                                  aria-label="Select session"
                              />
                          </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={session.user?.avatar_url || ''} alt={session.user?.name} data-ai-hint="person portrait" />
                                <AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
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
                            ? format(new Date(session.clockOutTime), "MMM d, h:mm a")
                            : <Badge variant="secondary">Active</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {isSeniorStaff && session.status !== 'Clocked Out' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={session.userId === loggedInUser?.id}>
                                        <LogOutIcon className="mr-2 h-4 w-4" /> Clock Out
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will manually clock out {session.user?.name}. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleClockOut(session)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Confirm Clock Out
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
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
                    <TableCell colSpan={isSeniorStaff ? 5 : 4} className="h-24 text-center">
                      No sessions found for the selected date range.
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

    
