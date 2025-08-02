
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
import { Calendar as CalendarIcon, Download, ListFilter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    sales: number; // Net sales (pre-tax)
    tax: number;
    netPayment: number; // Net sales + tax
    quantity?: number;
    transactions: number;
    cashSales: number;
    cardSales: number;
    creditSales: number;
};

type VisibleColumns = {
  netSales: boolean;
  tax: boolean;
  netPayment: boolean;
  itemsSold: boolean;
  transactions: boolean;
  cashSales: boolean;
  cardSales: boolean;
  creditSales: boolean;
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

function ReportTable({ data, dataKeyLabel, currency, visibleColumns }: { data: ReportDataPoint[], dataKeyLabel: string, currency: string, visibleColumns: VisibleColumns }) {
    const totalSales = useMemo(() => data.reduce((acc, item) => acc + item.sales, 0), [data]);
    const totalTax = useMemo(() => data.reduce((acc, item) => acc + item.tax, 0), [data]);
    const totalNetPayment = useMemo(() => data.reduce((acc, item) => acc + item.netPayment, 0), [data]);
    const totalQuantity = useMemo(() => data.reduce((acc, item) => acc + (item.quantity || 0), 0), [data]);
    const totalTransactions = useMemo(() => data.reduce((acc, item) => acc + item.transactions, 0), [data]);
    const totalCashSales = useMemo(() => data.reduce((acc, item) => acc + item.cashSales, 0), [data]);
    const totalCardSales = useMemo(() => data.reduce((acc, item) => acc + item.cardSales, 0), [data]);
    const totalCreditSales = useMemo(() => data.reduce((acc, item) => acc + item.creditSales, 0), [data]);
    
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
                                {visibleColumns.netSales && <TableHead className="text-right">Net Sales</TableHead>}
                                {visibleColumns.tax && <TableHead className="text-right">Tax</TableHead>}
                                {visibleColumns.netPayment && <TableHead className="text-right">Net Payment</TableHead>}
                                {visibleColumns.itemsSold && <TableHead className="text-right">Items Sold</TableHead>}
                                {visibleColumns.transactions && <TableHead className="text-right">Transactions</TableHead>}
                                {visibleColumns.cashSales && <TableHead className="text-right">Cash Sales</TableHead>}
                                {visibleColumns.cardSales && <TableHead className="text-right">Card Sales</TableHead>}
                                {visibleColumns.creditSales && <TableHead className="text-right">Credit Sales (Unpaid)</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    {visibleColumns.netSales && <TableCell className="text-right">{currency}{item.sales.toFixed(2)}</TableCell>}
                                    {visibleColumns.tax && <TableCell className="text-right">{currency}{item.tax.toFixed(2)}</TableCell>}
                                    {visibleColumns.netPayment && <TableCell className="text-right">{currency}{item.netPayment.toFixed(2)}</TableCell>}
                                    {visibleColumns.itemsSold && <TableCell className="text-right">{item.quantity}</TableCell>}
                                    {visibleColumns.transactions && <TableCell className="text-right">{item.transactions}</TableCell>}
                                    {visibleColumns.cashSales && <TableCell className="text-right">{currency}{item.cashSales.toFixed(2)}</TableCell>}
                                    {visibleColumns.cardSales && <TableCell className="text-right">{currency}{item.cardSales.toFixed(2)}</TableCell>}
                                    {visibleColumns.creditSales && <TableCell className="text-right">{currency}{item.creditSales.toFixed(2)}</TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold">
                                <TableCell>Total</TableCell>
                                {visibleColumns.netSales && <TableCell className="text-right">{currency}{totalSales.toFixed(2)}</TableCell>}
                                {visibleColumns.tax && <TableCell className="text-right">{currency}{totalTax.toFixed(2)}</TableCell>}
                                {visibleColumns.netPayment && <TableCell className="text-right">{currency}{totalNetPayment.toFixed(2)}</TableCell>}
                                {visibleColumns.itemsSold && <TableCell className="text-right">{totalQuantity}</TableCell>}
                                {visibleColumns.transactions && <TableCell className="text-right">{totalTransactions}</TableCell>}
                                {visibleColumns.cashSales && <TableCell className="text-right">{currency}{totalCashSales.toFixed(2)}</TableCell>}
                                {visibleColumns.cardSales && <TableCell className="text-right">{currency}{totalCardSales.toFixed(2)}</TableCell>}
                                {visibleColumns.creditSales && <TableCell className="text-right">{currency}{totalCreditSales.toFixed(2)}</TableCell>}
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
  
  const { stores, posDevices, paymentTypes, users, currency, sales, products, categories, taxes: allTaxes } = useSettings();

  const [filters, setFilters] = useState({
      storeId: 'all',
      deviceId: 'all',
      employeeId: 'all',
      paymentTypeId: 'all',
  });

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    netSales: true,
    tax: true,
    netPayment: true,
    itemsSold: true,
    transactions: true,
    cashSales: false,
    cardSales: false,
    creditSales: false,
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
      const defaultTax = allTaxes.find(t => t.is_default);

      let filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at!);
          let match = saleDate >= fromDate && saleDate <= toDate;

          if (filters.employeeId !== 'all') {
            match &&= sale.employee_id === filters.employeeId;
          }
          
          if (filters.deviceId !== 'all') {
              match &&= sale.pos_device_id === filters.deviceId;
          } else if (filters.storeId !== 'all') {
              const device = posDevices.find(d => d.id === sale.pos_device_id);
              match &&= device?.store_id === filters.storeId;
          }
          
          if (filters.paymentTypeId !== 'all') {
            const paymentType = paymentTypes.find(p => p.id === filters.paymentTypeId);
            if (paymentType) {
                match &&= sale.payment_methods.includes(paymentType.name);
            }
          }
          
          return match;
      });
      
      const getProratedPayments = (netSaleAmount: number, paymentMethods: string[]) => {
          const payments = { cashSales: 0, cardSales: 0, creditSales: 0 };
          const creditPayment = paymentTypes.find(p => p.type === 'Credit');

          if (paymentMethods.includes(creditPayment?.name || 'Credit')) {
              payments.creditSales = netSaleAmount;
          } else {
              const isCard = paymentTypes.some(p => paymentMethods.includes(p.name) && p.type === 'Card');
              if (isCard) {
                 payments.cardSales = netSaleAmount;
              } else {
                 payments.cashSales = netSaleAmount;
              }
          }
          return payments;
      }

      const getTaxAmount = (netAmount: number) => {
          if (!defaultTax) return 0;
          return netAmount * (defaultTax.rate / 100);
      }

      const createInitialDataPoint = (name: string): ReportDataPoint => ({
          name, sales: 0, tax: 0, netPayment: 0, quantity: 0, transactions: 0, cashSales: 0, cardSales: 0, creditSales: 0
      });

      const itemSales = filteredSales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
            const netAmount = item.price * item.quantity;
            const taxAmount = getTaxAmount(netAmount);
            const { cashSales, cardSales, creditSales } = getProratedPayments(netAmount, sale.payment_methods);
            
            acc[item.name] = acc[item.name] || createInitialDataPoint(item.name);
            acc[item.name].sales += netAmount;
            acc[item.name].tax += taxAmount;
            acc[item.name].netPayment += netAmount + taxAmount;
            acc[item.name].quantity! += item.quantity;
            acc[item.name].transactions += 1; // This is imperfect, will count transaction per item
            acc[item.name].cashSales += cashSales;
            acc[item.name].cardSales += cardSales;
            acc[item.name].creditSales += creditSales;
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
              const netAmount = item.price * item.quantity;
              const taxAmount = getTaxAmount(netAmount);
              const { cashSales, cardSales, creditSales } = getProratedPayments(netAmount, sale.payment_methods);

              acc[category.name] = acc[category.name] || createInitialDataPoint(category.name);
              acc[category.name].sales += netAmount;
              acc[category.name].tax += taxAmount;
              acc[category.name].netPayment += netAmount + taxAmount;
              acc[category.name].quantity! += item.quantity;
              acc[category.name].transactions++;
              acc[category.name].cashSales += cashSales;
              acc[category.name].cardSales += cardSales;
              acc[category.name].creditSales += creditSales;
            }
          }
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByCategory(Object.values(categorySales).sort((a, b) => b.sales - a.sales));

      const employeeSales = filteredSales.reduce((acc, sale) => {
        const employeeName = users.find(u => u.id === sale.employee_id)?.name || 'N/A';
        const netAmount = sale.total / (1 + ((defaultTax?.rate || 0) / 100));
        const taxAmount = sale.total - netAmount;
        const { cashSales, cardSales, creditSales } = getProratedPayments(netAmount, sale.payment_methods);

        acc[employeeName] = acc[employeeName] || createInitialDataPoint(employeeName);
        acc[employeeName].sales += netAmount;
        acc[employeeName].tax += taxAmount;
        acc[employeeName].netPayment += sale.total;
        acc[employeeName].quantity! += (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
        acc[employeeName].transactions++;
        acc[employeeName].cashSales += cashSales;
        acc[employeeName].cardSales += cardSales;
        acc[employeeName].creditSales += creditSales;
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByEmployee(Object.values(employeeSales).sort((a, b) => b.sales - a.sales));

      const paymentSales = filteredSales.reduce((acc, sale) => {
        const netAmount = sale.total / (1 + ((defaultTax?.rate || 0) / 100));
        const taxAmount = sale.total - netAmount;
        (sale.payment_methods as any[]).forEach(method => {
            const paymentType = paymentTypes.find(p => p.name === method)?.type || 'Other';
            
            acc[method] = acc[method] || createInitialDataPoint(method);
            acc[method].sales += netAmount; // Imperfect for split payments
            acc[method].tax += taxAmount;
            acc[method].netPayment += netAmount + taxAmount;
            acc[method].quantity! += (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
            acc[method].transactions++;
            
            if (paymentType === 'Credit') acc[method].creditSales += netAmount;
            else if (paymentType === 'Card') acc[method].cardSales += netAmount;
            else if (paymentType === 'Cash') acc[method].cashSales += netAmount;
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByPayment(Object.values(paymentSales).sort((a, b) => b.sales - a.sales));

      setLoading(false);
  }, [date, filters, sales, products, categories, users, posDevices, paymentTypes, allTaxes]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleColumnVisibilityChange = (column: keyof VisibleColumns, checked: boolean) => {
    setVisibleColumns(prev => ({...prev, [column]: checked }));
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
        "Tax": d.tax.toFixed(2),
        "Net Payment": d.netPayment.toFixed(2),
        "Items Sold": d.quantity,
        Transactions: d.transactions,
        "Cash Sales": d.cashSales.toFixed(2),
        "Card Sales": d.cardSales.toFixed(2),
        "Credit Sales (Unpaid)": d.creditSales.toFixed(2),
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
            <Select value={filters.paymentTypeId} onValueChange={(v) => handleFilterChange('paymentTypeId', v)}>
                <SelectTrigger><SelectValue placeholder="Filter by Payment Type"/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    {paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
            </Select>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Display Columns
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={visibleColumns.netSales} onCheckedChange={(c) => handleColumnVisibilityChange('netSales', c)}>Net Sales</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.tax} onCheckedChange={(c) => handleColumnVisibilityChange('tax', c)}>Tax</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.netPayment} onCheckedChange={(c) => handleColumnVisibilityChange('netPayment', c)}>Net Payment</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.itemsSold} onCheckedChange={(c) => handleColumnVisibilityChange('itemsSold', c)}>Items Sold</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.transactions} onCheckedChange={(c) => handleColumnVisibilityChange('transactions', c)}>Transactions</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.cashSales} onCheckedChange={(c) => handleColumnVisibilityChange('cashSales', c)}>Cash Sales</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.cardSales} onCheckedChange={(c) => handleColumnVisibilityChange('cardSales', c)}>Card Sales</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleColumns.creditSales} onCheckedChange={(c) => handleColumnVisibilityChange('creditSales', c)}>Credit Sales</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
                    <ReportTable data={salesByItem} dataKeyLabel="Item" currency={currency} visibleColumns={visibleColumns} />
                </>
            )}
        </TabsContent>
        <TabsContent value="category" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <>
                    <ReportChart data={salesByCategory} title="Sales by Category" currency={currency} />
                    <ReportTable data={salesByCategory} dataKeyLabel="Category" currency={currency} visibleColumns={visibleColumns} />
                </>
            )}
        </TabsContent>
        <TabsContent value="employee" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={salesByEmployee} title="Sales by Employee" currency={currency} />
                    <ReportTable data={salesByEmployee} dataKeyLabel="Employee" currency={currency} visibleColumns={visibleColumns} />
                </>
            )}
        </TabsContent>
         <TabsContent value="payment" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={salesByPayment} title="Sales by Payment Type" currency={currency} />
                    <ReportTable data={salesByPayment} dataKeyLabel="Payment Type" currency={currency} visibleColumns={visibleColumns} />
                </>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
