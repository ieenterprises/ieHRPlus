
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

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { users, setLoggedInUser, setSelectedStore, setSelectedDevice } = useSettings();

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string; // In demo mode, we ignore the password

    const user = users.find(u => u.email === email);

    if (!user) {
      toast({
        title: "Invalid Credentials",
        description: "The email you entered does not match any user.",
        variant: "destructive",
      });
      return;
    }
    
    setLoggedInUser(user);
    toast({
      title: "Signed In",
      description: `Welcome back, ${user.name}!`,
    });
    
    if (user.role === 'Owner' || user.role === 'Administrator') {
      router.push("/dashboard");
    } else {
      setSelectedStore(null);
      setSelectedDevice(null);
      router.push("/select-device");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handlePasswordSignIn}>
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Sign in to your business account. (Demo mode: any password works)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="owner@example.com" required defaultValue="owner@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required defaultValue="password" />
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
