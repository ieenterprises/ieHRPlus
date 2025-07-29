

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
import { useSettings } from "@/hooks/use-settings";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";
import { posPermissions, backOfficePermissions } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getPermissionsForRole, roles } = useSettings();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const ownerName = formData.get("owner_name") as string;
    const password = formData.get("password") as string;

    try {
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Prepare user profile for Firestore
        const newUserProfile = {
          name: ownerName,
          email: email,
          role: 'Owner' as const,
          avatar_url: `https://placehold.co/100x100.png?text=${ownerName.charAt(0)}`,
          permissions: getPermissionsForRole('Owner'),
          created_at: new Date().toISOString(),
        };

        const batch = writeBatch(db);

        // 3. Add user profile to 'users' collection
        const userDocRef = doc(db, "users", user.uid);
        batch.set(userDocRef, newUserProfile);

        // 4. Check if roles exist, if not, create them
        const rolesCollectionRef = collection(db, "roles");
        const rolesSnapshot = await getDocs(rolesCollectionRef);
        if (rolesSnapshot.empty) {
            roles.forEach(role => {
                const roleDocRef = doc(rolesCollectionRef, role.id);
                batch.set(roleDocRef, role);
            });
        }
        
        // 5. Commit all database writes at once
        await batch.commit();
        
        toast({
            title: "Account Created",
            description: "Your business has been registered successfully. Please sign in.",
        });

        router.push("/sign-in");

    } catch (error: any) {
         toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
        });
    }
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
            <Label htmlFor="owner-name">Owner's Name</Label>
            <Input id="owner-name" name="owner_name" placeholder="John Doe" required />
          </div>
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

    