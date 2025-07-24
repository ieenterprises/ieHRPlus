
"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { useState, useEffect } from "react";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Sale, Product, Category, User } from "@/lib/types";

type SalesData = {
    name: string;
    sales: number;
};

function SalesChart({ data, title }: { data: SalesData[], title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
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

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [salesByItem, setSalesByItem] = useState<SalesData[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesData[]>([]);
  const [salesByEmployee, setSalesByEmployee] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReportData = async () => {
      if (!supabase || !date?.from) return;
      setLoading(true);

      const fromDate = startOfDay(date.from).toISOString();
      const toDate = date.to ? endOfDay(date.to).toISOString() : endOfDay(new Date()).toISOString();

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*, users(name), items')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (salesError) {
        toast({ title: "Error fetching sales data", description: salesError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      
      const { data: products, error: productsError } = await supabase.from('products').select('id, category_id');
      const { data: categories, error: categoriesError } = await supabase.from('categories').select('id, name');

      if (productsError || categoriesError) {
        toast({ title: "Error fetching product/category data", description: productsError?.message || categoriesError?.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      
      // Process sales by item
      const itemSales = sales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
          acc[item.name] = (acc[item.name] || 0) + (item.price * item.quantity);
        });
        return acc;
      }, {} as Record<string, number>);
      setSalesByItem(Object.entries(itemSales).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales));
      
      // Process sales by category
      const categorySales = sales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = categories.find(c => c.id === product.category_id);
            if (category) {
              acc[category.name] = (acc[category.name] || 0) + (item.price * item.quantity);
            }
          }
        });
        return acc;
      }, {} as Record<string, number>);
      setSalesByCategory(Object.entries(categorySales).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales));

      // Process sales by employee
      const employeeSales = sales.reduce((acc, sale) => {
        const employeeName = (sale as any).users?.name || 'N/A';
        acc[employeeName] = (acc[employeeName] || 0) + sale.total;
        return acc;
      }, {} as Record<string, number>);
      setSalesByEmployee(Object.entries(employeeSales).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales));
      
      setLoading(false);
    };

    fetchReportData();
  }, [date, toast]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Sales Reports"
          description="Analyze your sales performance."
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
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
      </div>

      <Tabs defaultValue="item">
        <TabsList>
          <TabsTrigger value="item">By Item</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
        </TabsList>
        <TabsContent value="item" className="pt-4">
            {loading ? <p>Loading report...</p> : <SalesChart data={salesByItem} title="Sales by Item" />}
        </TabsContent>
        <TabsContent value="category" className="pt-4">
            {loading ? <p>Loading report...</p> : <SalesChart data={salesByCategory} title="Sales by Category" />}
        </TabsContent>
        <TabsContent value="employee" className="pt-4">
            {loading ? <p>Loading report...</p> : <SalesChart data={salesByEmployee} title="Sales by Employee" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
