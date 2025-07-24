
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
import { posPermissions, backOfficePermissions } from "@/lib/permissions";

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
        description: authError?.message || "The email or password you entered is incorrect.",
        variant: "destructive",
      });
      return;
    }
    
    // Fetch profile
    let { data: user, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    // If profile doesn't exist, create it. This handles cases where the trigger might have failed.
    if (profileError && profileError.code === 'PGRST116') { // PGRST116 is the code for "no rows returned"
      console.log("User profile not found, creating one...");
      const userEmail = authData.user.email;
      const userName = authData.user.user_metadata.name || userEmail?.split('@')[0] || 'New User';
      const userRole = authData.user.user_metadata.role || 'Owner'; // Default to Owner if not set
      
      const { data: newUserProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: userName,
          email: userEmail!,
          role: userRole,
          permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)],
          avatar_url: authData.user.user_metadata.avatar_url || `https://placehold.co/100x100.png?text=${userName.charAt(0)}`
        })
        .select()
        .single();

      if (createError) {
         toast({
          title: "Could not create user profile",
          description: createError.message,
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }
      user = newUserProfile;
    } else if (profileError) {
       toast({
        title: "Could not find user profile",
        description: profileError.message,
        variant: "destructive",
      });
      await supabase.auth.signOut();
      return;
    }
    
    if (user) {
      setLoggedInUser(user);
      toast({
        title: "Signed In",
        description: `Welcome back, ${user.name}!`,
      });
      router.push("/dashboard");
    }
  };

  return (
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
            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
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
  );
}
