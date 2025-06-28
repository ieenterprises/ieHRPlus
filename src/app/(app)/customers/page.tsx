"use client";

import { useState } from "react";
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
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
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

const EMPTY_CUSTOMER: Partial<Customer> = {
  name: "",
  email: "",
  phone: "",
};

const MOCK_CUSTOMERS: Customer[] = [
    { id: "cust_1", name: "Walk-in Customer", email: "walkin@example.com", phone: null, created_at: "2023-01-01T10:00:00Z" },
    { id: "cust_2", name: "Alice Johnson", email: "alice.j@email.com", phone: "111-222-3333", created_at: "2023-05-10T11:30:00Z" },
    { id: "cust_3", name: "Bob Williams", email: "bob.w@email.com", phone: "444-555-6666", created_at: "2023-06-15T14:00:00Z" },
];


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const { toast } = useToast();

  const handleOpenDialog = (customer: Partial<Customer> | null) => {
    setEditingCustomer(customer ? customer : EMPTY_CUSTOMER);
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
    const formData = new FormData(event.currentTarget);
    
    const customerData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    };

    try {
      if (editingCustomer?.id) {
        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...customerData } as Customer : c));
        toast({ title: "Customer Updated", description: `${customerData.name}'s details have been updated.` });
      } else {
        const newCustomer: Customer = { 
            id: `cust_${new Date().getTime()}`, 
            created_at: new Date().toISOString(),
            ...customerData 
        };
        setCustomers([newCustomer, ...customers]);
        toast({ title: "Customer Added", description: `${customerData.name} has been added.` });
      }
      handleDialogClose(false);
    } catch (error: any) {
        toast({ title: "Error saving customer", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      setCustomers(customers.filter(c => c.id !== customerId));
      toast({
          title: "Customer Deleted",
          description: "The customer has been removed.",
          variant: "destructive"
      });
    } catch (error: any) {
        toast({ title: "Error deleting customer", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Customer Management"
          description="Manage your customer database."
        />
        <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            A list of all customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Loading...
                    </TableCell>
                </TableRow>
              ) : customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{customer.phone}</TableCell>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No customers found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSaveCustomer}>
              <DialogHeader>
                <DialogTitle>{editingCustomer?.id ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                <DialogDescription>
                  {editingCustomer?.id ? "Update the customer's details." : "Fill in the details for the new customer."}
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
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
