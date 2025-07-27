
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { PageHeader } from "@/components/page-header";
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
import { type Sale } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Printer, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePos } from "@/hooks/use-pos";
import { useSettings } from "@/hooks/use-settings";
import { useReactToPrint } from "react-to-print";
import { PrintableReceipt } from "@/components/printable-receipt";


const getPaymentBadgeVariant = (method: string) => {
    switch (method.toLowerCase()) {
        case 'cash':
            return 'default';
        case 'card':
            return 'secondary';
        case 'credit':
            return 'destructive';
        default:
            return 'outline';
    }
}

export default function KitchenPage() {
  const { sales, setSales, products, setProducts, categories, users, loggedInUser, setVoidedLogs } = useSettings();
  const { openTickets } = usePos();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "all",
    paymentMethod: "all",
    employee: "all",
    minAmount: "",
    maxAmount: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [printableData, setPrintableData] = useState<any>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const printableRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => printableRef.current,
    onAfterPrint: () => {
        setIsPrintDialogOpen(false);
        setPrintableData(null);
    },
  });

  const onPrint = (data: any, type: 'receipt' | 'ticket') => {
    setPrintableData({ ...data, type });
    setIsPrintDialogOpen(true);
  };
  
  const handleDialogChange = (open: boolean) => {
    setIsPrintDialogOpen(open);
    if (open && printableData) {
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }
  
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleVoidReceipt = (receiptToVoid: Sale) => {
    if (!loggedInUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Are you sure you want to void Receipt #${receiptToVoid.order_number}? This action cannot be undone.`)) {
        return;
    }

    // 1. Create the log entry for the voided receipt.
    const newLog = {
        id: `void_${new Date().getTime()}`,
        type: 'receipt' as const,
        voided_by_employee_id: loggedInUser.id,
        created_at: new Date().toISOString(),
        data: {
            receipt_id: receiptToVoid.id,
            order_number: receiptToVoid.order_number,
            receipt_total: receiptToVoid.total,
            customer_name: receiptToVoid.customers?.name || 'Walk-in',
            items: receiptToVoid.items.map(item => `${item.name} (x${item.quantity})`).join(', '),
        },
        users: { name: loggedInUser.name },
    };

    // 2. Add the log to the voided logs.
    setVoidedLogs(prevLogs => [...prevLogs, newLog]);

    // 3. Remove the receipt from the sales list.
    setSales(prevSales => prevSales.filter(sale => sale.id !== receiptToVoid.id));

    // 4. Handle stock restoration separately and safely.
    try {
      const stockUpdates = receiptToVoid.items
        .map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return null;

            const category = categories.find(c => c.id === product.category_id);
            // Do not restore stock for items that might be services (like rooms).
            if (category?.name === 'Room') {
                return null;
            }
            return { id: item.id, newStock: product.stock + item.quantity };
        })
        .filter((item): item is { id: string; newStock: number } => item !== null);

      if (stockUpdates.length > 0) {
          setProducts(prevProducts =>
              prevProducts.map(p => {
                  const update = stockUpdates.find(u => u.id === p.id);
                  return update ? { ...p, stock: update.newStock } : p;
              })
          );
      }
    } catch (stockError) {
        console.error("Stock could not be restored, but receipt was voided:", stockError);
        toast({ title: "Stock Warning", description: "Could not restore stock for voided items.", variant: "destructive" });
    }

    toast({ title: "Receipt Voided", description: `Receipt #${receiptToVoid.order_number} has been voided.`, variant: "destructive" });
  };


  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getCategoryFromId = (id: string | null) => {
    if (!id) return null;
    return categories.find(c => c.id === id);
  }

  const getSaleCategoryNames = (saleItems: Sale['items']): string[] => {
    const categoryIds = new Set(
        saleItems.map(item => {
            const product = products.find(p => p.id === item.id);
            return product?.category_id;
        }).filter((id): id is string => !!id)
    );

    return Array.from(categoryIds).map(id =>
        categories.find(c => c.id === id)?.name || 'Unknown'
    );
  };

  const filteredReceipts = useMemo(() => {
    return sales.filter((sale) => {
      if (sale.status !== 'Fulfilled') return false;

      const searchTermLower = filters.searchTerm.toLowerCase();
      
      const searchMatch =
        filters.searchTerm === "" ||
        sale.order_number.toString().includes(searchTermLower) ||
        (sale.customers?.name ?? 'Walk-in').toLowerCase().includes(searchTermLower) ||
        (sale.users?.name ?? '').toLowerCase().includes(searchTermLower) ||
        sale.items.some((item) => item.name.toLowerCase().includes(searchTermLower));
      
      const saleCategories = getSaleCategoryNames(sale.items);
      const categoryMatch = filters.category === "all" || saleCategories.includes(filters.category);
      
      const paymentMatch =
        filters.paymentMethod === "all" ||
        sale.payment_methods.some(pm => pm === filters.paymentMethod);

      const employeeMatch = filters.employee === "all" || sale.users?.name === filters.employee;
      
      const dateMatch =
        !dateRange?.from ||
        (new Date(sale.created_at!) >= dateRange.from &&
          (!dateRange.to || new Date(sale.created_at!) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));

      const minAmount = parseFloat(filters.minAmount);
      const maxAmount = parseFloat(filters.maxAmount);

      const itemsForAmountCheck =
        filters.category === "all"
          ? sale.items
          : sale.items.filter((item) => {
              const product = products.find((p) => p.id === item.id);
              if (!product) return false;
              const category = getCategoryFromId(product.category_id!);
              const filterCategory = categories.find(c => c.name === filters.category);
              return category?.id === filterCategory?.id;
            });
      
      const totalForAmountCheck = itemsForAmountCheck.reduce((acc, item) => {
          const product = products.find((p) => p.id === item.id);
          return acc + (product ? product.price * item.quantity : 0);
      }, 0);

      const amountMatch =
        (isNaN(minAmount) || totalForAmountCheck >= minAmount) &&
        (isNaN(maxAmount) || totalForAmountCheck <= maxAmount);

      return searchMatch && categoryMatch && paymentMatch && dateMatch && amountMatch && employeeMatch;
    }).map(sale => {
        const displayItems = filters.category === 'all'
          ? sale.items
          : sale.items.filter(item => {
              const product = products.find(p => p.id === item.id);
              if (!product) return false;
              const category = getCategoryFromId(product.category_id!);
              return category?.name === filters.category;
          });

      const displayTotal = displayItems.reduce((acc, item) => {
          const product = products.find(p => p.id === item.id);
          return acc + (product ? product.price * item.quantity : 0);
      }, 0);

      return {
          ...sale,
          displayItems,
          displayTotal,
      };
    });
  }, [sales, filters, dateRange, products, categories]);

  return (
    <div className="space-y-8">
      <Dialog open={isPrintDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="p-0 w-auto bg-transparent border-none shadow-none">
          <div ref={printableRef} className="bg-white">
            {printableData && <PrintableReceipt data={printableData} type={printableData.type} />}
          </div>
        </DialogContent>
      </Dialog>
      <PageHeader
        title="Orders"
        description="View open tickets and completed receipts."
      />
      <Tabs defaultValue="receipts">
        <TabsList>
            <TabsTrigger value="open_tickets">Open Tickets</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="open_tickets" className="pt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Open Tickets</CardTitle>
                    <CardDescription>
                        A list of all saved orders pending payment.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticket Name</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
                            ) : openTickets.length > 0 ? (
                                openTickets.map(ticket => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-medium">{ticket.ticket_name}</TableCell>
                                        <TableCell>{ticket.users?.name ?? 'N/A'}</TableCell>
                                        <TableCell>{format(new Date(ticket.created_at!), 'LLL dd, y HH:mm')}</TableCell>
                                        <TableCell>{(ticket.items as any[]).map(item => `${item.name} (x${item.quantity})`).join(', ')}</TableCell>
                                        <TableCell className="text-right">${ticket.total.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <Button variant="outline" size="sm" onClick={() => onPrint(ticket, 'ticket')}>
                                            <Printer className="mr-2 h-4 w-4" /> Print
                                          </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No open tickets found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="receipts" className="pt-4">
             <Card>
                <CardHeader>
                <CardTitle>Receipts</CardTitle>
                <CardDescription>
                    Showing all fulfilled sales transactions.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Input
                    placeholder="Search by order, customer, item..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="max-w-xs"
                    />
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by payment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Payment Methods</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Credit">Credit</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by employee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input
                    placeholder="Min Amount"
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                    className="w-32"
                    />
                    <Input
                    placeholder="Max Amount"
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                    className="w-32"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Employee</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Payment</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={9} className="h-24 text-center">Loading...</TableCell></TableRow>
                    ) : filteredReceipts.length > 0 ? (
                        filteredReceipts.map((sale) => {
                        const categoriesForDisplay = getSaleCategoryNames(sale.displayItems);
        
                        return (
                        <TableRow key={sale.id}>
                            <TableCell className="font-medium">#{sale.order_number}</TableCell>
                            <TableCell>{format(new Date(sale.created_at!), "LLL dd, y HH:mm")}</TableCell>
                            <TableCell className="hidden sm:table-cell">{sale.customers?.name ?? 'Walk-in'}</TableCell>
                            <TableCell className="hidden md:table-cell">{sale.users?.name}</TableCell>
                            <TableCell>
                                {sale.displayItems.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {categoriesForDisplay.map(category => (
                                        <Badge key={category} variant="outline" className="whitespace-nowrap">{category}</Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">${sale.displayTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                {sale.payment_methods.map((method: string) => (
                                    <Badge key={method} variant={getPaymentBadgeVariant(method)} className="capitalize">
                                        {method}
                                    </Badge>
                                ))}
                            </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onPrint(sale, 'receipt')}>
                                        <Printer className="mr-2 h-4 w-4" /> Print
                                    </Button>
                                    {loggedInUser?.permissions.includes('CANCEL_RECEIPTS') && (
                                        <Button variant="destructive" size="sm" onClick={() => handleVoidReceipt(sale)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Void
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        )})
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                                No receipts found for the selected filters.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
