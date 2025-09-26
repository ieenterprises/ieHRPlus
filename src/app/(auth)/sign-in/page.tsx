

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, User as FirebaseAuthUser } from 'firebase/auth';
import { collection, addDoc, doc, updateDoc, query, where, getDocs, writeBatch, getDoc, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import type { User, TimeRecord } from "@/lib/types";
import { format, startOfDay, endOfDay, setHours, setMinutes, setSeconds, parseISO, isToday } from "date-fns";


export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loggedInUser } = useSettings();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (!userDoc.exists()) {
        throw new Error("User profile not found in database.");
      }
      const userData = userDoc.data() as User;
      const today = startOfDay(new Date());

      // --- Auto Clock-out & Active Session Logic ---
      const activeSessionsQuery = query(
        collection(db, "timeRecords"),
        where("userId", "==", authUser.uid),
        where("status", "in", ["pending", "Clocked In"])
      );
      const activeSessionsSnapshot = await getDocs(activeSessionsQuery);
      
      let sessionForTodayExists = false;
      const batch = writeBatch(db);

      activeSessionsSnapshot.forEach(doc => {
        const record = doc.data() as TimeRecord;
        const clockInDate = parseISO(record.clockInTime);

        if (isToday(clockInDate)) {
            sessionForTodayExists = true;
        } else {
            // This is an overdue session from a previous day. Clock it out.
            let clockOutTime: Date;
            if (userData.defaultClockOutTime) {
                const [hours, minutes] = userData.defaultClockOutTime.split(':').map(Number);
                let targetDate = clockInDate;
                targetDate = setHours(targetDate, hours);
                targetDate = setMinutes(targetDate, minutes);
                targetDate = setSeconds(targetDate, 0);
                clockOutTime = targetDate;
            } else {
                clockOutTime = endOfDay(clockInDate);
            }
            batch.update(doc.ref, {
                status: 'Clocked Out',
                clockOutTime: clockOutTime.toISOString(),
            });
            toast({
              title: "Auto Clock-Out",
              description: `Your session from ${format(clockInDate, 'PPP')} was automatically closed.`,
            });
        }
      });
      
      await batch.commit();

      if (sessionForTodayExists) {
          toast({
              title: "Welcome Back!",
              description: "You already have an active session for today. Proceed to verification.",
          });
          router.push("/verify-prompt");
          return; // Stop execution to prevent new clock-in
      }
      // --- End of Logic ---


      // Now, proceed with the normal clock-in process for the new day.
      const timeRecordRef = await addDoc(collection(db, "timeRecords"), {
        userId: authUser.uid,
        userName: userData.name,
        userEmail: userData.email,
        clockInTime: new Date().toISOString(),
        clockOutTime: null,
        status: 'pending', // Start as pending for HR review
        businessId: userData.businessId,
        videoUrl: null,
      } as Omit<TimeRecord, 'id'>);
      
      sessionStorage.setItem('latestTimeRecordId', timeRecordRef.id);

      toast({
          title: "Signed In Successfully",
          description: `Please proceed to video verification.`,
      });
      
      router.push("/verify-prompt");

    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Sign-in Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // This check is for users who are already logged in and try to visit the sign-in page.
    if (loggedInUser) {
        router.push("/dashboard");
    }
  }, [loggedInUser, router]);


  return (
    <>
      <div className="relative">
        <Button variant="outline" size="sm" className="absolute -top-16 left-0" asChild>
          <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
          </Link>
        </Button>
        <Card className="w-full max-w-sm">
          <form onSubmit={handlePasswordSignIn}>
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Sign in to your business account to clock-in or manage your session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="owner@example.com" required defaultValue="owner@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={passwordVisible ? "text" : "password"} required defaultValue="password" />
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7" onClick={() => setPasswordVisible(!passwordVisible)}>
                    {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/sign-up" className="underline">
                      Sign up
                  </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
