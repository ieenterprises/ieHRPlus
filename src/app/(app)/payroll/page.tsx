
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
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInMilliseconds, getDay, startOfDay } from 'date-fns';
import type { User, TimeRecord, HRQuery, Reward } from '@/lib/types';
import Papa from "papaparse";
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from "react-day-picker";

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
    const { users, rewards, hrQueries, currency, loggedInUser, timeRecords: allTimeRecords } = useSettings();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const { toast } = useToast();


    const payrollData = useMemo((): PayrollData[] => {
        const rangeStart = dateRange?.from ? startOfDay(dateRange.from) : startOfMonth(new Date());
        const rangeEnd = dateRange?.to ? endOfMonth(dateRange.to) : endOfMonth(new Date());
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        return users.map(user => {
            const userTimeRecords = allTimeRecords.filter(tr => tr.userId === user.id && isWithinInterval(new Date(tr.clockInTime), { start: rangeStart, end: rangeEnd }));
            const userRewards = rewards.filter(r => r.assigneeId === user.id && isWithinInterval(new Date(r.createdAt), { start: rangeStart, end: rangeEnd }));
            const userQueries = hrQueries.filter(q => q.assigneeId === user.id && isWithinInterval(new Date(q.createdAt), { start: rangeStart, end: rangeEnd }));
            
            const getExpectedWorkMinutes = (user: User): number => {
                if (!user.defaultClockInTime || !user.defaultClockOutTime) return 0;
                const [inHours, inMinutes] = user.defaultClockInTime.split(':').map(Number);
                const [outHours, outMinutes] = user.defaultClockOutTime.split(':').map(Number);
                let diff = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
                if (diff < 0) diff += 24 * 60; // Handle overnight
                return diff;
            };

            const expectedDailyMinutes = getExpectedWorkMinutes(user);
            const expectedMonthlyHours = (expectedDailyMinutes / 60) * (user.monthlyWorkingDays || 0);

            const remunerationPerDay = (user.monthlyWorkingDays || 0) > 0 ? (user.remuneration || 0) / (user.monthlyWorkingDays || 1) : 0;
            const remunerationPerHour = expectedMonthlyHours > 0 ? (user.remuneration || 0) / expectedMonthlyHours : 0;
            
            const calculateDuration = (startTime: string, endTime: string | null): number => {
                if (!endTime) return 0;
                const start = new Date(startTime);
                const end = new Date(endTime);
                if (end < start) return 0;
                return (end.getTime() - start.getTime()); // return milliseconds
            };

            const totalDurationMs = userTimeRecords.reduce((acc, record) => acc + calculateDuration(record.clockInTime, record.clockOutTime), 0);
            const totalDurationHours = totalDurationMs / (1000 * 60 * 60);

            const totalLatenessMilliseconds = userTimeRecords.reduce((acc, record) => {
              if (!user?.defaultClockInTime) return acc;
              const actualClockIn = new Date(record.clockInTime);
              const dayOfWeek = daysOfWeek[getDay(actualClockIn)];

              if (!user.workingDays?.includes(dayOfWeek)) return acc;

              const [hours, minutes] = user.defaultClockInTime.split(':').map(Number);
              const defaultClockIn = new Date(actualClockIn);
              defaultClockIn.setHours(hours, minutes, 0, 0);

              if (actualClockIn > defaultClockIn) {
                  return acc + differenceInMilliseconds(actualClockIn, defaultClockIn);
              }
              return acc;
            }, 0);
            
            const totalLatenessHours = totalLatenessMilliseconds / (1000 * 60 * 60);

            const overtimeMs = userTimeRecords.reduce((total, record) => {
                const clockInDate = new Date(record.clockInTime);
                const dayOfWeek = daysOfWeek[getDay(clockInDate)];

                if (!record.clockOutTime) return total;
                const durationMs = new Date(record.clockOutTime).getTime() - clockInDate.getTime();

                // If worked on a non-working day, all duration is overtime
                if (!user.workingDays?.includes(dayOfWeek)) {
                    return total + durationMs;
                }

                // If worked beyond default clock-out on a working day
                if (user.defaultClockOutTime) {
                    const actualClockOut = new Date(record.clockOutTime);
                    const [hours, minutes] = user.defaultClockOutTime.split(':').map(Number);
                    const defaultClockOut = new Date(actualClockOut);
                    defaultClockOut.setHours(hours, minutes, 0, 0);

                    if (actualClockOut > defaultClockOut) {
                       return total + differenceInMilliseconds(actualClockOut, defaultClockOut);
                    }
                }
                return total;
            }, 0);

            const overtimeHours = overtimeMs / (1000 * 60 * 60);
            
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
    }, [dateRange, users, allTimeRecords, rewards, hrQueries]);

    const formatHoursAndMinutes = (totalHours: number) => {
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        return `${hours}h ${minutes}m`;
    };

    const handleExportCSV = () => {
        const dataToExport = payrollData.map(p => ({
            "Employee": p.user.name,
            "Department": p.user.departmentName || 'N/A',
            "Base Salary": `${currency}${p.user.remuneration?.toFixed(2)}`,
            "Rate/Day": `${currency}${p.remunerationPerDay.toFixed(2)}`,
            "Rate/Hour": `${currency}${p.remunerationPerHour.toFixed(2)}`,
            "Expected Hours": formatHoursAndMinutes(p.expectedMonthlyHours),
            "Sum of Duration (H)": formatHoursAndMinutes(p.totalDurationHours),
            "Sum of Lateness": formatHoursAndMinutes(p.totalLatenessHours),
            "Sum of Overtime": formatHoursAndMinutes(p.overtimeHours),
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
        const datePart = dateRange?.from ? `${format(dateRange.from, 'yyyy-MM-dd')}_to_${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'today'}` : format(new Date(), 'yyyy-MM');
        link.setAttribute("href", url);
        link.setAttribute("download", `payroll_${datePart}.csv`);
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-end">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                          "w-full sm:w-[300px] justify-start text-left font-normal",
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
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
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
                                        <TableCell>{formatHoursAndMinutes(data.expectedMonthlyHours)}</TableCell>
                                        <TableCell>{formatHoursAndMinutes(data.totalDurationHours)}</TableCell>
                                        <TableCell className="text-destructive">{formatHoursAndMinutes(data.totalLatenessHours)}</TableCell>
                                        <TableCell className="text-green-600">{formatHoursAndMinutes(data.overtimeHours)}</TableCell>
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
}
