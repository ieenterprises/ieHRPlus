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

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setData([
      { name: "Jan", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Feb", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Mar", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Apr", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "May", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Jun", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Jul", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Aug", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Sep", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Oct", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Nov", total: Math.floor(Math.random() * 5000) + 1000 },
      { name: "Dec", total: Math.floor(Math.random() * 5000) + 1000 },
    ]);
  }, []);

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
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+235</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+4</div>
            <p className="text-xs text-muted-foreground">All staff currently active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <RechartsBarChart data={data}>
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
