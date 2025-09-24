
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, getDaysInMonth, isWithinInterval, differenceInMilliseconds, getDay } from 'date-fns';
import type { User, TimeRecord, HRQuery, Reward } from '@/lib/types';
import Papa from "papaparse";
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type PayrollData = {
    user: User;
    remunerationPerDay: number;
    remunerationPerHour: number;
    expectedMonthlyHours: number;
    totalDurationHours: number;
    totalLatenessHours: number;
    overtimeHours: number;
    salaryAmount: number;
    queryCount: number;
    queryAmount: number;
    rewardCount: number;
    rewardAmount: number;
    netSalary: number;
};

export default function PayrollPage() {
    const { users, rewards, hrQueries, currency, loggedInUser } = useSettings();
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
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
            console.error("Error fetching time records for payroll:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch time records.' });
        });

        return () => unsubscribe();
    }, [loggedInUser?.businessId, toast]);

    const payrollData = useMemo((): PayrollData[] => {
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const daysInMonth = getDaysInMonth(selectedMonth);

        return users.map(user => {
            const userTimeRecords = timeRecords.filter(tr => tr.userId === user.id && isWithinInterval(new Date(tr.clockInTime), { start: monthStart, end: monthEnd }));
            const userRewards = rewards.filter(r => r.assigneeId === user.id && isWithinInterval(new Date(r.createdAt), { start: monthStart, end: monthEnd }));
            const userQueries = hrQueries.filter(q => q.assigneeId === user.id && isWithinInterval(new Date(q.createdAt), { start: monthStart, end: monthEnd }));
            
            const getExpectedWorkMinutes = (user: User): number => {
                if (!user?.defaultClockInTime || !user?.defaultClockOutTime) return 0;
                const [inHours, inMinutes] = user.defaultClockInTime.split(':').map(Number);
                const [outHours, outMinutes] = user.defaultClockOutTime.split(':').map(Number);
                let diff = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
                if (diff < 0) diff += 24 * 60;
                return diff;
            };

            const expectedWorkMinutesPerDay = getExpectedWorkMinutes(user);
            const expectedWorkHoursPerDay = expectedWorkMinutesPerDay / 60;
            const expectedMonthlyHours = expectedWorkHoursPerDay * (user.monthlyWorkingDays || daysInMonth);
            
            const remunerationPerDay = (user.remuneration || 0) / (user.monthlyWorkingDays || daysInMonth);
            const remunerationPerHour = remunerationPerDay / 24;

            const calculateLateness = (user: User, clockInTime: string): number => {
                if (!user?.defaultClockInTime) return 0;
                const actualClockIn = new Date(clockInTime);
                const [hours, minutes] = user.defaultClockInTime.split(':').map(Number);
                const defaultClockIn = new Date(actualClockIn);
                defaultClockIn.setHours(hours, minutes, 0, 0);
                if (actualClockIn > defaultClockIn) {
                    return differenceInMilliseconds(actualClockIn, defaultClockIn) / (1000 * 60 * 60);
                }
                return 0;
            };
            
            const calculateDuration = (startTime: string, endTime: string | null): number => {
                if (!endTime) return 0;
                const start = new Date(startTime);
                const end = new Date(endTime);
                
                if (end < start) return 0;
                
                const diffMs = end.getTime() - start.getTime();
                return diffMs / (1000 * 60 * 60); // convert milliseconds to hours
            };

            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            
            const calculateOvertimeForRecord = (record: TimeRecord, user: User): number => {
                const clockInDate = new Date(record.clockInTime);
                const dayOfWeek = daysOfWeek[getDay(clockInDate)];
                const isScheduledWorkday = user.workingDays?.includes(dayOfWeek) ?? true; // Default to true if not specified
                const durationHours = calculateDuration(record.clockInTime, record.clockOutTime);
                
                if (!isScheduledWorkday) {
                    return durationHours; // Entire shift is overtime
                }
                
                const expectedMinutes = getExpectedWorkMinutes(user);
                const durationMinutes = durationHours * 60;
                const overtime = Math.max(0, durationMinutes - expectedMinutes);
                return overtime / 60; // return in hours
            };

            const totalLatenessHours = userTimeRecords.reduce((acc, record) => acc + calculateLateness(user, record.clockInTime), 0);
            const totalDurationHours = userTimeRecords.reduce((acc, record) => acc + calculateDuration(record.clockInTime, record.clockOutTime), 0);
            const overtimeHours = userTimeRecords.reduce((acc, record) => acc + calculateOvertimeForRecord(record, user), 0);
            
            const queryAmount = userQueries.reduce((acc, q) => acc + (q.amount || 0), 0);
            const rewardAmount = userRewards.reduce((acc, r) => acc + (r.amount || 0), 0);
            
            const salaryAmount = remunerationPerHour * totalDurationHours;
            
            const netSalary = salaryAmount - queryAmount + rewardAmount;

            return {
                user,
                remunerationPerDay,
                remunerationPerHour: isFinite(remunerationPerHour) ? remunerationPerHour : 0,
                expectedMonthlyHours,
                totalDurationHours,
                totalLatenessHours,
                overtimeHours,
                salaryAmount,
                queryCount: userQueries.length,
                queryAmount,
                rewardCount: userRewards.length,
                rewardAmount,
                netSalary
            };
        });
    }, [selectedMonth, users, timeRecords, rewards, hrQueries]);

    const handleExportCSV = () => {
        const dataToExport = payrollData.map(p => ({
            "Employee": p.user.name,
            "Department": p.user.departmentName || 'N/A',
            "Base Salary": `${currency}${p.user.remuneration?.toFixed(2)}`,
            "Rate/Day": `${currency}${p.remunerationPerDay.toFixed(2)}`,
            "Rate/Hour": `${currency}${p.remunerationPerHour.toFixed(2)}`,
            "Expected Hours": p.expectedMonthlyHours.toFixed(2),
            "Sum of Duration (H)": p.totalDurationHours.toFixed(2),
            "Sum of Lateness (H)": p.totalLatenessHours.toFixed(2),
            "Sum of Overtime (H)": p.overtimeHours.toFixed(2),
            "Salary Amount": `${currency}${p.salaryAmount.toFixed(2)}`,
            "Query Count": p.queryCount,
            "Query Deductions": `${currency}${p.queryAmount.toFixed(2)}`,
            "Reward Count": p.rewardCount,
            "Reward Additions": `${currency}${p.rewardAmount.toFixed(2)}`,
            "Net Salary": `${currency}${p.netSalary.toFixed(2)}`,
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `payroll_${format(selectedMonth, 'yyyy-MM')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Complete" });
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Payroll Schedule" description="Calculate and review monthly salaries for all employees." />

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Payroll</CardTitle>
                            <CardDescription>Review salaries for all employees.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 self-end">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-[280px] justify-start text-left font-normal")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(selectedMonth, 'MMMM yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedMonth}
                                        onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                             <Button onClick={handleExportCSV} variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background">Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Base Salary</TableHead>
                                    <TableHead>Rate/Day</TableHead>
                                    <TableHead>Rate/Hour</TableHead>
                                    <TableHead>Expected Hours</TableHead>
                                    <TableHead>Sum of Duration Hours</TableHead>
                                    <TableHead>Sum of Lateness</TableHead>
                                    <TableHead>Sum of Overtime</TableHead>
                                    <TableHead>Salary Amount</TableHead>
                                    <TableHead>Query Count</TableHead>
                                    <TableHead>Query Amt</TableHead>
                                    <TableHead>Reward Count</TableHead>
                                    <TableHead>Reward Amt</TableHead>
                                    <TableHead className="text-right font-bold">Net Salary</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payrollData.map(({ user, ...data }) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium sticky left-0 bg-background">{user.name}</TableCell>
                                        <TableCell>{user.departmentName || 'N/A'}</TableCell>
                                        <TableCell>{currency}{user.remuneration?.toFixed(2) ?? '0.00'}</TableCell>
                                        <TableCell>{currency}{data.remunerationPerDay.toFixed(2)}</TableCell>
                                        <TableCell>{currency}{data.remunerationPerHour.toFixed(2)}</TableCell>
                                        <TableCell>{data.expectedMonthlyHours.toFixed(2)}</TableCell>
                                        <TableCell>{data.totalDurationHours.toFixed(2)}</TableCell>
                                        <TableCell className="text-destructive">{data.totalLatenessHours.toFixed(2)}</TableCell>
                                        <TableCell className="text-green-600">{data.overtimeHours.toFixed(2)}</TableCell>
                                        <TableCell>{currency}{data.salaryAmount.toFixed(2)}</TableCell>
                                        <TableCell>{data.queryCount}</TableCell>
                                        <TableCell className="text-destructive">{currency}{data.queryAmount.toFixed(2)}</TableCell>
                                        <TableCell>{data.rewardCount}</TableCell>
                                        <TableCell className="text-green-600">{currency}{data.rewardAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">{currency}{data.netSalary.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    


    

    

