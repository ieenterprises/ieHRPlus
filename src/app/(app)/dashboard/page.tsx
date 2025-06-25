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
import { supabase } from "@/lib/supabase";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";

type MonthlySales = { name: string; total: number };

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
    async function fetchData() {
      setLoading(true);
      if (!supabase) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const lastMonth = subMonths(today, 1);
      
      const { data: sales, error: salesError } = await supabase.from('sales').select('total, created_at');
      const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact' });
      
      if (salesError || userError) {
        console.error("Error fetching dashboard data:", salesError || userError);
        setLoading(false);
        return;
      }
      
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalSales = sales.length;

      const salesToday = sales.filter(sale => new Date(sale.created_at!).toDateString() === today.toDateString());
      const ordersToday = salesToday.length;
      
      const salesLastMonth = sales.filter(sale => {
        const saleDate = new Date(sale.created_at!);
        return saleDate >= startOfMonth(lastMonth) && saleDate <= endOfMonth(lastMonth);
      });
      const revenueLastMonth = salesLastMonth.reduce((sum, sale) => sum + sale.total, 0);

      const revenueThisMonth = sales
        .filter(sale => new Date(sale.created_at!).getMonth() === today.getMonth())
        .reduce((sum, sale) => sum + sale.total, 0);
        
      const revenueGrowth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;

      setStats({
        totalRevenue: totalRevenue,
        ordersToday: ordersToday,
        totalSales: totalSales,
        activeStaff: userCount ?? 0,
      });
      
      // Prepare chart data for last 12 months
      const monthlySales: MonthlySales[] = [];
      for (let i = 11; i >= 0; i--) {
          const date = subMonths(today, i);
          const monthName = format(date, "MMM");
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);

          const totalForMonth = sales
              .filter(sale => {
                  const saleDate = new Date(sale.created_at!);
                  return saleDate >= monthStart && saleDate <= monthEnd;
              })
              .reduce((sum, sale) => sum + sale.total, 0);
          
          monthlySales.push({ name: monthName, total: totalForMonth });
      }

      setSalesData(monthlySales);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
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
