
"use client";

import { useState, useEffect } from "react";
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
import { sales as initialSales, type Sale, type SaleItem, products as initialProducts, categories as initialCategories } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
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

const getSaleCategoryNames = (saleItems: Sale['items']): string[] => {
    const categoryIds = new Set(
        saleItems.map(item => {
            const product = initialProducts.find(p => p.name === item.name);
            return product?.category;
        }).filter((id): id is string => !!id)
    );

    return Array.from(categoryIds).map(id =>
        initialCategories.find(c => c.id === id)?.name || 'Unknown'
    );
};


export default function KitchenPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "all",
    paymentMethod: "all",
    status: "all",
    minAmount: "",
    maxAmount: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleFulfillOrder = (saleId: string) => {
    setSales((prevSales) =>
      prevSales.map((sale) =>
        sale.id === saleId ? { ...sale, status: "Fulfilled" } : sale
      )
    );
    toast({
      title: "Order Fulfilled",
      description: "The order has been marked as fulfilled.",
    });
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredSales = sales.filter((sale) => {
    const searchTermLower = filters.searchTerm.toLowerCase();
    
    const searchMatch =
      filters.searchTerm === "" ||
      sale.orderNumber.toString().includes(searchTermLower) ||
      sale.customerName.toLowerCase().includes(searchTermLower) ||
      sale.employeeName.toLowerCase().includes(searchTermLower) ||
      sale.items.some((item) => item.name.toLowerCase().includes(searchTermLower));
    
    const saleCategories = getSaleCategoryNames(sale.items);
    const categoryMatch = filters.category === "all" || saleCategories.includes(filters.category);
    
    const paymentMatch =
      filters.paymentMethod === "all" ||
      sale.paymentMethods.some(pm => pm === filters.paymentMethod);

    const statusMatch = filters.status === "all" || sale.status === filters.status;
    
    const dateMatch =
      !dateRange?.from ||
      (sale.date >= dateRange.from &&
        (!dateRange.to || sale.date <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));

    const minAmount = parseFloat(filters.minAmount);
    const maxAmount = parseFloat(filters.maxAmount);
    const amountMatch =
      (isNaN(minAmount) || sale.total >= minAmount) &&
      (isNaN(maxAmount) || sale.total <= maxAmount);

    return searchMatch && categoryMatch && paymentMatch && statusMatch && dateMatch && amountMatch;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Sales Feed"
        description="A real-time feed of all completed sales transactions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Showing the latest sales from all channels.
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
                    {initialCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
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
             <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Fulfilled">Fulfilled</SelectItem>
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
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const itemsToDisplay =
                  filters.category === "all"
                    ? sale.items
                    : sale.items.filter((item) => {
                        const product = initialProducts.find((p) => p.name === item.name);
                        if (!product) return false;
                        const category = initialCategories.find(
                          (c) => c.id === product.category
                        );
                        return category?.name === filters.category;
                      });

                const totalForDisplay = itemsToDisplay.reduce((acc, item) => {
                  const product = initialProducts.find((p) => p.name === item.name);
                  return acc + (product ? product.price * item.quantity : 0);
                }, 0);
                
                const categoriesForDisplay = getSaleCategoryNames(itemsToDisplay);

                return (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">#{sale.orderNumber}</TableCell>
                  <TableCell>{isClient ? format(sale.date, "LLL dd, y HH:mm") : null}</TableCell>
                  <TableCell className="hidden sm:table-cell">{sale.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{sale.employeeName}</TableCell>
                   <TableCell>
                     {itemsToDisplay.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                   </TableCell>
                   <TableCell>
                     <div className="flex flex-wrap gap-1">
                        {categoriesForDisplay.map(category => (
                            <Badge key={category} variant="outline" className="whitespace-nowrap">{category}</Badge>
                        ))}
                     </div>
                   </TableCell>
                  <TableCell className="text-right">${totalForDisplay.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        {sale.paymentMethods.map(method => (
                             <Badge key={method} variant={getPaymentBadgeVariant(method)} className="capitalize">
                                {method}
                            </Badge>
                        ))}
                    </div>
                  </TableCell>
                   <TableCell>
                    <Badge variant={sale.status === 'Fulfilled' ? 'secondary' : 'default'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                   <TableCell>
                    {sale.status === 'Pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleFulfillOrder(sale.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Fulfill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )})}
               {filteredSales.length === 0 && (
                <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                        No sales found for the selected filters.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

