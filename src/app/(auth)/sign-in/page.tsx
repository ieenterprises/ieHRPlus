
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
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loggedInUser } = useSettings();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      toast({
        title: "Signed In",
        description: `Welcome!`,
      });

      // The useSettings hook will react to the auth state change
      // and redirect appropriately after fetching the user profile.
      
    } catch (error: any) {
      toast({
        title: "Invalid Credentials",
        description: error.message,
        variant: "destructive",
      });
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
            <Button className="w-full" type="submit">Sign In</Button>
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
  );
}
