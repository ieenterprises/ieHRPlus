
"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, BarChart } from "lucide-react";
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
import { useSettings } from "@/hooks/use-settings";

type MonthlySales = { name: string; total: number };

export default function DashboardPage() {
  const { sales, users, currency } = useSettings();
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

    const monthlyTotals = sales.reduce((acc, sale) => {
        const month = format(new Date(sale.created_at!), 'MMM');
        acc[month] = (acc[month] || 0) + sale.total;
        return acc;
    }, {} as Record<string, number>);

    const chartData: MonthlySales[] = Array.from({ length: 12 }, (_, i) => {
        const d = subMonths(new Date(), i);
        return format(d, 'MMM');
    }).reverse().map(monthName => ({
        name: monthName,
        total: monthlyTotals[monthName] || 0,
    }));
    setSalesData(chartData);

    const today = new Date().toISOString().slice(0, 10);
    const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const ordersToday = sales.filter(s => s.created_at!.slice(0, 10) === today).length;
    
    setStats({
        totalRevenue: totalRevenue,
        ordersToday: ordersToday,
        totalSales: sales.length,
        activeStaff: users.length
    });
    
    setLoading(false);
  }, [sales, users]);

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
            <div className="text-2xl font-bold">{currency}{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.ordersToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
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
                tickFormatter={(value) => `${currency}${value}`}
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
