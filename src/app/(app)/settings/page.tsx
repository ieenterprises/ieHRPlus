
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
  { id: "printers", label: "Printers", icon: Printer },
  { id: "receipts", label: "Receipts", icon: Utensils },
  { id: "payment_types", label: "Payment types", icon: CreditCard },
  { id: "taxes", label: "Taxes", icon: Percent },
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
const EMPTY_PRINTER: Partial<PrinterType> = { name: '', connection_type: 'Network', ip_address: '', pos_device_id: '' };
const EMPTY_PAYMENT_TYPE: Partial<PaymentType> = { name: '', type: 'Other' };
const EMPTY_TAX: Partial<Tax> = { name: '', rate: 0, is_default: false, type: 'Added' };

export default function SettingsPage() {
  const { 
    featureSettings, 
    stores,
    posDevices,
    printers,
    receiptSettings,
    paymentTypes,
    taxes,
    setFeatureSettings,
    setStores,
    setPosDevices,
    setPrinters,
    setReceiptSettings,
    setPaymentTypes,
    setTaxes
  } = useSettings();
  
  const [activeSection, setActiveSection] = useState("features");

  const [initialFeatureSettings, setInitialFeatureSettings] = useState<FeatureSettings>(featureSettings);
  const hasChanges = JSON.stringify(featureSettings) !== JSON.stringify(initialFeatureSettings);

  const { toast } = useToast();

  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<StoreType> | null>(null);
  
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<PosDeviceType> | null>(null);
  
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Partial<PrinterType> | null>(null);

  const [isPaymentTypeDialogOpen, setIsPaymentTypeDialogOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<Partial<PaymentType> | null>(null);

  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Partial<Tax> | null>(null);

  const [selectedStoreForReceipts, setSelectedStoreForReceipts] = useState<string>(stores[0]?.id || '');
  const [currentReceiptSettingsDraft, setCurrentReceiptSettingsDraft] = useState<ReceiptSettings | null>(receiptSettings[selectedStoreForReceipts] || null);
  
  const currentReceiptSettings = receiptSettings[selectedStoreForReceipts];
  const hasReceiptChanges = JSON.stringify(currentReceiptSettingsDraft) !== JSON.stringify(currentReceiptSettings);

  useEffect(() => {
    if (selectedStoreForReceipts && receiptSettings[selectedStoreForReceipts]) {
      setCurrentReceiptSettingsDraft(receiptSettings[selectedStoreForReceipts]);
    }
  }, [selectedStoreForReceipts, receiptSettings]);


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
      if (printers.some(p => p.pos_device_id === deviceId)) {
          toast({ title: "Cannot Delete POS Device", description: "This device has printers assigned to it.", variant: "destructive" });
          return;
      }
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
  
  const getDeviceName = (deviceId: string) => posDevices.find(d => d.id === deviceId)?.name || 'N/A';

  // Printer Handlers
  const handleOpenPrinterDialog = (printer: Partial<PrinterType> | null) => {
    setEditingPrinter(printer ? { ...printer } : EMPTY_PRINTER);
    setIsPrinterDialogOpen(true);
  }

  const handleDeletePrinter = (printerId: string) => {
    setPrinters(printers.filter(p => p.id !== printerId));
    toast({ title: "Printer Deleted" });
  }

  const handlePrinterFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const printerData = {
        name: formData.get('name') as string,
        connection_type: formData.get('connection_type') as PrinterType['connection_type'],
        ip_address: formData.get('ip_address') as string,
        pos_device_id: formData.get('pos_device_id') as string,
    };

    if (editingPrinter?.id) {
        setPrinters(printers.map(p => p.id === editingPrinter.id ? { ...p, ...printerData } : p));
        toast({ title: "Printer Updated" });
    } else {
        setPrinters([...printers, { id: `printer_${new Date().getTime()}`, ...printerData }]);
        toast({ title: "Printer Added" });
    }
    setIsPrinterDialogOpen(false);
  }
  
  // Receipt Settings Handlers
  const handleReceiptSettingChange = <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    setCurrentReceiptSettingsDraft(prev => (prev ? { ...prev, [key]: value } : null));
  }

  const handleLogoUpload = (type: 'emailedLogo' | 'printedLogo', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            handleReceiptSettingChange(type, reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  const handleSaveReceiptSettings = () => {
    if (currentReceiptSettingsDraft) {
        setReceiptSettings(prev => ({
            ...prev,
            [selectedStoreForReceipts]: currentReceiptSettingsDraft,
        }));
        toast({ title: "Receipt Settings Saved", description: `Settings for ${getStoreName(selectedStoreForReceipts)} have been updated.` });
    }
  }

  const handleCancelReceiptSettings = () => {
    setCurrentReceiptSettingsDraft(currentReceiptSettings);
  }
  
  // Payment Type Handlers
    const handleOpenPaymentTypeDialog = (paymentType: Partial<PaymentType> | null) => {
        setEditingPaymentType(paymentType ? { ...paymentType } : EMPTY_PAYMENT_TYPE);
        setIsPaymentTypeDialogOpen(true);
    }

    const handleDeletePaymentType = (id: string) => {
        setPaymentTypes(paymentTypes.filter(pt => pt.id !== id));
        toast({ title: "Payment Type Deleted" });
    }

    const handlePaymentTypeFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            type: formData.get('type') as PaymentType['type'],
        };

        if (editingPaymentType?.id) {
            setPaymentTypes(paymentTypes.map(pt => pt.id === editingPaymentType.id ? { ...pt, ...data } : pt));
            toast({ title: "Payment Type Updated" });
        } else {
            setPaymentTypes([...paymentTypes, { id: `pay_${new Date().getTime()}`, ...data }]);
            toast({ title: "Payment Type Added" });
        }
        setIsPaymentTypeDialogOpen(false);
    }

    // Tax Handlers
    const handleOpenTaxDialog = (tax: Partial<Tax> | null) => {
        setEditingTax(tax ? { ...tax } : EMPTY_TAX);
        setIsTaxDialogOpen(true);
    }

    const handleDeleteTax = (id: string) => {
        setTaxes(taxes.filter(t => t.id !== id));
        toast({ title: "Tax Deleted" });
    }

    const handleTaxFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            rate: parseFloat(formData.get('rate') as string),
            type: formData.get('type') as Tax['type'],
            is_default: (formData.get('is_default') as string) === 'on',
        };

        if (editingTax?.id) {
            setTaxes(taxes.map(t => t.id === editingTax.id ? { ...t, ...data } : t));
            toast({ title: "Tax Updated" });
        } else {
            setTaxes([...taxes, { id: `tax_${new Date().getTime()}`, ...data }]);
            toast({ title: "Tax Added" });
        }
        setIsTaxDialogOpen(false);
    }


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
            
            {activeSection === 'printers' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Printers</CardTitle>
                        <CardDescription>Manage your receipt and kitchen printers.</CardDescription>
                         <Button className="absolute top-6 right-6" onClick={() => handleOpenPrinterDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Printer
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Printer Name</TableHead>
                                    <TableHead>Connection</TableHead>
                                    <TableHead>POS Device</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {printers.map(printer => (
                                    <TableRow key={printer.id}>
                                        <TableCell className="font-medium">{printer.name}</TableCell>
                                        <TableCell>{printer.connection_type}{printer.connection_type === 'Network' && `: ${printer.ip_address}`}</TableCell>
                                        <TableCell>{getDeviceName(printer.pos_device_id)}</TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleOpenPrinterDialog(printer)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeletePrinter(printer.id)}>
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
            
            {activeSection === 'receipts' && currentReceiptSettingsDraft && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Receipt settings</CardTitle>
                        <div className="absolute top-6 right-6 w-48">
                            <Label>Store</Label>
                            <Select value={selectedStoreForReceipts} onValueChange={setSelectedStoreForReceipts}>
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
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label className="text-lg">Logo</Label>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Emailed receipt</Label>
                                    <div className="w-40 h-40 border rounded-md flex items-center justify-center relative group bg-muted/20">
                                        {currentReceiptSettingsDraft.emailedLogo ? (
                                             <>
                                                <Image src={currentReceiptSettingsDraft.emailedLogo} alt="Emailed Logo" layout="fill" className="object-contain p-2" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="sm" onClick={() => (document.getElementById('emailedLogoInput') as HTMLInputElement).click()}>Change</Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Button variant="outline" onClick={() => (document.getElementById('emailedLogoInput') as HTMLInputElement).click()}>Upload</Button>
                                        )}
                                        <input type="file" id="emailedLogoInput" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('emailedLogo', e)} />
                                    </div>
                                </div>
                                 <div className="space-y-2">
                                    <Label className="text-muted-foreground">Printed receipt</Label>
                                    <div className="w-40 h-40 border rounded-md flex items-center justify-center relative group bg-muted/20">
                                        {currentReceiptSettingsDraft.printedLogo ? (
                                            <>
                                                <Image src={currentReceiptSettingsDraft.printedLogo} alt="Printed Logo" layout="fill" className="object-contain p-2" />
                                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleReceiptSettingChange('printedLogo', null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="sm" onClick={() => (document.getElementById('printedLogoInput') as HTMLInputElement).click()}>Change</Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Button variant="outline" onClick={() => (document.getElementById('printedLogoInput') as HTMLInputElement).click()}>Upload</Button>
                                        )}
                                        <input type="file" id="printedLogoInput" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('printedLogo', e)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-2">
                            <Label htmlFor="receipt-header">Header</Label>
                            <Textarea 
                                id="receipt-header" 
                                value={currentReceiptSettingsDraft.header} 
                                onChange={(e) => handleReceiptSettingChange('header', e.target.value)} 
                                maxLength={500} 
                                className="min-h-[60px]"
                            />
                            <p className="text-sm text-muted-foreground text-right">{currentReceiptSettingsDraft.header.length} / 500</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="receipt-footer">Footer</Label>
                            <Textarea 
                                id="receipt-footer" 
                                value={currentReceiptSettingsDraft.footer} 
                                onChange={(e) => handleReceiptSettingChange('footer', e.target.value)} 
                                maxLength={500}
                                className="min-h-[60px]" 
                            />
                            <p className="text-sm text-muted-foreground text-right">{currentReceiptSettingsDraft.footer.length} / 500</p>
                        </div>
                        
                        <Separator />

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                                <Label htmlFor="show-customer-info">Show customer info</Label>
                                <Switch id="show-customer-info" checked={currentReceiptSettingsDraft.showCustomerInfo} onCheckedChange={(c) => handleReceiptSettingChange('showCustomerInfo', c)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="show-comments">Show comments</Label>
                                <Switch id="show-comments" checked={currentReceiptSettingsDraft.showComments} onCheckedChange={(c) => handleReceiptSettingChange('showComments', c)} />
                            </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="w-1/2">
                            <Label htmlFor="receipt-language">Receipt language</Label>
                            <Select value={currentReceiptSettingsDraft.language} onValueChange={(v) => handleReceiptSettingChange('language', v)}>
                                <SelectTrigger id="receipt-language">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                    <SelectItem value="French">French</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasReceiptChanges && (
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={handleCancelReceiptSettings}>Cancel</Button>
                                <Button onClick={handleSaveReceiptSettings}>Save</Button>
                            </div>
                        )}

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

            {activeSection === 'payment_types' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Types</CardTitle>
                        <CardDescription>Manage the payment methods accepted at your stores.</CardDescription>
                         <Button className="absolute top-6 right-6" onClick={() => handleOpenPaymentTypeDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Payment Type
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentTypes.map(pt => (
                                    <TableRow key={pt.id}>
                                        <TableCell className="font-medium">{pt.name}</TableCell>
                                        <TableCell><Badge variant="outline">{pt.type}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenPaymentTypeDialog(pt)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeletePaymentType(pt.id)}>
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

            {activeSection === 'taxes' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Taxes</CardTitle>
                        <CardDescription>Manage tax rates for your items and services.</CardDescription>
                         <Button className="absolute top-6 right-6" onClick={() => handleOpenTaxDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Tax
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {taxes.map(tax => (
                                    <TableRow key={tax.id}>
                                        <TableCell className="font-medium">{tax.name}</TableCell>
                                        <TableCell>{tax.rate}%</TableCell>
                                        <TableCell><Badge variant="outline">{tax.type}</Badge></TableCell>
                                        <TableCell>
                                            {tax.is_default && <Badge>Default</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleOpenTaxDialog(tax)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteTax(tax.id)}>
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

      <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent>
            <form onSubmit={handlePrinterFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingPrinter?.id ? 'Edit Printer' : 'Add Printer'}</DialogTitle>
                    <DialogDescription>Enter the details for the printer.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Printer Name</Label>
                        <Input id="name" name="name" defaultValue={editingPrinter?.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="connection_type">Connection Type</Label>
                        <Select name="connection_type" required defaultValue={editingPrinter?.connection_type} onValueChange={(value) => setEditingPrinter(p => ({...p, connection_type: value as any}))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a connection type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Network">Network (Ethernet)</SelectItem>
                                <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                                <SelectItem value="Cable">Cable (USB)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {editingPrinter?.connection_type === 'Network' && (
                        <div className="space-y-2">
                            <Label htmlFor="ip_address">IP Address</Label>
                            <Input id="ip_address" name="ip_address" defaultValue={editingPrinter?.ip_address ?? ''} placeholder="e.g., 192.168.1.100" required />
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="pos_device_id">POS Device</Label>
                        <Select name="pos_device_id" required defaultValue={editingPrinter?.pos_device_id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a POS device" />
                            </SelectTrigger>
                            <SelectContent>
                                {posDevices.map(device => (
                                    <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
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
      
      <Dialog open={isPaymentTypeDialogOpen} onOpenChange={setIsPaymentTypeDialogOpen}>
        <DialogContent>
            <form onSubmit={handlePaymentTypeFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingPaymentType?.id ? 'Edit Payment Type' : 'Add Payment Type'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={editingPaymentType?.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" required defaultValue={editingPaymentType?.type}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                                <SelectItem value="Credit">Credit</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
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
      
      <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
        <DialogContent>
            <form onSubmit={handleTaxFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingTax?.id ? 'Edit Tax' : 'Add Tax'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Tax Name</Label>
                        <Input id="name" name="name" defaultValue={editingTax?.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rate">Tax Rate (%)</Label>
                        <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTax?.rate} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Tax Type</Label>
                        <Select name="type" required defaultValue={editingTax?.type}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Added">Added to price</SelectItem>
                                <SelectItem value="Included">Included in price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="is_default" name="is_default" defaultChecked={editingTax?.is_default} />
                        <Label htmlFor="is_default">Apply tax by default</Label>
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
