
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
import { type Debt, type Sale } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Download, Coins, Search, Calendar as CalendarIcon, Wrench, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import { writeBatch, collection, doc } from "firebase/firestore";

export default function DebtsPage() {
  const { debts, setDebts, sales, users, customers, currency, setDebtToSettle, loggedInUser } = useSettings();
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "all",
    employee: "all",
    customer: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);

  const enrichedDebts = useMemo(() => {
    return debts
      .map(debt => {
        const sale = sales.find(s => s.id === debt.sale_id);
        const customer = customers.find(c => c.id === debt.customer_id);
        const user = sale ? users.find(u => u.id === sale.employee_id) : null;
        
        return {
          ...debt,
          sales: sale ? { ...sale, order_number: sale.order_number } : null,
          customers: customer || (debt.customers ? { name: debt.customers.name } : null),
          users: user,
        }
      })
      .filter((debt): debt is NonNullable<typeof debt> => debt !== null);
  }, [debts, sales, customers, users]);

  const filteredDebts = useMemo(() => {
    return enrichedDebts.filter(debt => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      const searchMatch =
        filters.searchTerm === "" ||
        debt.sales?.order_number?.toString().includes(searchTermLower) ||
        debt.customers?.name?.toLowerCase().includes(searchTermLower);
      
      const statusMatch = filters.status === 'all' || debt.status.toLowerCase() === filters.status;
      const employeeMatch = filters.employee === 'all' || debt.users?.id === filters.employee;
      const customerMatch = filters.customer === 'all' || debt.customers?.id === filters.customer;
      
      const dateMatch =
        !dateRange?.from ||
        (new Date(debt.created_at!) >= dateRange.from &&
          (!dateRange.to || new Date(debt.created_at!) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));
      
      return searchMatch && statusMatch && employeeMatch && customerMatch && dateMatch;
    });
  }, [enrichedDebts, filters, dateRange]);


  useEffect(() => {
    setLoading(false);
  }, []);

  const handleSettleDebt = (debt: (typeof filteredDebts)[0]) => {
    if (!debt.sales) {
        const temporarySale: Partial<Sale> = {
            id: debt.sale_id!,
            order_number: debt.sales?.order_number ?? 0,
            customer_id: debt.customer_id,
            total: debt.amount,
            items: [], 
        };
        setDebtToSettle(temporarySale as Sale);
        router.push("/sales");
        return;
    }
    setDebtToSettle(debt.sales as Sale);
    router.push("/sales");
  };

  const handleExport = () => {
    const dataToExport = filteredDebts.map(d => ({
        "Order #": d.sales?.order_number,
        "Customer": d.customers?.name,
        "Employee": d.users?.name || "N/A",
        "Date": format(new Date(d.created_at!), "LLL dd, y"),
        "Amount": d.amount.toFixed(2),
        "Status": d.status,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `debt_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Debt report has been downloaded." });
  };

  const handleCleanUpDuplicates = async () => {
    setIsCleaning(true);
    try {
        const debtsBySaleId = new Map<string, Debt[]>();
        debts.forEach(debt => {
            if (debt.sale_id) {
                if (!debtsBySaleId.has(debt.sale_id)) {
                    debtsBySaleId.set(debt.sale_id, []);
                }
                debtsBySaleId.get(debt.sale_id)!.push(debt);
            }
        });

        const batch = writeBatch(db);
        let duplicatesFound = 0;

        for (const [saleId, debtGroup] of debtsBySaleId.entries()) {
            if (debtGroup.length > 1) {
                // Sort by creation date to keep the oldest one
                const sortedDebts = debtGroup.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
                const debtsToDelete = sortedDebts.slice(1); // Keep the first (oldest), delete the rest

                debtsToDelete.forEach(dup => {
                    if (dup.id) {
                        batch.delete(doc(db, 'debts', dup.id));
                        duplicatesFound++;
                    }
                });
            }
        }

        if (duplicatesFound > 0) {
            await batch.commit();
            toast({ title: "Cleanup Complete", description: `${duplicatesFound} duplicate debt record(s) have been deleted.` });
        } else {
            toast({ title: "No Duplicates Found", description: "Your debt records are already clean." });
        }
    } catch (error: any) {
        toast({ title: "Cleanup Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsCleaning(false);
    }
  };


  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Debt Management"
            description="Track and recover outstanding credit sales."
          />
          <div className="flex items-center gap-2 self-end sm:self-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!isOnline}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Clean Up Duplicates
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete any duplicate debt records from the database. This action cannot be undone. It is recommended to do this only once.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanUpDuplicates} disabled={isCleaning}>
                      {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, Clean Up
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Debts</CardTitle>
            <CardDescription>
              A list of all credit sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 mb-4">
                <Input
                  placeholder="Search..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value}))}
                  className="w-full sm:w-auto sm:max-w-xs"
                />
                 <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={filters.customer} onValueChange={(value) => setFilters(prev => ({...prev, customer: value}))}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by customer" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.employee} onValueChange={(value) => setFilters(prev => ({...prev, employee: value}))}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by employee" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                </Popover>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredDebts.length > 0 ? (
                    filteredDebts.map((debt) => {
                      const canSettleDebt = hasPermission('MANAGE_CUSTOMERS') || loggedInUser?.id === debt.sales?.employee_id;
                      return (
                        <TableRow key={debt.id}>
                          <TableCell className="font-medium">{debt.sales?.order_number || '...'}</TableCell>
                          <TableCell>{debt.customers?.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{debt.users?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden md:table-cell">{format(new Date(debt.created_at!), "LLL dd, y")}</TableCell>
                          <TableCell className="text-right">{currency}{debt.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={debt.status === "Paid" ? "secondary" : "destructive"}>
                              {debt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {debt.status === "Unpaid" && canSettleDebt && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-block">
                                      <Button variant="outline" size="sm" onClick={() => handleSettleDebt(debt)} disabled={!isOnline}>
                                        <Coins className="mr-2 h-4 w-4" />
                                        Settle Debt
                                      </Button>
                                  </div>
                                </TooltipTrigger>
                                {!isOnline && <TooltipContent><p>Connect to the internet to settle debts.</p></TooltipContent>}
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No debts found for the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
