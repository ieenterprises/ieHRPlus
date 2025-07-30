
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Ticket, Clock, Printer, Utensils, MonitorPlay, Users, Percent, SlidersHorizontal, Store, HardDrive, PlusCircle, MoreHorizontal, Edit, Trash2, Receipt, CalendarCheck, CreditCard } from "lucide-react";
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
  { id: "printers", label: "Printers", icon: Printer },
  { id: "receipt", label: "Receipt", icon: Receipt },
  { id: "taxes", label: "Taxes & Currency", icon: Percent },
  { id: "payment_types", label: "Payment Types", icon: CreditCard },
];

const featureToggles = [
  { id: "open_tickets", label: "Open tickets", description: "Save and manage orders before payment is complete.", icon: Ticket, defaultEnabled: true },
  { id: "reservations", label: "Reservations", description: "Enable room booking and reservation management.", icon: CalendarCheck, defaultEnabled: true },
  { id: "shifts", label: "Shifts", description: "Track cash that is put in and taken out of the drawer.", icon: Clock, defaultEnabled: true },
  { id: "time_management", label: "Time management", description: "Track employee check-in and check-out times.", icon: Users, defaultEnabled: false },
  { id: "kitchen_printers", label: "Kitchen printers", description: "Send orders to the kitchen or bar printers.", icon: Printer, defaultEnabled: true },
  { id: "dining_options", label: "Dining options", description: "Mark orders with dining options like 'Dine in' or 'Take out'.", icon: Utensils, defaultEnabled: true },
  { id: "customer_displays", label: "Customer displays", description: "Show order information to customers on a separate screen.", icon: MonitorPlay, defaultEnabled: false },
];

const currencies = [
    { value: '$', label: 'USD ($) - United States Dollar' },
    { value: '€', label: 'EUR (€) - Euro' },
    { value: '£', label: 'GBP (£) - British Pound Sterling' },
    { value: '¥', label: 'JPY (¥) - Japanese Yen' },
    { value: 'A$', label: 'AUD (A$) - Australian Dollar' },
    { value: 'C$', label: 'CAD (C$) - Canadian Dollar' },
    { value: 'Fr', label: 'CHF (Fr) - Swiss Franc' },
    { value: '元', label: 'CNY (元) - Chinese Yuan' },
    { value: 'kr', label: 'SEK (kr) - Swedish Krona' },
    { value: 'NZ$', label: 'NZD (NZ$) - New Zealand Dollar' },
    { value: '₦', label: 'NGN (₦) - Nigerian Naira' },
];

const EMPTY_STORE: Partial<StoreType> = { name: '', address: '' };
const EMPTY_POS_DEVICE: Partial<PosDeviceType> = { name: '', store_id: '' };
const EMPTY_PRINTER: Partial<PrinterType> = { name: '', connection_type: 'Network', pos_device_id: ''};
const EMPTY_TAX: Partial<Tax> = { name: '', rate: 0, type: 'Added', is_default: false };
const EMPTY_PAYMENT_TYPE: Partial<PaymentType> = { name: '', type: 'Other' };

export default function SettingsPage() {
  const { 
    featureSettings, 
    stores,
    posDevices,
    printers,
    receiptSettings,
    taxes,
    currency,
    paymentTypes,
    setFeatureSettings,
    addStore,
    updateStore,
    deleteStore,
    addPosDevice,
    updatePosDevice,
    deletePosDevice,
    addPrinter,
    updatePrinter,
    deletePrinter,
    setReceiptSettings,
    addTax,
    updateTax,
    deleteTax,
    setCurrency,
    addPaymentType,
    updatePaymentType,
    deletePaymentType,
  } = useSettings();
  
  const [activeSection, setActiveSection] = useState("features");
  
  const { toast } = useToast();

  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<StoreType> | null>(null);
  
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<PosDeviceType> | null>(null);

  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Partial<PrinterType> | null>(null);

  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Partial<Tax> | null>(null);

  const [isPaymentTypeDialogOpen, setIsPaymentTypeDialogOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<Partial<PaymentType> | null>(null);

  const [selectedStoreForReceipt, setSelectedStoreForReceipt] = useState<string>(stores[0]?.id || '');

  const emailedLogoInputRef = useRef<HTMLInputElement>(null);
  const printedLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedStoreForReceipt && stores.length > 0) {
      setSelectedStoreForReceipt(stores[0].id);
    }
  }, [stores, selectedStoreForReceipt]);
  
  const handleToggle = (id: string, checked: boolean) => {
    setFeatureSettings(prev => ({ ...prev, [id]: checked }));
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
      deleteStore(storeId);
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
          updateStore(editingStore.id, storeData);
          toast({ title: "Store Updated" });
      } else {
          addStore(storeData);
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
          toast({ title: "Cannot Delete Device", description: "This POS device has printers assigned to it.", variant: "destructive" });
          return;
      }
      deletePosDevice(deviceId);
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
          updatePosDevice(editingDevice.id, deviceData);
          toast({ title: "POS Device Updated" });
      } else {
          addPosDevice(deviceData);
          toast({ title: "POS Device Added" });
      }
      setIsDeviceDialogOpen(false);
  }

  // Printer Handlers
  const handleOpenPrinterDialog = (printer: Partial<PrinterType> | null) => {
      setEditingPrinter(printer ? { ...printer } : EMPTY_PRINTER);
      setIsPrinterDialogOpen(true);
  }

  const handleDeletePrinter = (printerId: string) => {
      deletePrinter(printerId);
      toast({ title: "Printer Deleted" });
  }

  const handlePrinterFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const printerData = {
          name: formData.get('name') as string,
          connection_type: formData.get('connection_type') as 'Network' | 'Bluetooth' | 'Cable',
          ip_address: formData.get('ip_address') as string | null,
          pos_device_id: formData.get('pos_device_id') as string,
      };

      if (editingPrinter?.id) {
          updatePrinter(editingPrinter.id, printerData);
          toast({ title: "Printer Updated" });
      } else {
          addPrinter(printerData);
          toast({ title: "Printer Added" });
      }
      setIsPrinterDialogOpen(false);
  }

  // Receipt Settings Handler
  const handleReceiptSettingChange = (storeId: string, field: keyof ReceiptSettings, value: string | boolean | null) => {
      setReceiptSettings(prev => ({
          ...prev,
          [storeId]: {
              ...(prev[storeId] || {}),
              [field]: value
          }
      }));
      toast({title: "Settings Saved", description: "Receipt settings have been updated."});
  }
  
  const handleLogoChange = (storeId: string, field: 'emailedLogo' | 'printedLogo', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleReceiptSettingChange(storeId, field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Tax Handlers
  const handleOpenTaxDialog = (tax: Partial<Tax> | null) => {
      setEditingTax(tax ? { ...tax } : EMPTY_TAX);
      setIsTaxDialogOpen(true);
  }

  const handleDeleteTax = (taxId: string) => {
      deleteTax(taxId);
      toast({ title: "Tax Deleted" });
  }
  
  const handleTaxFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const taxData = {
        name: formData.get('name') as string,
        rate: parseFloat(formData.get('rate') as string),
        type: formData.get('type') as 'Added' | 'Included',
        is_default: (formData.get('is_default') as string) === 'on',
    };

    if (editingTax?.id) {
        updateTax(editingTax.id, taxData);
        toast({ title: "Tax Updated" });
    } else {
        addTax(taxData);
        toast({ title: "Tax Added" });
    }
    setIsTaxDialogOpen(false);
  }

  // Payment Type Handlers
  const handleOpenPaymentTypeDialog = (pt: Partial<PaymentType> | null) => {
    setEditingPaymentType(pt ? { ...pt } : EMPTY_PAYMENT_TYPE);
    setIsPaymentTypeDialogOpen(true);
  };

  const handleDeletePaymentType = (id: string) => {
    deletePaymentType(id);
    toast({ title: "Payment Type Deleted" });
  };

  const handlePaymentTypeFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ptData = {
      name: formData.get('name') as string,
      type: formData.get('type') as 'Cash' | 'Card' | 'Credit' | 'Other',
    };

    if (editingPaymentType?.id) {
      updatePaymentType(editingPaymentType.id, ptData);
      toast({ title: "Payment Type Updated" });
    } else {
      addPaymentType(ptData);
      toast({ title: "Payment Type Added" });
    }
    setIsPaymentTypeDialogOpen(false);
  };

  const getStoreName = (storeId: string) => stores.find(s => s.id === storeId)?.name || 'N/A';
  const getDeviceName = (deviceId: string) => posDevices.find(d => d.id === deviceId)?.name || 'N/A';
  
  const currentReceiptSettings = receiptSettings[selectedStoreForReceipt] || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Settings"
          description="Configure the features and behavior of your POS system."
        />
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
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>Stores</CardTitle>
                            <CardDescription>Manage your physical store locations.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenStoreDialog(null)}>
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
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>POS Devices</CardTitle>
                            <CardDescription>Manage the devices used to make sales.</CardDescription>
                        </div>
                         <Button onClick={() => handleOpenDeviceDialog(null)}>
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

             {activeSection === 'printers' && (
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>Printers</CardTitle>
                            <CardDescription>Manage your kitchen and receipt printers.</CardDescription>
                        </div>
                         <Button onClick={() => handleOpenPrinterDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Printer
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Printer Name</TableHead>
                                    <TableHead>Connection</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {printers.map(printer => (
                                    <TableRow key={printer.id}>
                                        <TableCell className="font-medium">{printer.name}</TableCell>
                                        <TableCell><Badge variant="outline">{printer.connection_type}</Badge></TableCell>
                                        <TableCell>{printer.ip_address || 'N/A'}</TableCell>
                                        <TableCell>{getDeviceName(printer.pos_device_id)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
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
            
            {activeSection === 'receipt' && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>Receipt settings</CardTitle>
                                <CardDescription>Customize the printed and emailed receipts for this store.</CardDescription>
                            </div>
                            <Select value={selectedStoreForReceipt} onValueChange={setSelectedStoreForReceipt} disabled={!stores.length}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select a store" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                          <Label>Logo</Label>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Emailed receipt</span>
                                  {currentReceiptSettings.emailedLogo && (
                                    <Button variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={() => handleReceiptSettingChange(selectedStoreForReceipt, 'emailedLogo', null)}>
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  type="file"
                                  ref={emailedLogoInputRef}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleLogoChange(selectedStoreForReceipt, 'emailedLogo', e)}
                                />
                                <div
                                  className="h-24 w-full border rounded-md flex items-center justify-center bg-muted/50 cursor-pointer"
                                  onClick={() => emailedLogoInputRef.current?.click()}
                                >
                                  {currentReceiptSettings.emailedLogo ? (
                                    <Image src={currentReceiptSettings.emailedLogo} width={80} height={80} alt="Emailed receipt logo" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Click to upload</span>
                                  )}
                                </div>
                              </div>
                               <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Printed receipt</span>
                                   {currentReceiptSettings.printedLogo && (
                                    <Button variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={() => handleReceiptSettingChange(selectedStoreForReceipt, 'printedLogo', null)}>
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  type="file"
                                  ref={printedLogoInputRef}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleLogoChange(selectedStoreForReceipt, 'printedLogo', e)}
                                />
                                <div
                                  className="h-24 w-full border rounded-md flex items-center justify-center bg-muted/50 cursor-pointer"
                                  onClick={() => printedLogoInputRef.current?.click()}
                                >
                                  {currentReceiptSettings.printedLogo ? (
                                    <Image src={currentReceiptSettings.printedLogo} width={80} height={80} alt="Printed receipt logo" />
                                  ) : (
                                     <span className="text-xs text-muted-foreground">Click to upload</span>
                                  )}
                                </div>
                              </div>
                          </div>
                        </div>

                         <div className="space-y-2">
                            <Label>Header</Label>
                            <Textarea
                                value={currentReceiptSettings?.header || ''}
                                onChange={(e) => handleReceiptSettingChange(selectedStoreForReceipt, 'header', e.target.value)}
                                placeholder="E.g., Welcome to our store!"
                                maxLength={500}
                                disabled={!selectedStoreForReceipt}
                            />
                             <p className="text-xs text-muted-foreground text-right">{currentReceiptSettings?.header?.length || 0}/500</p>
                         </div>

                         <div className="space-y-2">
                            <Label>Footer</Label>
                            <Textarea
                                value={currentReceiptSettings?.footer || ''}
                                onChange={(e) => handleReceiptSettingChange(selectedStoreForReceipt, 'footer', e.target.value)}
                                placeholder="E.g., Thank you for your business!"
                                maxLength={500}
                                disabled={!selectedStoreForReceipt}
                            />
                            <p className="text-xs text-muted-foreground text-right">{currentReceiptSettings?.footer?.length || 0}/500</p>
                         </div>
                        
                         <div className="flex items-center justify-between">
                           <Label htmlFor="showCustomerInfo">Show customer info</Label>
                           <Switch
                             id="showCustomerInfo"
                             checked={currentReceiptSettings?.showCustomerInfo}
                             onCheckedChange={(checked) => handleReceiptSettingChange(selectedStoreForReceipt, 'showCustomerInfo', checked)}
                             disabled={!selectedStoreForReceipt}
                           />
                         </div>

                         <div className="flex items-center justify-between">
                           <Label htmlFor="showComments">Show comments</Label>
                           <Switch
                             id="showComments"
                             checked={currentReceiptSettings?.showComments}
                             onCheckedChange={(checked) => handleReceiptSettingChange(selectedStoreForReceipt, 'showComments', checked)}
                             disabled={!selectedStoreForReceipt}
                           />
                         </div>
                         
                         <div className="space-y-2">
                            <Label>Receipt language</Label>
                            <Select
                              value={currentReceiptSettings?.language}
                              onValueChange={(value) => handleReceiptSettingChange(selectedStoreForReceipt, 'language', value)}
                              disabled={!selectedStoreForReceipt}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                    </CardContent>
                </Card>
            )}
            
            {activeSection === 'taxes' && (
                 <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>Taxes</CardTitle>
                                <CardDescription>Manage taxes applied to sales.</CardDescription>
                            </div>
                            <Button onClick={() => handleOpenTaxDialog(null)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Add Tax
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tax Name</TableHead>
                                        <TableHead>Rate (%)</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taxes.map(tax => (
                                        <TableRow key={tax.id}>
                                            <TableCell className="font-medium">{tax.name}</TableCell>
                                            <TableCell>{tax.rate.toFixed(2)}%</TableCell>
                                            <TableCell><Badge variant="outline">{tax.type}</Badge></TableCell>
                                            <TableCell>{tax.is_default ? 'Yes' : 'No'}</TableCell>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Currency</CardTitle>
                            <CardDescription>Set the default currency for your POS.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-w-xs space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={currency} onValueChange={(value) => { setCurrency(value); toast({title: "Settings Saved"}); }}>
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Select a currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
            )}

            {activeSection === 'payment_types' && (
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                        <CardTitle>Payment Types</CardTitle>
                        <CardDescription>Manage the payment methods available at checkout.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenPaymentTypeDialog(null)}>
                        <PlusCircle className="mr-2 h-4" /> Add Payment Type
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
        </main>
      </div>

      {/* Dialogs */}
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
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
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
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent>
            <form onSubmit={handlePrinterFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingPrinter?.id ? 'Edit Printer' : 'Add Printer'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Printer Name</Label>
                        <Input id="name" name="name" defaultValue={editingPrinter?.name} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="connection_type">Connection Type</Label>
                        <Select name="connection_type" required defaultValue={editingPrinter?.connection_type}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Network">Network (IP)</SelectItem>
                                <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                                <SelectItem value="Cable">Cable (USB/Serial)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {editingPrinter?.connection_type === 'Network' && (
                         <div className="space-y-2">
                            <Label htmlFor="ip_address">IP Address</Label>
                            <Input id="ip_address" name="ip_address" defaultValue={editingPrinter?.ip_address || ''} placeholder="e.g., 192.168.1.100" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="pos_device_id">POS Device</Label>
                        <Select name="pos_device_id" required defaultValue={editingPrinter?.pos_device_id}>
                            <SelectTrigger><SelectValue placeholder="Assign to a device" /></SelectTrigger>
                            <SelectContent>
                                {posDevices.map(device => (
                                    <SelectItem key={device.id} value={device.id}>{device.name} ({getStoreName(device.store_id)})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
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
                        <Label htmlFor="rate">Rate (%)</Label>
                        <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingTax?.rate} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="type">Tax Type</Label>
                        <Select name="type" required defaultValue={editingTax?.type}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Added">Added to price</SelectItem>
                                <SelectItem value="Included">Included in price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="is_default" name="is_default" defaultChecked={editingTax?.is_default} />
                        <Label htmlFor="is_default">Set as default tax</Label>
                    </div>
                </div>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
