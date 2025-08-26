
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Customer } from "@/lib/types";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Download, Search, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";

const EMPTY_CUSTOMER: Partial<Customer> = {
  name: "",
  email: "",
  phone: "",
};

export default function CustomersPage() {
  const { customers, setCustomers, debts, loggedInUser } = useSettings();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const canManageCustomers = useMemo(() => loggedInUser?.permissions.includes('MANAGE_CUSTOMERS') ?? false, [loggedInUser]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowercasedTerm = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedTerm) ||
      customer.email.toLowerCase().includes(lowercasedTerm) ||
      customer.phone?.toLowerCase().includes(lowercasedTerm)
    );
  }, [customers, searchTerm]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleOpenDialog = (customer: Partial<Customer> | null) => {
    setEditingCustomer(customer ? { ...customer } : EMPTY_CUSTOMER);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCustomer(null);
    }
    setIsDialogOpen(open);
  };

  const handleSaveCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCustomer) return;

    setIsProcessing(true);
    const formData = new FormData(event.currentTarget);
    const customerData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
    };

    try {
      if ('id' in editingCustomer && editingCustomer.id) {
        await setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...customerData } as Customer : c));
        toast({ title: "Customer Updated", description: `${customerData.name}'s details have been updated.` });
      } else {
        const newCustomer = { ...customerData, id: `cust_${new Date().getTime()}`, created_at: new Date().toISOString() };
        await setCustomers([newCustomer as Customer, ...customers]);
        toast({ title: "Customer Added", description: `${customerData.name} has been added.` });
      }
      handleDialogClose(false);
      router.push('/customers');
    } catch (error: any) {
      toast({ title: "Error saving customer", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
     if (debts.some(d => d.customer_id === customerId && d.status === 'Unpaid')) {
        toast({ title: "Cannot Delete Customer", description: "This customer has outstanding debts.", variant: "destructive" });
        return;
      }
    setIsProcessing(true);
    try {
      await setCustomers(customers.filter(c => c.id !== customerId));
      toast({
        title: "Customer Deleted",
        description: "The customer has been removed.",
        variant: "destructive"
      });
    } catch (error: any) {
      toast({ title: "Error deleting customer", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleExport = () => {
    const dataToExport = filteredCustomers.map(c => ({
      "Name": c.name,
      "Email": c.email,
      "Phone": c.phone,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Customer list has been downloaded." });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Customer Management"
          description="Manage your customer database."
        />
        <div className="flex items-center gap-2 self-end">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canManageCustomers && (
              <Button onClick={() => handleOpenDialog(null)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            A list of all customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search customers..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  {canManageCustomers && (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManageCustomers ? 4 : 3} className="text-center text-muted-foreground h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{customer.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{customer.phone}</TableCell>
                      {canManageCustomers && (
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
                              <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteCustomer(customer.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManageCustomers ? 4 : 3} className="text-center text-muted-foreground h-24">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveCustomer}>
            <DialogHeader>
              <DialogTitle>{'id' in (editingCustomer || {}) ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              <DialogDescription>
                {'id' in (editingCustomer || {}) ? "Update the customer's details." : "Fill in the details for the new customer."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingCustomer?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={editingCustomer?.phone ?? ''} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
