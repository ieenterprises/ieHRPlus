
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isWithinInterval } from "date-fns";
import { type DateRange } from "react-day-picker";
import Papa from "papaparse";
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
import { type Sale, type OpenTicket, type SaleItem, UserRole, Shift } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Printer, Coins, Download, Eye, LogIn, Trash2, GitMerge } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePos } from "@/hooks/use-pos";
import { useSettings } from "@/hooks/use-settings";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";


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

const getStatusBadgeVariant = (status: Sale['fulfillment_status']) => {
    switch (status) {
        case 'Fulfilled':
            return 'default';
        case 'Pending':
            return 'secondary';
        case 'Unfulfilled':
            return 'destructive';
        default:
            return 'outline';
    }
}

const generateUniqueOrderNumber = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  return parseInt(`${timestamp.toString().slice(-6)}${randomSuffix.toString().padStart(3, '0')}`);
};

export default function KitchenPage() {
  const { sales, setSales, products, categories, users, loggedInUser, setPrintableData, currency, isPrintModalOpen, setIsPrintModalOpen, voidSale, shifts } = useSettings();
  const { openTickets, saveTicket, deleteTicket, setTicketToSettle, updateTicket } = usePos();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "all",
    paymentMethod: "all",
    employee: "all",
    minAmount: "",
    maxAmount: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const defaultTab = searchParams.get('tab') || "receipts";
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewingOrder, setPreviewingOrder] = useState<(Sale | OpenTicket) & { type: 'receipt' | 'ticket' } | null>(null);
  const [previewItems, setPreviewItems] = useState<SaleItem[]>([]);
  
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [primaryMergeId, setPrimaryMergeId] = useState<string | null>(null);
  const [canMerge, setCanMerge] = useState(true);
  
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);

  useEffect(() => {
      if (loggedInUser && shifts.length > 0) {
          const userActiveShifts = shifts
              .filter(s => s.userId === loggedInUser.id && (s.status === 'active' || s.status === 'temp-active'))
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          setActiveShifts(userActiveShifts);
      }
  }, [loggedInUser, shifts]);

  const onPrint = (data: any, type: 'receipt' | 'ticket') => {
    setPrintableData({ ...data, type });
    setIsPrintModalOpen(true);
  };
  
  useEffect(() => {
    setLoading(false);
    const debtSaleId = searchParams.get('debtSaleId');
    if (debtSaleId) {
        setFilters(prev => ({...prev, searchTerm: debtSaleId}));
    }

    const customerName = searchParams.get('customerName');
    const paymentMethod = searchParams.get('paymentMethod');
    if (customerName && paymentMethod) {
        setFilters(prev => ({
            ...prev,
            searchTerm: customerName,
            paymentMethod: paymentMethod,
        }));
        router.replace('/kitchen?tab=receipts', undefined);
    }
  }, [searchParams, router]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getCategoryFromId = (id: string | null) => {
    if (!id) return null;
    return categories.find(c => c.id === id);
  }

  const getItemCategoryNames = (items: Sale['items']): string[] => {
    const categoryIds = new Set(
        items.map(item => {
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
        sale.items.some((item) => item.name.toLowerCase().includes(searchTermLower)) ||
        sale.id.includes(filters.searchTerm); // Search by sale ID for debt settlement
      
      const saleCategories = getItemCategoryNames(sale.items);
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
          return acc + (item.price * item.quantity);
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
          return acc + (item.price * item.quantity);
      }, 0);

      return {
          ...sale,
          displayItems,
          displayTotal,
      };
    });
  }, [sales, filters, dateRange, products, categories]);

  const filteredTickets = useMemo(() => {
    return openTickets.filter((ticket) => {
      const searchTermLower = filters.searchTerm.toLowerCase();

      const searchMatch =
        filters.searchTerm === "" ||
        ticket.order_number?.toString().includes(searchTermLower) ||
        (ticket.customers?.name ?? '').toLowerCase().includes(searchTermLower) ||
        (ticket.users?.name ?? '').toLowerCase().includes(searchTermLower) ||
        (ticket.items as any[]).some((item) => item.name.toLowerCase().includes(searchTermLower));

      const ticketCategories = getItemCategoryNames(ticket.items as any[]);
      const categoryMatch = filters.category === "all" || ticketCategories.includes(filters.category);
      
      const employeeMatch = filters.employee === "all" || ticket.users?.name === filters.employee;
      
      const dateMatch =
        !dateRange?.from ||
        (new Date(ticket.created_at!) >= dateRange.from &&
          (!dateRange.to || new Date(ticket.created_at!) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));
      
      const minAmount = parseFloat(filters.minAmount);
      const maxAmount = parseFloat(filters.maxAmount);

      const amountMatch =
        (isNaN(minAmount) || ticket.total >= minAmount) &&
        (isNaN(maxAmount) || ticket.total <= maxAmount);

      return searchMatch && categoryMatch && employeeMatch && dateMatch && amountMatch;
    });
  }, [openTickets, filters, dateRange, products, categories]);
  
  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);
  
  const handleLoadTicket = (ticket: OpenTicket) => {
    setTicketToSettle(ticket);
    router.push('/sales');
  };

  const handleSettleDebtFromReceipts = (sale: Sale) => {
    router.push(`/sales?settleDebt=${sale.id}`);
  };
  
  const handleMoveToVoid = async (sale: Sale) => {
    if (!loggedInUser?.id) {
        toast({ title: "Authentication Error", description: "You must be logged in to void a sale.", variant: "destructive" });
        return;
    }

    try {
        await voidSale(sale.id, loggedInUser.id);
        toast({ title: "Sale Voided", description: `Order #${sale.order_number} has been moved to voided logs.` });
    } catch (error: any) {
        toast({ title: "Error", description: `Failed to void sale: ${error.message}`, variant: "destructive" });
    }
  };

  const handleExport = () => {
    let dataToExport: any[] = [];
    let fileName = "";

    if (activeTab === 'receipts') {
      fileName = `receipts_${new Date().toISOString().split('T')[0]}.csv`;
      dataToExport = filteredReceipts.map(sale => ({
        "Order #": sale.order_number,
        "Date": format(new Date(sale.created_at!), "yyyy-MM-dd HH:mm"),
        "Customer": sale.customers?.name ?? 'Walk-in',
        "Employee": sale.users?.name,
        "Items": sale.items.map(item => `${item.name} (x${item.quantity})`).join(', '),
        "Total": sale.total.toFixed(2),
        "Payment Methods": sale.payment_methods.join(', '),
        "Fulfillment Status": sale.fulfillment_status || 'Unfulfilled',
      }));
    } else { // Open Tickets
      fileName = `open_tickets_${new Date().toISOString().split('T')[0]}.csv`;
      dataToExport = filteredTickets.map(ticket => ({
        "Order #": ticket.order_number,
        "Date": format(new Date(ticket.created_at!), "yyyy-MM-dd HH:mm"),
        "Employee": ticket.users?.name ?? 'N/A',
        "Items": (ticket.items as any[]).map(item => `${item.name} (x${item.quantity})`).join(', '),
        "Total": ticket.total.toFixed(2),
        "Fulfillment Status": ticket.fulfillment_status || 'Unfulfilled',
      }));
    }

    if (dataToExport.length === 0) {
      toast({
        title: "No data to export",
        description: `There are no ${activeTab} for the current filters.`,
        variant: "destructive"
      });
      return;
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Your ${activeTab} data has been downloaded.` });
  };

  const openPreviewModal = (order: Sale | OpenTicket, type: 'receipt' | 'ticket') => {
    setPreviewingOrder({ ...order, type });
    setPreviewItems(order.items.map(item => ({ ...item, fulfilled_quantity: item.fulfilled_quantity || 0 }))); 
    setIsPreviewOpen(true);
  };
  
  const handleItemFulfillmentToggle = (itemId: string, itemIndex: number, checked: boolean) => {
    setPreviewItems(currentItems =>
      currentItems.map((item, idx) => {
        if (item.id === itemId && idx === itemIndex) { // Check both id and original index
          const newFulfilledQuantity = (item.fulfilled_quantity || 0) + (checked ? 1 : -1);
          return { ...item, fulfilled_quantity: Math.max(0, Math.min(item.quantity, newFulfilledQuantity)) };
        }
        return item;
      })
    );
  };

  const handleMarkAllFulfilled = () => {
    setPreviewItems(currentItems =>
      currentItems.map(item => ({ ...item, fulfilled_quantity: item.quantity }))
    );
  };

  const calculateFulfillmentStatus = (items: SaleItem[]): Sale['fulfillment_status'] => {
    const totalItemUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const fulfilledItemUnits = items.reduce((sum, item) => sum + (item.fulfilled_quantity || 0), 0);

    if (fulfilledItemUnits === 0) return 'Unfulfilled';
    if (fulfilledItemUnits === totalItemUnits) return 'Fulfilled';
    return 'Pending';
  };

  const handleSaveFulfillment = async () => {
    if (!previewingOrder) return;
    
    const newStatus = calculateFulfillmentStatus(previewItems);
    
    if (previewingOrder.type === 'receipt') {
      await setSales(prevSales =>
        prevSales.map(sale =>
          sale.id === previewingOrder.id
            ? { ...sale, items: previewItems, fulfillment_status: newStatus }
            : sale
        )
      );
    } else {
      const updatedTicket: OpenTicket = {
        ...previewingOrder,
        items: previewItems,
        fulfillment_status: newStatus
      };
      await updateTicket(updatedTicket);
    }
    
    toast({
      title: "Order Updated",
      description: `Order #${previewingOrder.order_number} status is now ${newStatus}.`
    });
    setIsPreviewOpen(false);
  };
  
  const handleMergeSelection = (id: string, isSelected: boolean, type: 'ticket' | 'receipt') => {
    const setter = type === 'ticket' ? setSelectedTickets : setSelectedReceipts;
    setter(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        return newSet;
    });
  };

  useEffect(() => {
    const checkMergePermissions = () => {
        if (!loggedInUser) {
            setCanMerge(false);
            return;
        }

        if (hasPermission('MANAGE_OPEN_TICKETS')) {
            setCanMerge(true);
            return;
        }

        const selectedIds = activeTab === 'open_tickets' ? selectedTickets : selectedReceipts;
        if (selectedIds.size === 0) {
            setCanMerge(true);
            return;
        }

        const sourceList = activeTab === 'open_tickets' ? openTickets : sales;
        const selectedOrders = sourceList.filter(order => selectedIds.has(order.id));
        
        const allOwnedByUser = selectedOrders.every(order => order.employee_id === loggedInUser.id);
        setCanMerge(allOwnedByUser);
    };

    checkMergePermissions();
  }, [selectedTickets, selectedReceipts, activeTab, openTickets, sales, loggedInUser]);

  const handleMerge = async () => {
    if (!primaryMergeId || !loggedInUser?.id) return;

    if (activeTab === 'open_tickets') {
        const ticketsToMerge = openTickets.filter(t => selectedTickets.has(t.id));
        const primaryTicket = ticketsToMerge.find(t => t.id === primaryMergeId);
        if (!primaryTicket) return;

        const allItems = ticketsToMerge.flatMap(t => t.items);
        const newTotal = ticketsToMerge.reduce((sum, ticket) => sum + ticket.total, 0);
        
        const newTicket: Partial<OpenTicket> = {
            ...primaryTicket,
            items: allItems,
            total: newTotal,
            created_at: new Date().toISOString(),
        };
        delete newTicket.id; // Create a new ticket

        const savedTicket = await saveTicket(newTicket);
        if (savedTicket) {
            // Delete old tickets
            for (const ticket of ticketsToMerge) {
                await deleteTicket(ticket.id);
            }
        }
        toast({ title: "Tickets Merged", description: `Created new ticket #${savedTicket?.order_number}`});

    } else { // Receipts
        const receiptsToMerge = sales.filter(s => selectedReceipts.has(s.id));
        const primaryReceipt = receiptsToMerge.find(s => s.id === primaryMergeId);
        if (!primaryReceipt) return;
        
        const allItems = receiptsToMerge.flatMap(s => s.items);
        const newTotal = receiptsToMerge.reduce((sum, receipt) => sum + receipt.total, 0);
        const allPaymentMethods = [...new Set(receiptsToMerge.flatMap(s => s.payment_methods))];
        const newId = `sale_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;

        const newSale: Omit<Sale, 'id'> = {
            ...primaryReceipt,
            items: allItems,
            total: newTotal,
            payment_methods: allPaymentMethods,
            created_at: new Date().toISOString(),
            order_number: generateUniqueOrderNumber(),
        };
        
        await setSales(prev => [...prev, { ...newSale, id: newId } as Sale]);
        
        // Void old receipts
        for (const receipt of receiptsToMerge) {
            await voidSale(receipt.id, loggedInUser.id);
        }
        toast({ title: "Receipts Merged", description: `Created new receipt #${newSale.order_number} and voided originals.` });
    }
    
    setIsMergeDialogOpen(false);
    setSelectedTickets(new Set());
    setSelectedReceipts(new Set());
    setPrimaryMergeId(null);
  };
  
  const mergeCandidates = activeTab === 'open_tickets'
    ? openTickets.filter(t => selectedTickets.has(t.id))
    : sales.filter(s => selectedReceipts.has(s.id));

  const areAllSelectedOrdersFulfilled = useMemo(() => {
    if (activeTab === 'open_tickets') {
        if (selectedTickets.size === 0) return true;
        return openTickets
            .filter(t => selectedTickets.has(t.id))
            .every(t => t.fulfillment_status === 'Fulfilled');
    }
    if (activeTab === 'receipts') {
        if (selectedReceipts.size === 0) return true;
        return sales
            .filter(s => selectedReceipts.has(s.id))
            .every(s => s.fulfillment_status === 'Fulfilled');
    }
    return true;
  }, [selectedTickets, selectedReceipts, activeTab, openTickets, sales]);

  const previewOrderCategories = useMemo(() => {
    if (!previewItems) return [];
    return getItemCategoryNames(previewItems);
  }, [previewItems]);

  const canPerformAction = (orderEmployeeId: string | null): boolean => {
    if (!loggedInUser) return false;
    if (hasPermission('MANAGE_OPEN_TICKETS') || hasPermission('FULFILL_ANY_ORDER')) {
      return true;
    }
    return loggedInUser.id === orderEmployeeId;
  };
  
  const canSelectForMerge = (orderEmployeeId: string | null): boolean => {
    if (!loggedInUser) return false;
    if (hasPermission('MANAGE_OPEN_TICKETS')) {
      return true;
    }
    
    if (selectedTickets.size > 0 && ![...selectedTickets].every(id => openTickets.find(t => t.id === id)?.employee_id === loggedInUser.id)) {
        return false;
    }
    if (selectedReceipts.size > 0 && ![...selectedReceipts].every(id => sales.find(s => s.id === id)?.employee_id === loggedInUser.id)) {
        return false;
    }

    return orderEmployeeId === loggedInUser.id;
  };

  const isSaleFromActiveShift = (saleDate: Date): boolean => {
    if (activeShifts.length === 0) {
      return false;
    }
    // Check if the sale date falls within any of the user's active or temp-active shifts
    return activeShifts.some(shift => 
        isWithinInterval(saleDate, {
            start: new Date(shift.startTime),
            end: shift.endTime ? new Date(shift.endTime) : new Date(), // Use now if shift is still open
        })
    );
  };


  return (
    <TooltipProvider>
      <PrintPreviewDialog />
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Orders"
            description="View open tickets and completed receipts."
          />
           <div className="flex items-center gap-2 self-end">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="inline-block">
                             <Button 
                                onClick={() => setIsMergeDialogOpen(true)} 
                                variant="outline" 
                                size="sm"
                                disabled={((activeTab === 'open_tickets' && selectedTickets.size < 2) || (activeTab === 'receipts' && selectedReceipts.size < 2)) || !isOnline || !canMerge || !areAllSelectedOrdersFulfilled}
                            >
                                <GitMerge className="mr-2 h-4 w-4" />
                                Merge
                            </Button>
                        </div>
                    </TooltipTrigger>
                    {!isOnline && <TooltipContent><p>Internet connection required</p></TooltipContent>}
                    {!canMerge && <TooltipContent><p>You can only merge your own orders.</p></TooltipContent>}
                    {!areAllSelectedOrdersFulfilled && <TooltipContent><p>Only fulfilled orders can be merged.</p></TooltipContent>}
                </Tooltip>
                <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>
        </div>
        <Tabs defaultValue={defaultTab} onValueChange={(tab) => { setActiveTab(tab); setSelectedReceipts(new Set()); setSelectedTickets(new Set()); }}>
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
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Input
                          placeholder="Search by order #, customer, item..."
                          value={filters.searchTerm}
                          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                          className="max-w-xs"
                          />
                          <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by employee" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Employees</SelectItem>
                                  {users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <Input placeholder="Min Amount" type="number" value={filters.minAmount} onChange={(e) => handleFilterChange("minAmount", e.target.value)} className="w-32" />
                          <Input placeholder="Max Amount" type="number" value={filters.maxAmount} onChange={(e) => handleFilterChange("maxAmount", e.target.value)} className="w-32" />
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                          </Popover>
                      </div>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => { const allIds = new Set(filteredTickets.filter(t => canSelectForMerge(t.employee_id)).map(t => t.id)); setSelectedTickets(checked ? allIds : new Set()); }} checked={selectedTickets.size > 0 && selectedTickets.size === filteredTickets.filter(t => canSelectForMerge(t.employee_id)).length} /></TableHead>
                                  <TableHead>Order #</TableHead>
                                  <TableHead>Employee</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Items</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                             {loading ? (
                                  <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell></TableRow>
                              ) : filteredTickets.length > 0 ? (
                                  filteredTickets.map(ticket => {
                                      const hasActionPermission = canPerformAction(ticket.employee_id);
                                      const isCheckboxDisabled = !canSelectForMerge(ticket.employee_id);
                                      return (
                                          <TableRow key={ticket.id}>
                                              <TableCell><Checkbox checked={selectedTickets.has(ticket.id)} onCheckedChange={(checked) => handleMergeSelection(ticket.id, checked as boolean, 'ticket')} disabled={isCheckboxDisabled} /></TableCell>
                                              <TableCell className="font-medium">#{ticket.order_number}</TableCell>
                                              <TableCell>{ticket.users?.name ?? 'N/A'}</TableCell>
                                              <TableCell>{format(new Date(ticket.created_at!), 'LLL dd, y HH:mm')}</TableCell>
                                              <TableCell>{(ticket.items as any[]).map(item => `${item.name} (x${item.quantity})`).join(', ')}</TableCell>
                                              <TableCell className="text-right">{currency}{ticket.total.toFixed(2)}</TableCell>
                                              <TableCell>
                                                <Badge variant={getStatusBadgeVariant(ticket.fulfillment_status)}>{ticket.fulfillment_status || 'Unfulfilled'}</Badge>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => openPreviewModal(ticket, 'ticket')} disabled={!hasActionPermission}><Eye className="h-4 w-4" /></Button></TooltipTrigger>{!hasActionPermission && <TooltipContent><p>Permission denied. You can only preview your own orders.</p></TooltipContent>}</Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleLoadTicket(ticket as OpenTicket)} disabled={!hasActionPermission}><LogIn className="h-4 w-4" /></Button></TooltipTrigger>{!hasActionPermission && <TooltipContent><p>Permission denied. You can only load your own tickets.</p></TooltipContent>}</Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => onPrint(ticket, 'ticket')} disabled={!hasActionPermission}><Printer className="h-4 w-4" /></Button></TooltipTrigger>{!hasActionPermission && <TooltipContent><p>Permission denied. You can only print your own orders.</p></TooltipContent>}</Tooltip>
                                                </div>
                                              </TableCell>
                                          </TableRow>
                                      );
                                  })
                              ) : (
                                  <TableRow>
                                      <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                          No open tickets found for the selected filters.
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
                          <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => { const allIds = new Set(filteredReceipts.filter(r => canSelectForMerge(r.employee_id)).map(r => r.id)); setSelectedReceipts(checked ? allIds : new Set()); }} checked={selectedReceipts.size > 0 && selectedReceipts.size === filteredReceipts.filter(r => canSelectForMerge(r.employee_id)).length} /></TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="hidden sm:table-cell">Customer</TableHead>
                          <TableHead className="hidden md:table-cell">Employee</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                           <TableHead>Status</TableHead>
                          <TableHead className="text-center">Payment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {loading ? (
                          <TableRow><TableCell colSpan={11} className="h-24 text-center">Loading...</TableCell></TableRow>
                      ) : filteredReceipts.length > 0 ? (
                          filteredReceipts.map((sale, index) => {
                          const categoriesForDisplay = getItemCategoryNames(sale.displayItems);
                          const isCreditSale = sale.payment_methods.includes('Credit');
                          const hasActionPermission = canPerformAction(sale.employee_id);
                          const isCheckboxDisabled = !canSelectForMerge(sale.employee_id);
                          
                          const saleDate = new Date(sale.created_at!);
                          const isFromActiveShift = isSaleFromActiveShift(saleDate);
                          const canPerformShiftActions = isFromActiveShift || hasPermission('SETTLE_PREVIOUS_SHIFT_DEBTS');
                          const canSettleDebt = hasActionPermission && canPerformShiftActions;
                          const canPrint = (hasActionPermission && canPerformShiftActions) || hasPermission('REPRINT_ANY_RECEIPT');

                          return (
                          <TableRow key={`${sale.id}-${index}`}>
                              <TableCell><Checkbox checked={selectedReceipts.has(sale.id)} onCheckedChange={(checked) => handleMergeSelection(sale.id, checked as boolean, 'receipt')} disabled={isCheckboxDisabled} /></TableCell>
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
                              <TableCell className="text-right">{currency}{sale.displayTotal.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(sale.fulfillment_status)}>{sale.fulfillment_status || 'Unfulfilled'}</Badge>
                              </TableCell>
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
                                  <div className="flex items-center justify-end gap-2">
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => openPreviewModal(sale, 'receipt')} disabled={!hasActionPermission}><Eye className="h-4 w-4" /></Button></TooltipTrigger>{!hasActionPermission && <TooltipContent><p>Permission denied. You can only preview your own orders.</p></TooltipContent>}</Tooltip>
                                    {isCreditSale && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                        <div className="inline-block">
                                            <Button variant="outline" size="icon" onClick={() => handleSettleDebtFromReceipts(sale)} disabled={!isOnline || !canSettleDebt}>
                                                <Coins className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        </TooltipTrigger>
                                        {!isOnline && <TooltipContent><p>Connect to the internet to settle debts.</p></TooltipContent>}
                                        {!canSettleDebt && hasActionPermission && <TooltipContent><p>Debt is from a previous shift. Manager approval required.</p></TooltipContent>}
                                        {!canSettleDebt && !hasActionPermission && <TooltipContent><p>Permission denied.</p></TooltipContent>}
                                    </Tooltip>
                                    )}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="inline-block">
                                                <Button variant="outline" size="icon" onClick={() => onPrint(sale, 'receipt')} disabled={!canPrint}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        {!canPrint && hasActionPermission && !hasPermission('REPRINT_ANY_RECEIPT') && <TooltipContent><p>Receipt is from a previous shift. Manager approval required.</p></TooltipContent>}
                                        {!canPrint && !hasActionPermission && !hasPermission('REPRINT_ANY_RECEIPT') && <TooltipContent><p>Permission denied.</p></TooltipContent>}
                                    </Tooltip>
                                    {hasPermission('CANCEL_RECEIPTS') && (
                                        <Tooltip><TooltipTrigger asChild><Button variant="destructive" size="icon" onClick={() => handleMoveToVoid(sale)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Move to Void</p></TooltipContent></Tooltip>
                                    )}
                                  </div>
                              </TableCell>
                          </TableRow>
                          )})
                      ) : (
                          <TableRow>
                              <TableCell colSpan={11} className="text-center text-muted-foreground h-24">
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Preview #{previewingOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Mark items as fulfilled for the kitchen.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p><span className="font-semibold">Date:</span> {previewingOrder?.created_at ? format(new Date(previewingOrder.created_at), 'PPpp') : 'N/A'}</p>
                    <p><span className="font-semibold">Customer:</span> {previewingOrder?.customers?.name || 'Walk-in'}</p>
                    <p><span className="font-semibold">Employee:</span> {previewingOrder?.users?.name || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-semibold">Total:</span> {currency}{previewingOrder?.total.toFixed(2)}</p>
                    <p><span className="font-semibold">Categories:</span></p>
                    <div className="flex flex-wrap gap-1 justify-end">
                        {previewOrderCategories.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                    </div>
                </div>
            </div>
            <Separator />
            <div className="space-y-4 max-h-64 overflow-y-auto pr-4">
              {previewItems.map((item, itemIndex) => (
                <div key={`${item.id}-${itemIndex}`}>
                    <Label className="font-semibold">{item.name} (Fulfilled: {item.fulfilled_quantity || 0}/{item.quantity})</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                    {Array.from({ length: item.quantity }).map((_, unitIndex) => (
                        <div key={unitIndex} className="flex items-center space-x-2 p-2 rounded-md border">
                        <Checkbox
                            id={`item-${item.id}-${itemIndex}-${unitIndex}`}
                            checked={unitIndex < (item.fulfilled_quantity || 0)}
                            disabled={unitIndex < (item.fulfilled_quantity || 0)}
                            onCheckedChange={(checked) => handleItemFulfillmentToggle(item.id, itemIndex, checked as boolean)}
                        />
                        <Label
                            htmlFor={`item-${item.id}-${itemIndex}-${unitIndex}`}
                            className={cn(
                                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1",
                                unitIndex < (item.fulfilled_quantity || 0) && "line-through text-muted-foreground"
                            )}
                        >
                            Unit {unitIndex + 1}
                        </Label>
                        </div>
                    ))}
                    </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleMarkAllFulfilled} className="w-full">
                Mark All as Fulfilled
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleSaveFulfillment}>
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Orders</DialogTitle>
            <DialogDescription>
              Select a primary order to inherit details from. All items will be combined.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup onValueChange={setPrimaryMergeId}>
              {mergeCandidates.map((order: any) => (
                <div key={order.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={order.id} id={order.id} />
                  <Label htmlFor={order.id} className="flex-1">
                    Order #{order.order_number} ({order.customers?.name || 'Walk-in'}) - {currency}{order.total.toFixed(2)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={!primaryMergeId}>Confirm Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
