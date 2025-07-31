
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
import { doc, writeBatch, collection, getDocs, query, where, setDoc, addDoc } from "firebase/firestore";
import { posPermissions, backOfficePermissions, AnyPermission } from "@/lib/permissions";
import { MOCK_INITIAL_ROLES } from "@/hooks/use-settings";
import { seedDatabaseWithMockData } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const ownerName = formData.get("owner_name") as string;
    const password = formData.get("password") as string;
    const businessName = formData.get("business_name") as string;

    try {
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const batch = writeBatch(db);

        // 2. Create a new business document
        const businessDocRef = doc(collection(db, "businesses"));
        batch.set(businessDocRef, { name: businessName, owner_id: user.uid, created_at: new Date().toISOString() });
        const businessId = businessDocRef.id;

        // 3. Seed initial data for this new business
        seedDatabaseWithMockData(batch, businessId, user.uid);
        
        // 4. Define all permissions for the Owner
        const ownerRolePermissions: AnyPermission[] = [
          ...Object.keys(posPermissions) as (keyof typeof posPermissions)[],
          ...Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[]
        ];

        // 5. Prepare user profile for Firestore
        const newUserProfile = {
          name: ownerName,
          email: email,
          role: 'Owner' as const,
          avatar_url: `https://placehold.co/100x100.png?text=${ownerName.charAt(0)}`,
          permissions: ownerRolePermissions,
          created_at: new Date().toISOString(),
          businessId: businessId, // Link user to the business
        };

        // 6. Add user profile to 'users' collection, using the auth UID as the document ID
        const userDocRef = doc(db, "users", user.uid);
        batch.set(userDocRef, newUserProfile);
        
        // 7. Commit all database writes at once
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
    <div className="relative">
      <Button variant="outline" size="sm" className="absolute -top-16 left-0" asChild>
        <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
        </Link>
      </Button>
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
    </div>
  );
}
