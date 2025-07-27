
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { type VoidedLog, type User } from "@/lib/types";

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
  const { voidedLogs, currency, users, categories } = useSettings();
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    employee: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const enrichedLogs = useMemo(() => {
    return voidedLogs.map(log => {
      const user = users.find(u => u.id === log.voided_by_employee_id);
      return {
        ...log,
        users: user ? { id: user.id, name: user.name } : null
      }
    }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [voidedLogs, users]);

  const filteredVoidedReceipts = useMemo(() => {
    const receiptLogs = enrichedLogs.filter(log => log.type === 'receipt');
    
    return receiptLogs.filter((log) => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      
      const searchMatch =
        filters.searchTerm === "" ||
        log.data.order_number?.toString().includes(searchTermLower) ||
        (log.data.customer_name ?? '').toLowerCase().includes(searchTermLower) ||
        (log.users?.name ?? '').toLowerCase().includes(searchTermLower) ||
        (log.data.items ?? '').toLowerCase().includes(searchTermLower);

      const employeeMatch = filters.employee === "all" || log.users?.name === filters.employee;
      
      const dateMatch =
        !dateRange?.from ||
        (new Date(log.created_at!) >= dateRange.from &&
          (!dateRange.to || new Date(log.created_at!) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));

      return searchMatch && employeeMatch && dateMatch;
    });
  }, [enrichedLogs, filters, dateRange]);

  const filteredVoidedTickets = useMemo(() => {
    return enrichedLogs.filter(log => log.type === 'ticket');
  }, [enrichedLogs]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voided Logs"
        description="Review all voided tickets and completed receipts."
      />
      <Tabs defaultValue="receipts">
        <TabsList>
            <TabsTrigger value="tickets">Voided Tickets</TabsTrigger>
            <TabsTrigger value="receipts">Voided Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets" className="pt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Voided Tickets</CardTitle>
                    <CardDescription>
                        A list of all deleted open tickets.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date Voided</TableHead>
                                <TableHead>Ticket Name</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Voided By</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {loading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                            ) : filteredVoidedTickets.length > 0 ? (
                                filteredVoidedTickets.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.created_at!), 'LLL dd, y HH:mm')}</TableCell>
                                        <TableCell className="font-medium">{log.data.ticket_name}</TableCell>
                                        <TableCell>{log.data.customer_name || 'N/A'}</TableCell>
                                        <TableCell>{log.users?.name ?? 'N/A'}</TableCell>
                                        <TableCell className="text-right">{currency}{log.data.ticket_total?.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No voided tickets found.
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
                <CardTitle>Voided Receipts</CardTitle>
                <CardDescription>
                    Review all voided sales transactions.
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
                    <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                        <SelectTrigger className="w-[180px]">
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
                        <TableHead>Date Voided</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Voided By</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
                    ) : filteredVoidedReceipts.length > 0 ? (
                        filteredVoidedReceipts.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="font-medium">#{log.data.order_number}</TableCell>
                            <TableCell>{format(new Date(log.created_at!), "LLL dd, y HH:mm")}</TableCell>
                            <TableCell>{log.data.customer_name ?? 'Walk-in'}</TableCell>
                            <TableCell>{log.users?.name}</TableCell>
                            <TableCell>
                                {log.data.items}
                            </TableCell>
                            <TableCell className="text-right">{currency}{log.data.receipt_total?.toFixed(2)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                No voided receipts found for the selected filters.
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
