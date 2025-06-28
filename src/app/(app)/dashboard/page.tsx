"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Utensils, Users, BarChart } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useState, useEffect } from "react";
import { subMonths, format } from "date-fns";

type MonthlySales = { name: string; total: number };

// Mock Data
const MOCK_SALES_DATA: MonthlySales[] = [
  { name: "Jan", total: 1200 }, { name: "Feb", total: 1800 }, { name: "Mar", total: 2200 },
  { name: "Apr", total: 2500 }, { name: "May", total: 3100 }, { name: "Jun", total: 2900 },
  { name: "Jul", total: 3500 }, { name: "Aug", total: 3300 }, { name: "Sep", total: 4000 },
  { name: "Oct", total: 4200 }, { name: "Nov", total: 4800 }, { name: "Dec", total: 5500 },
];

const MOCK_STATS = {
    totalRevenue: 54231.89,
    ordersToday: 25,
    totalSales: 1234,
    activeStaff: 4
};


export default function DashboardPage() {
  const [salesData, setSalesData] = useState<MonthlySales[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ordersToday: 0,
    totalSales: 0,
    activeStaff: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate fetching data
    setTimeout(() => {
      setSalesData(MOCK_SALES_DATA);
      setStats(MOCK_STATS);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
        <div className="space-y-8">
            <PageHeader title="Dashboard" description="Loading dashboard data..." />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
                <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
                <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
                <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent>...</CardContent></Card>
            </div>
             <Card>
                <CardHeader><CardTitle>Sales Overview</CardTitle></CardHeader>
                <CardContent className="pl-2 h-[350px] flex items-center justify-center">
                    <p>Loading chart...</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Here's an overview of your business." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.ordersToday}</div>
            {/* <p className="text-xs text-muted-foreground">+180.1% from last month</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalSales}</div>
            {/* <p className="text-xs text-muted-foreground">+19% from last month</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.activeStaff}</div>
            <p className="text-xs text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <RechartsBarChart data={salesData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
