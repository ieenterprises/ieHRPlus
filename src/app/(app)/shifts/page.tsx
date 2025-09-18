

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
import { Calendar as CalendarIcon, Download, RefreshCw, XCircle, Store, HardDrive } from "lucide-react";
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
import type { Shift, User, StoreType, PosDeviceType } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

type EnrichedShift = Shift & {
  user: User | null;
  store: StoreType | null;
  device: PosDeviceType | null;
  duration: string;
};

export default function ShiftsPage() {
  const { shifts, users, loggedInUser, reactivateShift, closeShift, stores, posDevices } = useSettings();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    employeeId: "all",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());

  const hasManagePermission = useMemo(() => loggedInUser?.permissions.includes('MANAGE_SHIFTS'), [loggedInUser]);

  const enrichedAndFilteredShifts = useMemo((): EnrichedShift[] => {
    return shifts
      .map(shift => {
        const user = users.find(u => u.id === shift.userId) || null;
        const store = stores.find(s => s.id === shift.storeId) || null;
        const device = posDevices.find(d => d.id === shift.posDeviceId) || null;
        let duration = "Active";
        if (shift.endTime) {
          try {
            duration = formatDistance(parseISO(shift.endTime), parseISO(shift.startTime));
          } catch (error) {
            duration = "Invalid date";
          }
        }
        return { ...shift, user, store, device, duration };
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
  }, [shifts, users, filters, dateRange, stores, posDevices]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const closableShifts = useMemo(() => {
    return enrichedAndFilteredShifts.filter(s => s.status !== 'closed');
  }, [enrichedAndFilteredShifts]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleReactivateShift = async (shift: Shift) => {
    if (!shift.user) return;
    try {
      await reactivateShift(shift.id, shift.userId);
      toast({
        title: "Shift Reactivated",
        description: `${shift.user.name}'s shift from ${format(parseISO(shift.startTime), "PP")} is now temporarily active.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to reactivate shift: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleCloseShift = async (shift: Shift) => {
    if (!shift.user) return;
    try {
      await closeShift(shift.id);
      toast({
        title: "Shift Closed",
        description: `${shift.user.name}'s temporary shift access has been closed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to close shift: ${error.message}`,
        variant: "destructive",
      });
    }
  };

   const handleCloseSelectedShifts = async () => {
    if (!hasManagePermission || selectedShifts.size === 0) return;

    try {
      const closePromises = Array.from(selectedShifts).map(shiftId => closeShift(shiftId));
      await Promise.all(closePromises);
      
      toast({
        title: "Shifts Closed",
        description: `${selectedShifts.size} selected shift(s) have been closed.`,
      });
      setSelectedShifts(new Set()); // Clear selection after closing
    } catch (error: any) {
      toast({
        title: "Error Closing Shifts",
        description: `An error occurred: ${error.message}`,
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
      "Store": shift.store?.name || 'N/A',
      "POS Device": shift.device?.name || 'N/A',
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

  const getStatusBadgeVariant = (status: Shift['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'temp-active':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Shift Management"
          description="Review employee clock-in and clock-out records."
        />
        <div className="flex items-center gap-2 self-end sm:self-center">
            {hasManagePermission && (
              <Button onClick={handleCloseSelectedShifts} variant="destructive" size="sm" disabled={selectedShifts.size === 0}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Close Selected ({selectedShifts.size})
              </Button>
            )}
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
        </div>
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={closableShifts.length > 0 && selectedShifts.size === closableShifts.length}
                        onCheckedChange={(checked) => {
                          const allClosableIds = new Set(closableShifts.map(s => s.id));
                          setSelectedShifts(checked ? allClosableIds : new Set());
                        }}
                        disabled={closableShifts.length === 0}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : enrichedAndFilteredShifts.length > 0 ? (
                  enrichedAndFilteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedShifts.has(shift.id)}
                              onCheckedChange={(checked) => {
                                setSelectedShifts(prev => {
                                  const newSet = new Set(prev);
                                  if (checked) {
                                    newSet.add(shift.id);
                                  } else {
                                    newSet.delete(shift.id);
                                  }
                                  return newSet;
                                });
                              }}
                              disabled={shift.status === 'closed'}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{shift.user?.name || 'Unknown User'}</TableCell>
                          <TableCell>
                            {shift.store || shift.device ? (
                              <div className="flex flex-col text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Store className="h-3 w-3 text-muted-foreground" />
                                  <span>{shift.store?.name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                                  <span>{shift.device?.name || 'N/A'}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{format(parseISO(shift.startTime), "PPpp")}</TableCell>
                          <TableCell>{shift.endTime ? format(parseISO(shift.endTime), "PPpp") : 'N/A'}</TableCell>
                          <TableCell>{shift.duration}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(shift.status)} className={cn(
                                shift.status === 'active' && 'bg-green-100 text-green-800',
                                shift.status === 'temp-active' && 'bg-yellow-100 text-yellow-800'
                                )}>
                                {shift.status === 'temp-active' ? 'Temp-Active' : (shift.status.charAt(0).toUpperCase() + shift.status.slice(1))}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              {hasManagePermission && (
                                <>
                                  {shift.status === 'closed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReactivateShift(shift)}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Reactivate
                                    </Button>
                                  )}
                                  {shift.status === 'temp-active' && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCloseShift(shift)}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Close
                                    </Button>
                                  )}
                                </>
                              )}
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
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
