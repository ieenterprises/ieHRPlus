
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, User as UserIcon, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInMilliseconds, getDay, parseISO } from 'date-fns';
import type { User, TimeRecord, HRQuery, Reward } from '@/lib/types';
import Papa from "papaparse";
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DateRange } from "react-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type PerformanceData = {
    user: User;
    totalWorkDays: number;
    daysLate: number;
    totalLatenessMinutes: number;
    onTimeArrivals: number;
    overtimeHours: number;
    rewardCount: number;
    rewardAmount: number;
    queryCount: number;
    queryAmount: number;
};

const barChartConfig = {
    lateness: {
        label: "Lateness (min)",
        color: "hsl(var(--destructive))",
    },
    overtime: {
        label: "Overtime (hrs)",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

const attendanceChartConfig = {
    onTime: {
        label: "On-Time",
        color: "hsl(var(--chart-2))",
    },
    late: {
        label: "Late",
        color: "hsl(var(--destructive))",
    },
} satisfies ChartConfig;

const financialChartConfig = {
    rewards: {
        label: "Rewards",
        color: "hsl(var(--chart-2))",
    },
    deductions: {
        label: "Deductions",
        color: "hsl(var(--destructive))",
    },
} satisfies ChartConfig;

export default function PerformancePage() {
    const { users, rewards, hrQueries, currency, loggedInUser } = useSettings();
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const { toast } = useToast();

    useEffect(() => {
        if (!loggedInUser?.businessId) return;

        const q = query(
          collection(db, "timeRecords"),
          where("businessId", "==", loggedInUser.businessId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeRecord));
            setTimeRecords(allRecords);
        }, (error) => {
            console.error("Error fetching time records for performance:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch time records.' });
        });

        return () => unsubscribe();
    }, [loggedInUser?.businessId, toast]);

    const performanceData = useMemo((): PerformanceData[] => {
        const monthStart = dateRange?.from ? dateRange.from : startOfMonth(new Date());
        const monthEnd = dateRange?.to ? dateRange.to : endOfMonth(new Date());

        const targetUsers = selectedEmployeeId === 'all' ? users : users.filter(u => u.id === selectedEmployeeId);

        return targetUsers.map(user => {
            const userTimeRecords = timeRecords.filter(tr => tr.userId === user.id && isWithinInterval(parseISO(tr.clockInTime), { start: monthStart, end: monthEnd }));
            const userRewards = rewards.filter(r => r.assigneeId === user.id && isWithinInterval(parseISO(r.createdAt), { start: monthStart, end: monthEnd }));
            const userQueries = hrQueries.filter(q => q.assigneeId === user.id && isWithinInterval(parseISO(q.createdAt), { start: monthStart, end: monthEnd }));

            let daysLate = 0;
            let totalLatenessMinutes = 0;
            let onTimeArrivals = 0;

            userTimeRecords.forEach(record => {
                if (user.defaultClockInTime) {
                    const actualClockIn = parseISO(record.clockInTime);
                    const [hours, minutes] = user.defaultClockInTime.split(':').map(Number);
                    const defaultClockIn = new Date(actualClockIn);
                    defaultClockIn.setHours(hours, minutes, 0, 0);

                    if (actualClockIn > defaultClockIn) {
                        daysLate++;
                        totalLatenessMinutes += differenceInMilliseconds(actualClockIn, defaultClockIn) / 60000;
                    } else {
                        onTimeArrivals++;
                    }
                }
            });

            const overtimeMs = userTimeRecords.reduce((total, record) => {
                if (!record.clockOutTime || !user.defaultClockOutTime) return total;
                const actualClockOut = parseISO(record.clockOutTime);
                const [hours, minutes] = user.defaultClockOutTime.split(':').map(Number);
                const defaultClockOut = new Date(actualClockOut);
                defaultClockOut.setHours(hours, minutes, 0, 0);
                
                if (actualClockOut > defaultClockOut) {
                    return total + differenceInMilliseconds(actualClockOut, defaultClockOut);
                }
                return total;
            }, 0);

            return {
                user,
                totalWorkDays: userTimeRecords.length,
                daysLate,
                totalLatenessMinutes: Math.round(totalLatenessMinutes),
                onTimeArrivals,
                overtimeHours: overtimeMs / (1000 * 60 * 60),
                rewardCount: userRewards.length,
                rewardAmount: userRewards.reduce((acc, r) => acc + (r.amount || 0), 0),
                queryCount: userQueries.length,
                queryAmount: userQueries.reduce((acc, q) => q.amount || 0, 0),
            };
        });
    }, [dateRange, selectedEmployeeId, users, timeRecords, rewards, hrQueries]);
    
    const aggregatedStats = useMemo(() => {
        const totalWorkDays = performanceData.reduce((acc, p) => acc + p.totalWorkDays, 0);
        const totalOnTime = performanceData.reduce((acc, p) => acc + p.onTimeArrivals, 0);
        const totalLate = performanceData.reduce((acc, p) => acc + p.daysLate, 0);
        const totalOvertime = performanceData.reduce((acc, p) => acc + p.overtimeHours, 0);
        const totalRewards = performanceData.reduce((acc, p) => acc + p.rewardAmount, 0);
        const totalDeductions = performanceData.reduce((acc, p) => acc + p.queryAmount, 0);
        
        return {
            totalWorkDays,
            totalOnTime,
            totalLate,
            punctualityScore: totalWorkDays > 0 ? (totalOnTime / totalWorkDays) * 100 : 0,
            totalOvertime: totalOvertime,
            netFinancialImpact: totalRewards - totalDeductions,
        };
    }, [performanceData]);

    const barChartData = useMemo(() => {
        return performanceData.map(p => ({
            name: p.user.name.split(' ')[0],
            lateness: p.totalLatenessMinutes,
            overtime: parseFloat(p.overtimeHours.toFixed(2)),
        }));
    }, [performanceData]);
    
    const attendanceChartData = useMemo(() => {
        return performanceData.map(p => ({
            name: p.user.name.split(' ')[0],
            onTime: p.onTimeArrivals,
            late: p.daysLate,
        }));
    }, [performanceData]);
    
    const financialChartData = useMemo(() => {
        return performanceData.map(p => ({
            name: p.user.name.split(' ')[0],
            rewards: p.rewardAmount,
            deductions: p.queryAmount,
        }));
    }, [performanceData]);

    const punctualityPieChartData = useMemo(() => {
        return [
            { name: 'On-Time', value: aggregatedStats.totalOnTime, fill: 'hsl(var(--chart-2))' },
            { name: 'Late', value: aggregatedStats.totalLate, fill: 'hsl(var(--destructive))' },
        ];
    }, [aggregatedStats]);

    const handleExportCSV = () => {
        const dataToExport = performanceData.map(p => ({
            "Employee": p.user.name,
            "Department": p.user.departmentName || 'N/A',
            "Total Days Worked": p.totalWorkDays,
            "On-Time Arrivals": p.onTimeArrivals,
            "Days Late": p.daysLate,
            "Total Lateness (Minutes)": p.totalLatenessMinutes,
            "Overtime (Hours)": p.overtimeHours.toFixed(2),
            "Rewards Count": p.rewardCount,
            "Rewards Amount": `${currency}${p.rewardAmount.toFixed(2)}`,
            "Queries / Deductions Count": p.queryCount,
            "Queries / Deductions Amount": `${currency}${p.queryAmount.toFixed(2)}`,
        }));

        if (dataToExport.length === 0) {
            toast({ title: "No data to export." });
            return;
        }

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `performance_report_${format(new Date(), 'yyyy-MM')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Complete" });
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Performance Dashboard" description="Analyze key performance indicators for all employees." />

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>Select an employee and date range to analyze performance.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full sm:w-[280px] justify-start text-left font-normal")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
                                            ) : (
                                                format(dateRange.from, 'LLL dd, y')
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="range"
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                             <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Work Days</CardTitle>
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregatedStats.totalWorkDays}</div>
                        <p className="text-xs text-muted-foreground">in selected period</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Punctuality Score</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregatedStats.punctualityScore.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">On-time arrivals</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Overtime</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregatedStats.totalOvertime.toFixed(2)} hrs</div>
                        <p className="text-xs text-muted-foreground">Accumulated across selections</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Financial Impact</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${aggregatedStats.netFinancialImpact >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {currency}{aggregatedStats.netFinancialImpact.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Rewards minus deductions</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Lateness vs. Overtime</CardTitle>
                        <CardDescription>This can help identify interesting patterns, such as whether employees who are frequently late also tend to work overtime.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={barChartConfig} className="min-h-[250px] w-full">
                            <BarChart data={barChartData} >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--destructive))" />
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="lateness" fill="var(--color-lateness)" radius={4} />
                                <Bar yAxisId="right" dataKey="overtime" fill="var(--color-overtime)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Punctuality</CardTitle>
                        <CardDescription>A high-level view of the ratio of on-time to late arrivals for the selected employees and date range.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                         <ChartContainer config={{}} className="min-h-[250px] w-full max-w-sm">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                                <Pie
                                    data={punctualityPieChartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                                                {`${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                     {punctualityPieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Attendance Breakdown</CardTitle>
                        <CardDescription>Compare the proportion of on-time versus late days for each individual employee in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={attendanceChartConfig} className="min-h-[250px] w-full">
                            <BarChart data={attendanceChartData} layout="vertical" stackOffset="expand">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="onTime" fill="var(--color-onTime)" stackId="a" />
                                <Bar dataKey="late" fill="var(--color-late)" stackId="a" />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Impact</CardTitle>
                        <CardDescription>Visualize the monetary value of rewards given versus deductions vis-à-vis queries for each employee.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={financialChartConfig} className="min-h-[250px] w-full">
                            <BarChart data={financialChartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="rewards" fill="var(--color-rewards)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="deductions" fill="var(--color-deductions)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee Performance Details</CardTitle>
                    <CardDescription>Detailed data table for attendance, rewards, and deductions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background">Employee</TableHead>
                                    <TableHead>Days Worked</TableHead>
                                    <TableHead>On-Time</TableHead>
                                    <TableHead>Late Days</TableHead>
                                    <TableHead>Lateness (min)</TableHead>
                                    <TableHead>Overtime (hrs)</TableHead>
                                    <TableHead>Rewards (#)</TableHead>
                                    <TableHead>Rewards Amt</TableHead>
                                    <TableHead>Queries (#)</TableHead>
                                    <TableHead>Queries Amt</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {performanceData.length > 0 ? performanceData.map(({ user, ...data }) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium sticky left-0 bg-background">
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p>{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.departmentName || 'N/A'}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>{data.totalWorkDays}</TableCell>
                                        <TableCell className="text-green-600">{data.onTimeArrivals}</TableCell>
                                        <TableCell className="text-destructive">{data.daysLate}</TableCell>
                                        <TableCell className="text-destructive">{data.totalLatenessMinutes}</TableCell>
                                        <TableCell className="text-green-600">{data.overtimeHours.toFixed(2)}</TableCell>
                                        <TableCell>{data.rewardCount}</TableCell>
                                        <TableCell className="text-green-600">{currency}{data.rewardAmount.toFixed(2)}</TableCell>
                                        <TableCell>{data.queryCount}</TableCell>
                                        <TableCell className="text-destructive">{currency}{data.queryAmount.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center">
                                            No performance data for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    

    