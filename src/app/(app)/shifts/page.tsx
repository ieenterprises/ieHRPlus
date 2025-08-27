
"use client";

import { useState, useMemo, useEffect } from "react";
import { format, formatDistance, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import Papa from "papaparse";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, RefreshCw } from "lucide-react";
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
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import type { Shift, User } from "@/lib/types";

type EnrichedShift = Shift & {
  user: User | null;
  duration: string;
};

export default function ShiftsPage() {
  const { shifts, users, loggedInUser, reactivateShift } = useSettings();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    employeeId: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const hasManagePermission = useMemo(() => loggedInUser?.permissions.includes('MANAGE_SHIFTS'), [loggedInUser]);

  const enrichedAndFilteredShifts = useMemo((): EnrichedShift[] => {
    return shifts
      .map(shift => {
        const user = users.find(u => u.id === shift.userId) || null;
        let duration = "Active";
        if (shift.endTime) {
          try {
            duration = formatDistance(parseISO(shift.endTime), parseISO(shift.startTime));
          } catch (error) {
            duration = "Invalid date";
          }
        }
        return { ...shift, user, duration };
      })
      .filter(shift => {
        const employeeMatch = filters.employeeId === 'all' || shift.userId === filters.employeeId;
        
        const dateMatch =
          !dateRange?.from ||
          (new Date(shift.startTime) >= dateRange.from &&
            (!dateRange.to || new Date(shift.startTime) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))));

        return employeeMatch && dateMatch;
      })
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }, [shifts, users, filters, dateRange]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleReactivateShift = async (shift: Shift) => {
    if (!shift.user) return;
    try {
      await reactivateShift(shift.id, shift.userId);
      toast({
        title: "Shift Reactivated",
        description: `${shift.user.name}'s shift from ${format(parseISO(shift.startTime), "PP")} is now active.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to reactivate shift: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (enrichedAndFilteredShifts.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no shifts to export for the current filters.",
        variant: "destructive"
      });
      return;
    }

    const dataToExport = enrichedAndFilteredShifts.map(shift => ({
      "Employee": shift.user?.name || 'Unknown',
      "Clock In": format(parseISO(shift.startTime), "yyyy-MM-dd HH:mm:ss"),
      "Clock Out": shift.endTime ? format(parseISO(shift.endTime), "yyyy-MM-dd HH:mm:ss") : 'N/A',
      "Duration": shift.duration,
      "Status": shift.status,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `shifts_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Shifts report has been downloaded." });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Shift Management"
          description="Review employee clock-in and clock-out records."
        />
        <Button onClick={handleExport} variant="outline" size="sm" className="self-end sm:self-center">
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shifts Log</CardTitle>
          <CardDescription>
            A log of all recorded shifts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 mb-4">
            <Select value={filters.employeeId} onValueChange={(value) => handleFilterChange('employeeId', value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-full sm:w-[260px] justify-start text-left font-normal",
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    {hasManagePermission && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow><TableCell colSpan={hasManagePermission ? 6 : 5} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : enrichedAndFilteredShifts.length > 0 ? (
                  enrichedAndFilteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                          <TableCell className="font-medium">{shift.user?.name || 'Unknown User'}</TableCell>
                          <TableCell>{format(parseISO(shift.startTime), "PPpp")}</TableCell>
                          <TableCell>{shift.endTime ? format(parseISO(shift.endTime), "PPpp") : 'N/A'}</TableCell>
                          <TableCell>{shift.duration}</TableCell>
                          <TableCell>
                            <Badge variant={shift.status === 'active' ? 'default' : 'outline'} className={cn(shift.status === 'active' && 'bg-green-100 text-green-800')}>
                                {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                            </Badge>
                          </TableCell>
                          {hasManagePermission && (
                            <TableCell className="text-right">
                              {shift.status === 'closed' && (
                                <Button variant="outline" size="sm" onClick={() => handleReactivateShift(shift)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivate
                                </Button>
                              )}
                            </TableCell>
                          )}
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={hasManagePermission ? 6 : 5} className="text-center text-muted-foreground h-24">
                          No shifts found for the selected filters.
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
