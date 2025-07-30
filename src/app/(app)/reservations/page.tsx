

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format, differenceInDays, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, Bed, Wrench, CheckCircle, MoreVertical, Edit, Download, ShieldOff, Trash2 } from "lucide-react";
import { type DateRange } from "react-day-picker";
import Papa from "papaparse";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { type Reservation, type Product, type Category } from "@/lib/types";
import { useSettings } from "@/hooks/use-settings";

type RoomStatus = 'Available' | 'Occupied' | 'Maintenance';

function RoomStatusCard({ 
  room, 
  onStatusChange,
  categoryName,
}: { 
  room: Product;
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  categoryName: string;
}) {
  const statusConfig = {
    Available: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
    Occupied: { icon: Bed, color: "text-blue-500", bg: "bg-blue-50" },
    Maintenance: { icon: Wrench, color: "text-yellow-500", bg: "bg-yellow-50" },
  };

  const currentStatus = (room.status as RoomStatus) || 'Available';
  const config = statusConfig[currentStatus] || statusConfig.Available;
  const Icon = config.icon;

  return (
    <Card className={cn("relative", config.bg)}>
      <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
        <Icon className={cn("h-8 w-8", config.color)} />
        <p className="font-bold text-lg">{room.name}</p>
        <p className="text-sm text-muted-foreground">{categoryName}</p>
        <Badge variant={currentStatus === 'Available' ? 'secondary' : 'default'} className={cn(
          currentStatus === 'Occupied' && 'bg-blue-100 text-blue-800',
          currentStatus === 'Maintenance' && 'bg-yellow-100 text-yellow-800',
          currentStatus === 'Available' && 'bg-green-100 text-green-800',
        )}>
          {room.status}
        </Badge>
      </CardContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onStatusChange(room.id, 'Available')}>Set as Available</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(room.id, 'Occupied')}>Set as Occupied</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(room.id, 'Maintenance')}>Set for Maintenance</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}

export default function ReservationsPage() {
  const { 
    reservations, setReservations, 
    products, setProducts,
    categories,
    sales,
    currency,
    featureSettings,
    loggedInUser,
    voidSale,
  } = useSettings();
  const [loading, setLoading] = useState(true);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const rooms = products.filter(p => {
    const category = categories.find(c => c.id === p.category_id);
    return category?.name === 'Room';
  });

  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);

  useEffect(() => {
    setLoading(false);
  }, []);

  
  const handleStatusChange = async (roomId: string, status: RoomStatus) => {
    try {
        setProducts(prevProducts => 
            prevProducts.map(room => room.id === roomId ? { ...room, status } : room)
        );
        toast({ title: "Room Status Updated" });
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditReservation = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setIsEditDialogOpen(true);
  }

  const handleUpdateReservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingReservation || !editingReservation.product_id) return;

    const formData = new FormData(event.currentTarget);
    const newStatus = formData.get("status") as Reservation['status'];

    try {
        setReservations(prev => prev.map(res => 
            res.id === editingReservation.id ? { ...res, status: newStatus } : res
        ));
        
        let roomStatus: RoomStatus | null = null;
        if (newStatus === 'Checked-in') roomStatus = 'Occupied';
        if (newStatus === 'Checked-out') roomStatus = 'Available';
        if (newStatus === 'Maintenance') roomStatus = 'Maintenance';
        
        if (roomStatus) {
            handleStatusChange(editingReservation.product_id, roomStatus);
        }

        setIsEditDialogOpen(false);
        setEditingReservation(null);
        toast({ title: "Reservation Updated", description: `Booking for ${editingReservation.guest_name} is now ${newStatus}.`});
    } catch (error: any) {
        toast({ title: "Error updating reservation", description: error.message, variant: "destructive" });
    }
  }

  const handleVoidReservation = (reservation: Reservation) => {
    if (!reservation.sale_id) {
      toast({ title: "Error", description: "Cannot void a reservation without an associated sale.", variant: "destructive" });
      return;
    }
    voidSale(reservation.sale_id, loggedInUser?.id || 'unknown');
    toast({ title: "Booking Voided", description: `Booking for ${reservation.guest_name} has been voided.` });
  };


  const getStatusVariant = (status: Reservation['status']) => {
    switch (status) {
      case 'Checked-in':
        return 'default';
      case 'Confirmed':
        return 'secondary';
      case 'Checked-out':
        return 'outline';
      case 'Maintenance':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPaymentBadgeVariant = (method: string) => {
    switch (method.toLowerCase()) {
        case 'cash':
            return 'default';
        case 'card':
            return 'secondary';
        case 'credit':
            return 'destructive';
        default:
            return 'outline';
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if(!categoryId) return 'N/A';
    return categories.find(c => c.id === categoryId)?.name || 'N/A';
  }
  
  const calculateTotal = (reservation: Reservation) => {
    if (!reservation.products?.price) return 0;
    const nights = differenceInDays(new Date(reservation.check_out), new Date(reservation.check_in));
    return nights > 0 ? nights * reservation.products.price : reservation.products.price;
  };

  const handleExportBookings = () => {
    const dataToExport = reservations.map(r => {
      const sale = sales.find(s => s.id === r.sale_id);
      return {
        "Order #": sale?.order_number || 'N/A',
        "Guest Name": r.guest_name,
        "Room": r.products?.name,
        "Check-in": format(new Date(r.check_in), "yyyy-MM-dd"),
        "Check-out": format(new Date(r.check_out), "yyyy-MM-dd"),
        "Total": calculateTotal(r).toFixed(2),
        "Payment": sale?.payment_methods.join(', ') || 'N/A',
        "Status": r.status,
      }
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Bookings report has been downloaded." });
  };
  
  const handleExportRoomStatus = () => {
    const dataToExport = rooms.map(room => ({
        "Room Name": room.name,
        "Category": getCategoryName(room.category_id),
        "Price": room.price.toFixed(2),
        "Status": room.status,
    }));
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `room_status_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Room status report has been downloaded." });
  };

  if (!featureSettings.reservations) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <ShieldOff className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold">Reservations Feature Disabled</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          This feature is currently turned off. To enable room bookings and reservation management, please go to Settings &gt; Features and turn on the Reservations toggle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Reservations"
          description="Manage room bookings and availability."
        />
        <div className="flex items-center gap-2">
           <Button onClick={handleExportRoomStatus} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Status
           </Button>
           <Button onClick={handleExportBookings} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Bookings
           </Button>
            <Button asChild>
              <Link href="/sales">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Reservation
              </Link>
            </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Room Status</h2>
        {loading ? (
             <p>Loading room statuses...</p>
        ): rooms.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {rooms.map(room => (
                    <RoomStatusCard 
                        key={room.id} 
                        room={room} 
                        onStatusChange={handleStatusChange}
                        categoryName={getCategoryName(room.category_id as string)}
                    />
                ))}
            </div>
        ) : (
             <Card className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No rooms found. Please add products to the 'Room' category.</p>
             </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Bookings</CardTitle>
          <CardDescription>
            A list of all upcoming and current reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reservations.length > 0 ? (
                reservations.map((reservation) => {
                  const sale = sales.find(s => s.id === reservation.sale_id);
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">#{sale?.order_number || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{reservation.guest_name}</TableCell>
                      <TableCell>{reservation.products?.name}</TableCell>
                      <TableCell>
                          {format(new Date(reservation.check_in), "LLL dd, y")} - {format(new Date(reservation.check_out), "LLL dd, y")}
                      </TableCell>
                      <TableCell className="text-right">{currency}{calculateTotal(reservation).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {sale ? (
                              sale.payment_methods.map(method => (
                                <Badge key={method} variant={getPaymentBadgeVariant(method)} className="capitalize">{method}</Badge>
                              ))
                          ) : (
                              <Badge variant="outline">Unpaid</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(reservation.status as any)}>
                          {reservation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditReservation(reservation)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                            {hasPermission('CANCEL_RECEIPTS') && reservation.sale_id && (
                               <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleVoidReservation(reservation)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Move to Void
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                    No reservations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleUpdateReservation}>
                <DialogHeader>
                    <DialogTitle>Update Reservation Status</DialogTitle>
                    <DialogDescription>
                        Update the status for the booking by {editingReservation?.guest_name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="status">Booking Status</Label>
                        <Select name="status" defaultValue={editingReservation?.status}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Checked-in">Checked-in</SelectItem>
                                <SelectItem value="Checked-out">Checked-out</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
