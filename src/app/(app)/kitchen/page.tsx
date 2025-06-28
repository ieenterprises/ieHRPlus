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
import { type Sale, type Product, type Category, type User } from "@/lib/types";
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

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'Food', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_2', name: 'Beverages', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_3', name: 'Merchandise', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_4', name: 'Room', created_at: "2023-01-01T10:00:00Z" },
];

const MOCK_PRODUCTS: Product[] = [
    { id: 'prod_1', name: 'Cheeseburger', price: 12.99, stock: 50, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_2', name: 'Fries', price: 4.50, stock: 100, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_3', name: 'Cola', price: 2.50, stock: 200, category_id: 'cat_2', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_4', name: 'T-Shirt', price: 25.00, stock: 30, category_id: 'cat_3', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
];

const MOCK_USERS: User[] = [
    { id: "user_1", name: "Admin", email: "admin@orderflow.com", role: "Owner", pin: "1111", permissions: [], avatar_url: '', created_at: "2023-01-01T10:00:00Z" },
    { id: "user_2", name: "John Cashier", email: "john.c@orderflow.com", role: "Cashier", pin: "1234", permissions: [], avatar_url: '', created_at: "2023-01-01T10:00:00Z" },
];

const MOCK_SALES: Sale[] = [
    { id: 'sale_1', order_number: 1001, total: 17.49, status: 'Pending', created_at: new Date().toISOString(), employee_id: 'user_2', customer_id: 'cust_1', items: [{id: 'prod_1', name: 'Cheeseburger', quantity: 1, price: 12.99}, {id: 'prod_2', name: 'Fries', quantity: 1, price: 4.50}], payment_methods: ['Cash'], customers: {name: 'Walk-in'}, users: {name: 'John Cashier'} },
    { id: 'sale_2', order_number: 1002, total: 27.50, status: 'Fulfilled', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), employee_id: 'user_2', customer_id: 'cust_2', items: [{id: 'prod_4', name: 'T-Shirt', quantity: 1, price: 25.00}, {id: 'prod_3', name: 'Cola', quantity: 1, price: 2.50}], payment_methods: ['Card'], customers: {name: 'Alice Johnson'}, users: {name: 'John Cashier'} },
    { id: 'sale_3', order_number: 1003, total: 2.50, status: 'Pending', created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), employee_id: 'user_2', customer_id: 'cust_1', items: [{id: 'prod_3', name: 'Cola', quantity: 1, price: 2.50}], payment_methods: ['Cash'], customers: {name: 'Walk-in'}, users: {name: 'John Cashier'} },
];


export default function KitchenPage() {
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "all",
    paymentMethod: "all",
    status: "all",
    employee: "all",
    minAmount: "",
    maxAmount: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleFulfillOrder = async (saleId: string) => {
    try {
        setSales((prevSales) =>
            prevSales.map((sale) =>
                sale.id === saleId ? { ...sale, status: "Fulfilled" } : sale
            )
        );
        toast({
            title: "Order Fulfilled",
            description: "The order has been marked as fulfilled.",
        });
    } catch (error: any) {
        toast({ title: "Error", description: "Could not fulfill order.", variant: "destructive" });
    }
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getCategoryFromId = (id: string) => categories.find(c => c.id === id);

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

  const filteredSales = sales.filter((sale) => {
    const searchTermLower = filters.searchTerm.toLowerCase();
    
    const searchMatch =
      filters.searchTerm === "" ||
      sale.order_number.toString().includes(searchTermLower) ||
      (sale.customers?.name ?? 'Walk-in').toLowerCase().includes(searchTermLower) ||
      (sale.users?.name ?? '').toLowerCase().includes(searchTermLower) ||
      sale.items.some((item) => item.name.toLowerCase().includes(searchTermLower));
    
    const saleCategories = getSaleCategoryNames(sale.items);
    const categoryMatch = filters.category === "all" || saleCategories.some(catName => getCategoryFromId(categories.find(c=>c.name === filters.category)?.id ?? "")?.name === catName);
    
    const paymentMatch =
      filters.paymentMethod === "all" ||
      sale.payment_methods.some(pm => pm === filters.paymentMethod);

    const statusMatch = filters.status === "all" || sale.status === filters.status;
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

    return searchMatch && categoryMatch && paymentMatch && statusMatch && dateMatch && amountMatch && employeeMatch;
  }).map(sale => {
      const displayItems = filters.category === 'all'
        ? sale.items
        : sale.items.filter(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return false;
            const category = getCategoryFromId(product.category_id!);
            const filterCategory = categories.find(c => c.name === filters.category);
            return category?.id === filterCategory?.id;
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
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
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
                )})
              ) : (
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
