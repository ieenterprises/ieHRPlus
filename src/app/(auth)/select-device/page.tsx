
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/hooks/use-settings';
import type { StoreType, PosDeviceType } from '@/hooks/use-settings';
import { HardDrive, Store } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SelectDevicePage() {
    const router = useRouter();
    const { 
        stores, 
        posDevices, 
        setSelectedStore,
        setSelectedDevice,
        loggedInUser,
        loadingUser 
    } = useSettings();
    const [currentStoreId, setCurrentStoreId] = useState<string>('');
    const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
    const [availableDevices, setAvailableDevices] = useState<PosDeviceType[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (!loadingUser && !loggedInUser) {
            router.push('/sign-in');
        }
        if (!loadingUser && loggedInUser?.role === 'Owner') {
            router.push('/dashboard');
        }
    }, [loggedInUser, loadingUser, router]);

    useEffect(() => {
        if (currentStoreId) {
            setAvailableDevices(posDevices.filter(device => device.store_id === currentStoreId));
            setCurrentDeviceId(''); // Reset device selection when store changes
        } else {
            setAvailableDevices([]);
        }
    }, [currentStoreId, posDevices]);

    const handleConfirm = async () => {
        if (currentStoreId && currentDeviceId && loggedInUser) {
            const store = stores.find(s => s.id === currentStoreId);
            const device = posDevices.find(d => d.id === currentDeviceId);
            if(store) setSelectedStore(store);
            if(device) setSelectedDevice(device);

            // Update the active shift with store and device info
            try {
                const shiftsRef = collection(db, 'shifts');
                const q = query(shiftsRef, 
                    where('userId', '==', loggedInUser.id),
                    where('status', '==', 'active')
                );
                const activeShiftSnapshot = await getDocs(q);

                if (!activeShiftSnapshot.empty) {
                    const shiftDoc = activeShiftSnapshot.docs[0]; // Assuming only one active shift
                    await writeBatch(db).update(doc(db, 'shifts', shiftDoc.id), {
                        storeId: currentStoreId,
                        posDeviceId: currentDeviceId,
                    }).commit();
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
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">Welcome, {loggedInUser.name}!</CardTitle>
                <CardDescription>
                    Please select your store and POS device to start your session.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="store" className='flex items-center gap-2'><Store className='h-4 w-4' /> Select Store</Label>
                    <Select value={currentStoreId} onValueChange={setCurrentStoreId}>
                        <SelectTrigger id="store">
                            <SelectValue placeholder="Choose a store..." />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map((store: StoreType) => (
                                <SelectItem key={store.id} value={store.id}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="device" className='flex items-center gap-2'><HardDrive className='h-4 w-4' /> Select POS Device</Label>
                    <Select value={currentDeviceId} onValueChange={setCurrentDeviceId} disabled={!currentStoreId}>
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
                    disabled={!currentStoreId || !currentDeviceId}
                >
                    Start Selling
                </Button>
            </CardFooter>
        </Card>
    );
}
