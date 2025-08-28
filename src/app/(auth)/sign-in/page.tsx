
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, User as FirebaseAuthUser } from 'firebase/auth';
import { collection, addDoc, doc, updateDoc, query, where, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import type { User } from "@/lib/types";

// One-time fix for existing roles missing the shift permission.
const ensureShiftPermissionForOwner = async (businessId: string) => {
    try {
        const rolesQuery = query(collection(db, 'roles'), where('businessId', '==', businessId), where('name', '==', 'Owner'));
        const rolesSnapshot = await getDocs(rolesQuery);
        if (!rolesSnapshot.empty) {
            const ownerRoleDoc = rolesSnapshot.docs[0];
            const ownerRoleData = ownerRoleDoc.data();
            const permissions: string[] = ownerRoleData.permissions || [];
            
            let needsUpdate = false;
            const permissionsToAdd = ['VIEW_SHIFT_REPORT', 'MANAGE_SHIFTS'];

            permissionsToAdd.forEach(p => {
              if (!permissions.includes(p)) {
                permissions.push(p);
                needsUpdate = true;
              }
            });

            if (needsUpdate) {
                await updateDoc(ownerRoleDoc.ref, { permissions: permissions });
                console.log("Applied one-time permission fix for Owner role.");
            }
        }
    } catch (error) {
        console.error("Failed to apply one-time permission fix:", error);
    }
};


export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loggedInUser } = useSettings();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showActiveSessionDialog, setShowActiveSessionDialog] = useState(false);
  const [sessionData, setSessionData] = useState<{ authUser: FirebaseAuthUser, userProfile: User } | null>(null);


  const proceedWithSignIn = async (authUser: FirebaseAuthUser, userProfile: User, forceClose: boolean = false) => {
    setIsLoading(true);
    try {
        const { uid: userId, email } = authUser;
        const { businessId, role } = userProfile;

        if (!businessId) throw new Error("Business ID not found for this user.");
        if (role === 'Owner') await ensureShiftPermissionForOwner(businessId);

        const shiftsCollection = collection(db, 'shifts');
        const q = query(shiftsCollection, where('userId', '==', userId), where('status', '==', 'active'));
        const activeShiftsSnapshot = await getDocs(q);

        if (!activeShiftsSnapshot.empty && !forceClose) {
            setSessionData({ authUser, userProfile });
            setShowActiveSessionDialog(true);
            setIsLoading(false);
            return;
        }

        const batch = writeBatch(db);

        // Close any previously active shifts for this user if forcing
        if (forceClose) {
            activeShiftsSnapshot.forEach((shiftDoc) => {
                batch.update(doc(db, 'shifts', shiftDoc.id), { status: 'closed', endTime: new Date().toISOString() });
            });
        }
        
        // Create new active shift
        const shiftDocRef = doc(shiftsCollection);
        batch.set(shiftDocRef, {
            userId: userId,
            startTime: new Date().toISOString(),
            endTime: null,
            status: 'active',
            businessId: businessId, 
        });
      
        await batch.commit();

        toast({
            title: "Signed In",
            description: `Welcome! Your shift has started.`,
        });

        // The useSettings hook will react to the auth state change
    } catch (error: any) {
        toast({
            title: "Sign-in Error",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
        setShowActiveSessionDialog(false);
    }
  };

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authUser = userCredential.user;
      
      const userDocRef = doc(db, "users", authUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User profile not found in the database.");
      }
      const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
      
      await proceedWithSignIn(authUser, userProfile);

    } catch (error: any) {
      toast({
        title: "Invalid Credentials",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForceSignIn = () => {
    if (sessionData) {
        proceedWithSignIn(sessionData.authUser, sessionData.userProfile, true);
    }
  };


  // This effect handles the redirection after the user is set in the context
  useEffect(() => {
    if (loggedInUser) {
        if (loggedInUser.role === 'Owner' || loggedInUser.role === 'Administrator' || loggedInUser.role === 'Manager') {
            router.push("/dashboard");
        } else {
            router.push("/select-device");
        }
    }
  }, [loggedInUser, router]);


  return (
    <>
      <AlertDialog open={showActiveSessionDialog} onOpenChange={setShowActiveSessionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Active Session Found</AlertDialogTitle>
            <AlertDialogDescription>
              You are already signed in on another device or browser. Signing in here will end your other session. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceSignIn}>Continue & Sign In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                Sign in to your business account.
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
