

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/use-settings';
import type { BranchType, PosDeviceType } from '@/hooks/use-settings';
import { HardDrive, Store, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SelectDevicePage() {
    const router = useRouter();
    const { 
        branches, 
        posDevices, 
        setSelectedBranch,
        setSelectedDevice,
        loggedInUser,
        loadingUser,
        validateAndUseAccessCode,
        logout,
    } = useSettings();
    const [currentBranchId, setCurrentBranchId] = useState<string>('');
    const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
    const [enteredPin, setEnteredPin] = useState('');
    const [isPinCorrect, setIsPinCorrect] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [availableDevices, setAvailableDevices] = useState<PosDeviceType[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (!loadingUser && !loggedInUser) {
            router.push('/sign-in');
        }
        if (!loadingUser && loggedInUser?.department === 'Owner') {
            router.push('/dashboard');
        }
    }, [loggedInUser, loadingUser, router]);

    useEffect(() => {
        if (currentBranchId) {
            // Filter devices for the selected branch that are not in use
            setAvailableDevices(posDevices.filter(device => device.branch_id === currentBranchId && !device.in_use_by_shift_id));
            setCurrentDeviceId(''); // Reset device selection when branch changes
        } else {
            setAvailableDevices([]);
        }
    }, [currentBranchId, posDevices]);
    
    const verifyPin = useCallback(async () => {
      if (enteredPin.length !== 4) {
        setIsPinCorrect(false);
        return;
      }

      setIsVerifying(true);
      const isValid = await validateAndUseAccessCode(enteredPin);
      if (isValid) {
        setIsPinCorrect(true);
        toast({ title: "Code Accepted", description: "You can now select your device." });
      } else {
        setIsPinCorrect(false);
        toast({ title: "Invalid Code", description: "The code you entered is incorrect, expired, or already used.", variant: "destructive" });
      }
      setIsVerifying(false);
    }, [enteredPin, validateAndUseAccessCode, toast]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (enteredPin.length === 4 && !isPinCorrect) {
                verifyPin();
            }
        }, 500); // Debounce the verification call

        return () => clearTimeout(timer);
    }, [enteredPin, isPinCorrect, verifyPin]);

    const handleConfirm = async () => {
        if (currentBranchId && currentDeviceId && loggedInUser && isPinCorrect) {
            const branch = branches.find(s => s.id === currentBranchId);
            const device = posDevices.find(d => d.id === currentDeviceId);
            if(branch) setSelectedBranch(branch);
            if(device) setSelectedDevice(device);

            // Update the active shift with branch and device info
            try {
                const shiftsRef = collection(db, 'shifts');
                const q = query(shiftsRef, 
                    where('userId', '==', loggedInUser.id),
                    where('status', '==', 'active')
                );
                const activeShiftSnapshot = await getDocs(q);

                if (!activeShiftSnapshot.empty) {
                    const shiftDoc = activeShiftSnapshot.docs[0];
                    const batch = writeBatch(db);
                    
                    // Update shift with device info
                    batch.update(doc(db, 'shifts', shiftDoc.id), {
                        branchId: currentBranchId,
                        posDeviceId: currentDeviceId,
                    });

                    // Mark device as in-use
                    const deviceRef = doc(db, 'pos_devices', currentDeviceId);
                    batch.update(deviceRef, { in_use_by_shift_id: shiftDoc.id });

                    await batch.commit();
                }
            } catch (error) {
                console.error("Failed to update shift with device info:", error);
                toast({
                    title: "Session Error",
                    description: "Could not save session details. Please try again.",
                    variant: "destructive"
                });
                return;
            }

            router.push('/sales');
        }
    };
    
    if (loadingUser || !loggedInUser) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="relative">
            <Button variant="ghost" size="sm" className="absolute -top-16 -left-4" onClick={() => logout()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome, {loggedInUser.name}!</CardTitle>
                    <CardDescription>
                        Please enter the one-time access code from your manager and select your device to start.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="pin" className='flex items-center gap-2'><KeyRound className='h-4 w-4' /> One-Time Access Code</Label>
                        <div className="relative">
                            <Input 
                                id="pin" 
                                type="password" 
                                maxLength={4} 
                                value={enteredPin}
                                onChange={(e) => setEnteredPin(e.target.value.trim())}
                                placeholder="••••"
                                className="font-mono tracking-widest text-lg text-center"
                                disabled={isPinCorrect}
                            />
                            {isVerifying && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="branch" className='flex items-center gap-2'><Store className='h-4 w-4' /> Select Branch</Label>
                        <Select value={currentBranchId} onValueChange={setCurrentBranchId} disabled={!isPinCorrect}>
                            <SelectTrigger id="branch">
                                <SelectValue placeholder="Choose a branch..." />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch: BranchType) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="device" className='flex items-center gap-2'><HardDrive className='h-4 w-4' /> Select POS Device</Label>
                        <Select value={currentDeviceId} onValueChange={setCurrentDeviceId} disabled={!currentBranchId || !isPinCorrect}>
                            <SelectTrigger id="device">
                                <SelectValue placeholder="Choose a device..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDevices.map((device: PosDeviceType) => (
                                    <SelectItem key={device.id} value={device.id}>
                                        {device.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={handleConfirm} 
                        disabled={!currentBranchId || !currentDeviceId || !isPinCorrect}
                    >
                        Start Selling
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
