
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Ticket, Clock, Printer, Utensils, MonitorPlay, Users, Bell, Percent, SlidersHorizontal, Package, Building, CreditCard, Shield, Store, HardDrive, PlusCircle, MoreHorizontal, Edit, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSettings, type FeatureSettings, type StoreType, type PosDeviceType, type PrinterType, type ReceiptSettings, type PaymentType, type Tax } from "@/hooks/use-settings";


const settingsNav = [
  { id: "features", label: "Features", icon: SlidersHorizontal },
  { id: "stores", label: "Stores", icon: Store },
  { id: "pos_devices", label: "POS devices", icon: HardDrive },
];

const featureToggles = [
  { id: "open_tickets", label: "Open tickets", description: "Save and manage orders before payment is complete.", icon: Ticket, defaultEnabled: true },
  { id: "shifts", label: "Shifts", description: "Track cash that is put in and taken out of the drawer.", icon: Clock, defaultEnabled: true },
  { id: "time_management", label: "Time management", description: "Track employee check-in and check-out times.", icon: Users, defaultEnabled: false },
  { id: "kitchen_printers", label: "Kitchen printers", description: "Send orders to the kitchen or bar printers.", icon: Printer, defaultEnabled: true },
  { id: "dining_options", label: "Dining options", description: "Mark orders with dining options like 'Dine in' or 'Take out'.", icon: Utensils, defaultEnabled: true },
  { id: "customer_displays", label: "Customer displays", description: "Show order information to customers on a separate screen.", icon: MonitorPlay, defaultEnabled: false },
];


const EMPTY_STORE: Partial<StoreType> = { name: '', address: '' };
const EMPTY_POS_DEVICE: Partial<PosDeviceType> = { name: '', store_id: '' };

export default function SettingsPage() {
  const { 
    featureSettings, 
    stores,
    posDevices,
    setFeatureSettings,
    setStores,
    setPosDevices,
  } = useSettings();
  
  const [activeSection, setActiveSection] = useState("features");

  const [initialFeatureSettings, setInitialFeatureSettings] = useState<FeatureSettings>(featureSettings);
  const hasChanges = JSON.stringify(featureSettings) !== JSON.stringify(initialFeatureSettings);

  const { toast } = useToast();

  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<StoreType> | null>(null);
  
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<PosDeviceType> | null>(null);
  
  const handleToggle = (id: string, checked: boolean) => {
    setFeatureSettings(prev => ({ ...prev, [id]: checked }));
  };

  const handleSaveChanges = () => {
    setInitialFeatureSettings(featureSettings);
    toast({ title: "Settings Saved", description: "Your feature changes have been successfully saved." });
  };

  const handleCancelChanges = () => {
    setFeatureSettings(initialFeatureSettings);
    toast({ title: "Changes Discarded", description: "Your changes have been discarded." });
  };
  
  // Store Handlers
  const handleOpenStoreDialog = (store: Partial<StoreType> | null) => {
      setEditingStore(store ? { ...store } : EMPTY_STORE);
      setIsStoreDialogOpen(true);
  }

  const handleDeleteStore = (storeId: string) => {
      if (posDevices.some(d => d.store_id === storeId)) {
          toast({ title: "Cannot Delete Store", description: "This store has POS devices assigned to it.", variant: "destructive" });
          return;
      }
      setStores(stores.filter(s => s.id !== storeId));
      toast({ title: "Store Deleted" });
  }

  const handleStoreFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const storeData = {
          name: formData.get('name') as string,
          address: formData.get('address') as string,
      };

      if (editingStore?.id) {
          setStores(stores.map(s => s.id === editingStore.id ? { ...s, ...storeData } : s));
          toast({ title: "Store Updated" });
      } else {
          setStores([...stores, { id: `store_${new Date().getTime()}`, ...storeData }]);
          toast({ title: "Store Added" });
      }
      setIsStoreDialogOpen(false);
  }

  // POS Device Handlers
  const handleOpenDeviceDialog = (device: Partial<PosDeviceType> | null) => {
      setEditingDevice(device ? { ...device } : EMPTY_POS_DEVICE);
      setIsDeviceDialogOpen(true);
  }
  
  const handleDeleteDevice = (deviceId: string) => {
      // Add check if device is in use by a printer later
      setPosDevices(posDevices.filter(d => d.id !== deviceId));
      toast({ title: "POS Device Deleted" });
  }

  const handleDeviceFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const deviceData = {
          name: formData.get('name') as string,
          store_id: formData.get('store_id') as string,
      };

      if (editingDevice?.id) {
          setPosDevices(posDevices.map(d => d.id === editingDevice.id ? { ...d, ...deviceData } : d));
          toast({ title: "POS Device Updated" });
      } else {
          setPosDevices([...posDevices, { id: `pos_${new Date().getTime()}`, ...deviceData }]);
          toast({ title: "POS Device Added" });
      }
      setIsDeviceDialogOpen(false);
  }
  
  const getStoreName = (storeId: string) => stores.find(s => s.id === storeId)?.name || 'N/A';
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Settings"
          description="Configure the features and behavior of your POS system."
        />
        {activeSection === 'features' && hasChanges && (
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelChanges}>Cancel</Button>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <nav className="flex flex-col space-y-1">
            {settingsNav.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                    "justify-start",
                    activeSection === item.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => setActiveSection(item.id)}
              >
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="md:col-span-3">
            {activeSection === 'features' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Features</CardTitle>
                        <CardDescription>Enable or disable features to fit your business needs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {featureToggles.map((feature, index) => (
                                <div key={feature.id}>
                                <div className="flex items-center justify-between space-x-4">
                                    <div className="flex items-start space-x-4">
                                        <feature.icon className="h-6 w-6 text-muted-foreground mt-1" />
                                        <div>
                                            <p className="font-medium">{feature.label}</p>
                                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={featureSettings[feature.id] ?? false}
                                        onCheckedChange={(checked) => handleToggle(feature.id, checked)}
                                    />
                                </div>
                                {index < featureToggles.length - 1 && <Separator className="mt-4" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeSection === 'stores' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Stores</CardTitle>
                        <CardDescription>Manage your physical store locations.</CardDescription>
                        <Button className="absolute top-6 right-6" onClick={() => handleOpenStoreDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Store
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store Name</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stores.map(store => (
                                    <TableRow key={store.id}>
                                        <TableCell className="font-medium">{store.name}</TableCell>
                                        <TableCell>{store.address}</TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenStoreDialog(store)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteStore(store.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {activeSection === 'pos_devices' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>POS Devices</CardTitle>
                        <CardDescription>Manage the devices used to make sales.</CardDescription>
                         <Button className="absolute top-6 right-6" onClick={() => handleOpenDeviceDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Device
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Device Name</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posDevices.map(device => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-medium">{device.name}</TableCell>
                                        <TableCell>{getStoreName(device.store_id)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenDeviceDialog(device)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteDevice(device.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </main>
      </div>

      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent>
            <form onSubmit={handleStoreFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingStore?.id ? 'Edit Store' : 'Add Store'}</DialogTitle>
                    <DialogDescription>Enter the details for the store.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Store Name</Label>
                        <Input id="name" name="name" defaultValue={editingStore?.name} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" defaultValue={editingStore?.address} required />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent>
            <form onSubmit={handleDeviceFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingDevice?.id ? 'Edit POS Device' : 'Add POS Device'}</DialogTitle>
                    <DialogDescription>Enter the details for the POS device.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Device Name</Label>
                        <Input id="name" name="name" defaultValue={editingDevice?.name} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="store_id">Store</Label>
                        <Select name="store_id" required defaultValue={editingDevice?.store_id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
