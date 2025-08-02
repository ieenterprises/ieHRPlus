
"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { useState, useEffect, useMemo } from "react";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import type { Product, Category, User, StoreType, PosDeviceType, PaymentType } from "@/lib/types";
import Papa from "papaparse";

type ReportDataPoint = {
    name: string;
    sales: number;
    quantity?: number;
    transactions: number;
};

function ReportChart({ data, title, currency }: { data: ReportDataPoint[], title: string, currency: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value}`} />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))" }}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
            />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ReportTable({ data, dataKeyLabel, currency }: { data: ReportDataPoint[], dataKeyLabel: string, currency: string }) {
    const totalSales = useMemo(() => data.reduce((acc, item) => acc + item.sales, 0), [data]);
    const totalQuantity = useMemo(() => data.reduce((acc, item) => acc + (item.quantity || 0), 0), [data]);
    const totalTransactions = useMemo(() => data.reduce((acc, item) => acc + item.transactions, 0), [data]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Detailed Report</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{dataKeyLabel}</TableHead>
                                <TableHead className="text-right">Net Sales</TableHead>
                                <TableHead className="text-right">Items Sold</TableHead>
                                <TableHead className="text-right">Transactions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right">{currency}{item.sales.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.transactions}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{currency}{totalSales.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{totalQuantity}</TableCell>
                                <TableCell className="text-right">{totalTransactions}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    )
}

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const { stores, posDevices, paymentTypes, users, currency, sales, products, categories } = useSettings();

  const [filters, setFilters] = useState({
      storeId: 'all',
      deviceId: 'all',
      employeeId: 'all',
      paymentType: 'all',
  });

  const [activeTab, setActiveTab] = useState("item");
  const [salesByItem, setSalesByItem] = useState<ReportDataPoint[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<ReportDataPoint[]>([]);
  const [salesByEmployee, setSalesByEmployee] = useState<ReportDataPoint[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<ReportDataPoint[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const availableDevices = useMemo(() => {
    if (filters.storeId === 'all') return posDevices;
    return posDevices.filter(d => d.store_id === filters.storeId);
  }, [filters.storeId, posDevices]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, deviceId: 'all' }));
  }, [filters.storeId]);

  useEffect(() => {
      setLoading(true);
      if (!date?.from) return;

      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(new Date());

      let filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at!);
          let match = saleDate >= fromDate && saleDate <= toDate;

          if (filters.employeeId !== 'all') {
            match &&= sale.employee_id === filters.employeeId;
          }
          
          if (filters.paymentType !== 'all') {
            match &&= sale.payment_methods.includes(filters.paymentType);
          }
          
          if (filters.deviceId !== 'all') {
              match &&= sale.pos_device_id === filters.deviceId;
          } else if (filters.storeId !== 'all') {
              const device = posDevices.find(d => d.id === sale.pos_device_id);
              match &&= device?.store_id === filters.storeId;
          }
          
          return match;
      });
      
      const itemSales = filteredSales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
            acc[item.name] = acc[item.name] || { name: item.name, sales: 0, quantity: 0, transactions: 0 };
            acc[item.name].sales += item.price * item.quantity;
            acc[item.name].quantity += item.quantity;
            acc[item.name].transactions += 1; // This is imperfect, will count transaction per item
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByItem(Object.values(itemSales).sort((a, b) => b.sales - a.sales));
      
      const categorySales = filteredSales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = categories.find(c => c.id === product.category_id);
            if (category) {
              acc[category.name] = acc[category.name] || { name: category.name, sales: 0, quantity: 0, transactions: 0 };
              acc[category.name].sales += (item.price * item.quantity);
              acc[category.name].quantity += item.quantity;
              acc[category.name].transactions++;
            }
          }
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByCategory(Object.values(categorySales).sort((a, b) => b.sales - a.sales));

      const employeeSales = filteredSales.reduce((acc, sale) => {
        const employeeName = users.find(u => u.id === sale.employee_id)?.name || 'N/A';
        acc[employeeName] = acc[employeeName] || { name: employeeName, sales: 0, quantity: 0, transactions: 0 };
        acc[employeeName].sales += sale.total;
        acc[employeeName].quantity += (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
        acc[employeeName].transactions++;
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByEmployee(Object.values(employeeSales).sort((a, b) => b.sales - a.sales));

      const paymentSales = filteredSales.reduce((acc, sale) => {
        (sale.payment_methods as any[]).forEach(method => {
            acc[method] = acc[method] || { name: method, sales: 0, quantity: 0, transactions: 0};
            acc[method].sales += sale.total; // Imperfect for split payments
            acc[method].quantity += (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
            acc[method].transactions++;
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByPayment(Object.values(paymentSales).sort((a, b) => b.sales - a.sales));

      setLoading(false);
  }, [date, filters, sales, products, categories, users, posDevices]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleExport = () => {
    let dataToExport: any[] = [];
    let reportName = activeTab;

    switch(activeTab) {
      case 'item': dataToExport = salesByItem; break;
      case 'category': dataToExport = salesByCategory; break;
      case 'employee': dataToExport = salesByEmployee; break;
      case 'payment': dataToExport = salesByPayment; break;
    }

    const csv = Papa.unparse(dataToExport.map(d => ({
        Name: d.name,
        "Net Sales": d.sales.toFixed(2),
        "Items Sold": d.quantity,
        Transactions: d.transactions,
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportName}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Report has been downloaded." });
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Sales Reports"
          description="Analyze your sales performance."
        />
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                    </>
                    ) : (
                    format(date.from, "LLL dd, y")
                    )
                ) : (
                    <span>Pick a date</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                />
            </PopoverContent>
            </Popover>
            <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2 sm:mr-0"/> <span className="sm:hidden">Export</span></Button>
        </div>
      </div>

    <Card>
        <CardHeader>
            <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={filters.storeId} onValueChange={(v) => handleFilterChange('storeId', v)}>
                <SelectTrigger><SelectValue placeholder="Filter by Store"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.deviceId} onValueChange={(v) => handleFilterChange('deviceId', v)} disabled={filters.storeId === 'all' && availableDevices.length === 0}>
                <SelectTrigger><SelectValue placeholder="Filter by Device"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    {availableDevices.map(device => <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.employeeId} onValueChange={(v) => handleFilterChange('employeeId', v)}>
                <SelectTrigger><SelectValue placeholder="Filter by Employee"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={filters.paymentType} onValueChange={(v) => handleFilterChange('paymentType', v)}>
                <SelectTrigger><SelectValue placeholder="Filter by Payment Type"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    {paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </CardContent>
    </Card>

      <Tabs defaultValue="item" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="item">By Item</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="payment">By Payment Type</TabsTrigger>
        </TabsList>
        
        <TabsContent value="item" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <>
                    <ReportChart data={salesByItem} title="Sales by Item" currency={currency} />
                    <ReportTable data={salesByItem} dataKeyLabel="Item" currency={currency} />
                </>
            )}
        </TabsContent>
        <TabsContent value="category" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <>
                    <ReportChart data={salesByCategory} title="Sales by Category" currency={currency} />
                    <ReportTable data={salesByCategory} dataKeyLabel="Category" currency={currency} />
                </>
            )}
        </TabsContent>
        <TabsContent value="employee" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={salesByEmployee} title="Sales by Employee" currency={currency} />
                    <ReportTable data={salesByEmployee} dataKeyLabel="Employee" currency={currency} />
                </>
            )}
        </TabsContent>
         <TabsContent value="payment" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={salesByPayment} title="Sales by Payment Type" currency={currency} />
                    <ReportTable data={salesByPayment} dataKeyLabel="Payment Type" currency={currency} />
                </>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
