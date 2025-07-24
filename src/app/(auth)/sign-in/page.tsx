
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

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setLoggedInUser } = useSettings();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
        toast({ title: "Database not connected", description: "Please configure Supabase.", variant: "destructive" });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const pin = formData.get("pin") as string;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('pin', pin)
        .single();
    
    if (error || !user) {
      toast({
        title: "Invalid Credentials",
        description: "The email or PIN you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    } else {
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
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your email and PIN to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" name="pin" type="password" required maxLength={4} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
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
