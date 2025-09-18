

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Users, Percent, Store, PlusCircle, MoreHorizontal, Edit, Trash2, CreditCard, KeyRound, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSettings, type StoreType, type PaymentType, type Tax, type AccessCode, User } from "@/hooks/use-settings";


const settingsNav = [
  { id: "stores", label: "Stores", icon: Store },
  { id: "taxes", label: "Taxes & Currency", icon: Percent },
  { id: "payment_types", label: "Payment Types", icon: CreditCard },
  { id: "security", label: "Security", icon: KeyRound },
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
const EMPTY_TAX: Partial<Tax> = { name: '', rate: 0, type: 'Added', is_default: false };
const EMPTY_PAYMENT_TYPE: Partial<PaymentType> = { name: '', type: 'Other' };

export default function SettingsPage() {
  const { 
    stores,
    taxes,
    currency,
    paymentTypes,
    users,
    generateAccessCode,
    updateUserTempAccess,
    addStore,
    updateStore,
    deleteStore,
    addTax,
    updateTax,
    deleteTax,
    setCurrency,
    addPaymentType,
    updatePaymentType,
    deletePaymentType,
  } = useSettings();
  
  const [activeSection, setActiveSection] = useState("stores");
  
  const { toast } = useToast();

  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<StoreType> | null>(null);
  
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Partial<Tax> | null>(null);

  const [isPaymentTypeDialogOpen, setIsPaymentTypeDialogOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<Partial<PaymentType> | null>(null);

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<AccessCode | null>(null);

  const eligibleUsersForTempAccess = useMemo(() => {
    const eligibleDepartments = ["Cashier", "Bar Man", "Waitress"];
    return users.filter(user => eligibleDepartments.includes(user.department));
  }, [users]);
  
  // Store Handlers
  const handleOpenStoreDialog = (store: Partial<StoreType> | null) => {
      setEditingStore(store ? { ...store } : EMPTY_STORE);
      setIsStoreDialogOpen(true);
  }

  const handleDeleteStore = (storeId: string) => {
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
  
  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    const newCode = await generateAccessCode();
    if (newCode) {
      setGeneratedCode(newCode);
    } else {
      toast({ title: "Error", description: "Could not generate access code.", variant: "destructive" });
    }
    setIsGeneratingCode(false);
  };

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
            
            {activeSection === 'security' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage security settings for your staff.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                            <Label>One-Time Access Code</Label>
                            <p className="text-sm text-muted-foreground">
                                Generate a unique, 4-digit code that staff must enter to start their session. Each code is valid for 5 minutes and can only be used once.
                            </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-muted/50">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">New Access Code</p>
                                    {generatedCode ? (
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                readOnly 
                                                value={generatedCode.code}
                                                className="w-24 font-mono text-2xl tracking-widest text-center h-12"
                                            />
                                            <div className="text-xs text-muted-foreground">
                                                <p>This code is valid for 5 minutes.</p>
                                                <p>Provide it to the staff member to sign in.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground h-12 flex items-center">Click the button to generate a new code.</p>
                                    )}
                                </div>
                                <Button onClick={handleGenerateCode} disabled={isGeneratingCode}>
                                    {isGeneratingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Generate New Code
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Temporary Access Control</CardTitle>
                            <CardDescription>
                                Grant temporary access to Inventory and Reports for specific employees. Access is revoked when the user signs out.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee Name</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="text-right w-[150px]">Grant Access</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eligibleUsersForTempAccess.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell><Badge variant="outline">{user.department}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Switch
                                                    checked={!!user.temp_access_given}
                                                    onCheckedChange={(checked) => updateUserTempAccess(user.id, checked)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {eligibleUsersForTempAccess.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No eligible employees found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
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
