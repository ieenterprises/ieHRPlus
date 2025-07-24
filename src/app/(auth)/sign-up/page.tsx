
"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
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

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!supabase) {
        toast({ title: "Database not connected", description: "Please configure Supabase.", variant: "destructive" });
        return;
    }

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string).toLowerCase();
    
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        toast({
            title: "Email already exists",
            description: "An account with this email is already registered.",
            variant: "destructive",
        });
        return;
    }

    const newUser = {
        name: formData.get("owner_name") as string,
        email: email,
        pin: formData.get("pin") as string,
        role: "Owner",
        permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)], 
        avatar_url: "https://placehold.co/100x100.png",
    };
    
    const { error: insertError } = await supabase.from('users').insert(newUser);

    if (insertError) {
        toast({
            title: "Error creating account",
            description: insertError.message,
            variant: "destructive",
        });
        return;
    }
    
    toast({
        title: "Account Created",
        description: "Your business has been registered successfully. Please sign in.",
    });

    router.push("/sign-in");
  };

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl">Register Your Business</CardTitle>
          <CardDescription>
            Create your owner account to get started with the POS system.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input id="business-name" name="business_name" placeholder="Acme Inc." required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="owner-name">Owner&apos;s Name</Label>
            <Input id="owner-name" name="owner_name" placeholder="John Doe" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pin">4-Digit PIN</Label>
            <Input id="pin" name="pin" type="password" required maxLength={4} pattern="\\d{4}" title="PIN must be 4 digits" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">Sign Up</Button>
           <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/sign-in" className="underline">
                  Sign in
              </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
