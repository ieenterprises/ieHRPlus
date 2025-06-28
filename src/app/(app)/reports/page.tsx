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
import { subDays, format } from "date-fns";
import { cn } from "@/lib/utils";

type SalesData = {
    name: string;
    sales: number;
};

// Mock Data
const MOCK_SALES_BY_ITEM: SalesData[] = [
    { name: "Cheeseburger", sales: 4500.50 },
    { name: "Fries", sales: 2200.00 },
    { name: "Cola", sales: 1800.75 },
    { name: "T-Shirt", sales: 3200.00 },
    { name: "King Suite", sales: 15000.00 },
];

const MOCK_SALES_BY_CATEGORY: SalesData[] = [
    { name: "Room", sales: 15000.00 },
    { name: "Food", sales: 6700.50 },
    { name: "Merchandise", sales: 3200.00 },
    { name: "Beverages", sales: 1800.75 },
];

const MOCK_SALES_BY_EMPLOYEE: SalesData[] = [
    { name: "Admin", sales: 20500.25 },
    { name: "John Cashier", sales: 16201.00 },
];

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

  useEffect(() => {
    setLoading(true);
    // Simulate fetching and processing report data
    setTimeout(() => {
        setSalesByItem(MOCK_SALES_BY_ITEM);
        setSalesByCategory(MOCK_SALES_BY_CATEGORY);
        setSalesByEmployee(MOCK_SALES_BY_EMPLOYEE);
        setLoading(false);
    }, 500);
  }, [date]);

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
