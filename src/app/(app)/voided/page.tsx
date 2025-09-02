
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, Trash2, RotateCcw } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { type VoidedLog, type SaleItem, Sale, OpenTicket, Reservation, Debt } from "@/lib/types";

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

export default function VoidedPage() {
  const { 
    voidedLogs,
    deleteVoidedLog,
    currency, 
    users, 
    products, 
    categories, 
    loggedInUser,
    setSales,
    setOpenTickets,
    setDebts,
    setReservations,
    setProducts,
    setVoidedLogs,
  } = useSettings();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    searchTerm: "",
    employee: "all",
    category: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState("receipts");
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  const hasDeletePermission = useMemo(() => loggedInUser?.permissions.includes('PERMANENTLY_DELETE_VOIDS') ?? false, [loggedInUser]);
  const hasRestorePermission = useMemo(() => loggedInUser?.permissions.includes('RESTORE_VOIDED_ITEMS') ?? false, [loggedInUser]);

  const enrichedLogs = useMemo(() => {
    return voidedLogs.map(log => {
      const user = users.find(u => u.id === log.voided_by_employee_id);
      return {
        ...log,
        users: user ? { id: user.id, name: user.name } : null
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [voidedLogs, users]);

  const getSaleCategoryNames = (saleItems: SaleItem[]): string[] => {
    const categoryIds = new Set(
        (saleItems || []).map(item => {
            const product = products.find(p => p.id === item.id);
            return product?.category_id;
        }).filter((id): id is string => !!id)
    );

    return Array.from(categoryIds).map(id =>
        categories.find(c => c.id === id)?.name || 'Unknown'
    );
  };

  const filteredVoidedReceipts = useMemo(() => {
    return enrichedLogs
      .filter((log): log is VoidedLog & { type: 'receipt', data: any } => log.type === 'receipt')
      .filter((log) => {
        const searchTermLower = filters.searchTerm.toLowerCase();
        
        const searchMatch =
          filters.searchTerm === "" ||
          log.data.order_number?.toString().includes(searchTermLower) ||
          (log.data.customers?.name ?? 'Walk-in').toLowerCase().includes(searchTermLower) ||
          (log.data.users?.name ?? '').toLowerCase().includes(searchTermLower) ||
          log.data.items.some((item: SaleItem) => item.name.toLowerCase().includes(searchTermLower));

        const saleCategories = getSaleCategoryNames(log.data.items as SaleItem[]);
        const categoryMatch = filters.category === "all" || saleCategories.some(cat => cat === filters.category);

        const employeeMatch = filters.employee === "all" || log.data.users?.name === filters.employee;
        
        const dateMatch =
          !dateRange?.from ||
          (new Date(log.created_at!) >= dateRange.from &&
            (!dateRange.to || new Date(log.created_at!) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));

        return searchMatch && employeeMatch && dateMatch && categoryMatch;
    });
  }, [enrichedLogs, filters, dateRange, products, categories]);


  useEffect(() => {
    setLoading(false);
    // Reset filters when tab changes
    setFilters({ searchTerm: "", employee: "all", category: "all" });
    setDateRange(undefined);
  }, [activeTab]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleDeleteVoidedLog = async (logId: string) => {
    try {
      await deleteVoidedLog(logId);
      toast({
        title: "Log Deleted",
        description: "The voided log has been permanently removed.",
        variant: "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete log: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLogToDelete(null);
    }
  };

  const handleRestoreLog = async (logToRestore: VoidedLog) => {
    if (!logToRestore || logToRestore.type !== 'receipt') return;
  
    const saleToRestore = {
        ...logToRestore.data,
        customers: users.find(c => c.id === logToRestore.data.customer_id) || null,
        users: users.find(u => u.id === logToRestore.data.employee_id) || null,
    } as Sale;
    
    await setSales(prev => {
        // Check if the sale already exists to prevent duplicates
        if (prev.some(s => s.id === saleToRestore.id)) {
            return prev;
        }
        return [...prev, saleToRestore];
    });
    
    // Check if the restored sale was a credit sale and restore the debt if so.
    if (saleToRestore.payment_methods.includes('Credit') && loggedInUser?.businessId) {
        const debtToRestore: Omit<Debt, 'id'> = {
            sale_id: saleToRestore.id,
            customer_id: saleToRestore.customer_id,
            amount: saleToRestore.total,
            status: 'Unpaid' as const,
            created_at: saleToRestore.created_at!,
            sales: saleToRestore, 
            customers: saleToRestore.customers,
            businessId: loggedInUser.businessId,
        };
        await setDebts(prev => [...prev, {id: `debt_${new Date().getTime()}`, ...debtToRestore} as Debt]);
    }
    
    toast({ title: "Receipt Restored", description: `Receipt #${saleToRestore.order_number} has been restored.` });
  
    await setVoidedLogs(prev => prev.filter(log => log.id !== logToRestore.id));
  };


  const handleExport = () => {
    let dataToExport: any[] = [];
    let reportName = "voided_receipts";
    
    dataToExport = filteredVoidedReceipts.map(log => ({
      "Order #": log.data.order_number,
      "Original Date": format(new Date(log.data.created_at!), "yyyy-MM-dd HH:mm"),
      "Voided Date": format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
      "Customer": log.data.customers?.name ?? 'Walk-in',
      "Original Employee": log.data.users?.name || "N/A",
      "Voided By": log.users?.name || "N/A",
      "Total": log.data.total.toFixed(2),
      "Payment Methods": log.data.payment_methods.join(", "),
      "Items": log.data.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join("; "),
    }));

    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no voided items to export for the current filters.",
        variant: "destructive"
      });
      return;
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Voided logs report has been downloaded." });
  };


  return (
    <div className="space-y-8">
       <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the voided log from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLogToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteVoidedLog(logToDelete!)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Voided Logs"
          description="Review all voided completed receipts."
        />
        <Button onClick={handleExport} variant="outline" size="sm" className="self-end sm:self-center">
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
        <CardTitle>Voided Receipts</CardTitle>
        <CardDescription>
            Review all voided sales transactions.
        </CardDescription>
        </CardHeader>
        <CardContent>
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 mb-4">
            <Input
            placeholder="Search by order, customer, item..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full sm:w-auto sm:max-w-xs"
            />
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map(user => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-full sm:w-[260px] justify-start text-left font-normal",
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
                        <span>Pick a void date range</span>
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
        <div className="overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Customer</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Payment</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : filteredVoidedReceipts.length > 0 ? (
                  filteredVoidedReceipts.map((log) => {
                    const saleData = log.data;
                    const categoriesForDisplay = getSaleCategoryNames(saleData.items as SaleItem[]);
                    return (
                      <TableRow key={log.id}>
                          <TableCell className="font-medium">#{saleData.order_number}</TableCell>
                          <TableCell className="hidden md:table-cell">{format(new Date(saleData.created_at!), "LLL dd, y HH:mm")}</TableCell>
                          <TableCell className="hidden sm:table-cell">{saleData.customers?.name ?? 'Walk-in'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                                <span>{saleData.users?.name || "N/A"}</span>
                                <span className="text-muted-foreground">Void: {log.users?.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                              {(saleData.items as SaleItem[]).map(item => `${item.name} (x${item.quantity})`).join(', ')}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                                {categoriesForDisplay.map(category => (
                                    <Badge key={category} variant="outline" className="whitespace-nowrap">{category}</Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{currency}{saleData.total?.toFixed(2)}</TableCell>
                          <TableCell className="text-center hidden lg:table-cell">
                            <div className="flex items-center justify-center gap-1">
                                {(saleData.payment_methods as string[]).map((method: string) => (
                                    <Badge key={method} variant={getPaymentBadgeVariant(method)} className="capitalize">
                                        {method}
                                    </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRestoreLog(log)} disabled={!hasRestorePermission}>
                                      <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setLogToDelete(log.id)} disabled={!hasDeletePermission}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                  <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                          No voided receipts found for the selected filters.
                      </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
        </CardContent>
    </Card>
    </div>
  );
}
