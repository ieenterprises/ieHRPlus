
"use client";

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
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setLoggedInUser } = useSettings();

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
        toast({ title: "Database not connected", description: "Please configure Supabase.", variant: "destructive" });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      toast({
        title: "Invalid Credentials",
        description: "The email or password you entered is incorrect.",
        variant: "destructive",
      });
      return;
    }
    
    // Fetch profile
    const { data: user, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    if (profileError || !user) {
      toast({
        title: "Could not find user profile",
        description: profileError?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      await supabase.auth.signOut(); // Log out the user if profile is missing
    } else {
      setLoggedInUser(user);
      toast({
        title: "Signed In",
        description: `Welcome back, ${user.name}!`,
      });
      router.push("/dashboard");
    }
  };
  
  const handlePinSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
        toast({ title: "Database not connected", variant: "destructive" });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const pin = formData.get("pin") as string;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pin)
        .single();
    
    if (error || !user) {
      toast({
        title: "Invalid PIN",
        description: "The PIN you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    } else {
      // We still need to log the user in with Supabase auth for RLS to work.
      // This flow assumes you'd have a custom auth solution or a way to get a JWT for the user.
      // For simplicity here, we'll just set the user locally, but this is NOT secure for RLS.
      // In a real app, PIN login should happen on a trusted device and maybe grant a short-lived session.
      setLoggedInUser(user);
      toast({
        title: "Signed In",
        description: `Welcome, ${user.name}!`,
      });
      router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Sign in to your business account.
          </CardDescription>
        </CardHeader>
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="pin">PIN</TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <form onSubmit={handlePasswordSignIn}>
              <CardContent className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" type="submit">Sign In</Button>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="pin">
            <form onSubmit={handlePinSignIn}>
              <CardContent className="grid gap-4 pt-4">
                 <div className="grid gap-2">
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input id="pin" name="pin" type="text" inputMode="numeric" required maxLength={4} pattern="\\d{4}" title="PIN must be 4 digits" className="text-center text-2xl tracking-[1rem]" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" type="submit">Sign In</Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
        <div className="p-6 pt-0 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="underline">
                  Sign up
              </Link>
          </div>
    </Card>
  );
}
