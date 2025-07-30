

"use client";

import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, Bed, Wrench, CheckCircle, MoreVertical, Edit, Download, ShieldOff, Trash2, Search } from "lucide-react";
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
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const { toast } = useToast();

  // State for new reservation form
  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [newReservationDateRange, setNewReservationDateRange] = useState<DateRange | undefined>();

  // State for filtering
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("all");
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingRoomFilter, setBookingRoomFilter] = useState("all");
  const [bookingDateRange, setBookingDateRange] = useState<DateRange | undefined>();
  
  const rooms = products.filter(p => {
    const category = categories.find(c => c.id === p.category_id);
    return category?.name === 'Room';
  });

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const searchMatch = room.name.toLowerCase().includes(roomSearchTerm.toLowerCase());
      const statusMatch = roomStatusFilter === 'all' || room.status === roomStatusFilter;
      return searchMatch && statusMatch;
    });
  }, [rooms, roomSearchTerm, roomStatusFilter]);
  
  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      const searchTermLower = bookingSearchTerm.toLowerCase();
      const searchMatch =
        bookingSearchTerm === "" ||
        res.guest_name.toLowerCase().includes(searchTermLower) ||
        res.products?.name?.toLowerCase().includes(searchTermLower);

      const statusMatch = bookingStatusFilter === 'all' || res.status === bookingStatusFilter;
      const roomMatch = bookingRoomFilter === 'all' || res.product_id === bookingRoomFilter;
      
      const dateMatch = !bookingDateRange?.from || isWithinInterval(new Date(res.check_in), { start: bookingDateRange.from, end: bookingDateRange.to || bookingDateRange.from });
      
      return searchMatch && statusMatch && roomMatch && dateMatch;
    });
  }, [reservations, bookingSearchTerm, bookingStatusFilter, bookingRoomFilter, bookingDateRange]);


  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);

  useEffect(() => {
    setLoading(false);
  }, []);

  const addReservation = (reservationData: Omit<Omit<import("/Users/user/Downloads/work/studio-f3/studio-f3/src/lib/types.ts").Reservation, "id" | "created_at" | "products">, "guest_name" | "product_id" | "check_in" | "check_out" | "status" | "sale_id"> & { guest_name: any; product_id: any; check_in: any; check_out: any; status: any; sale_id: any; }) => {
     setReservations(prev => [...prev, {
        id: `res_${new Date().getTime()}`,
        created_at: new Date().toISOString(),
        products: products.find(p => p.id === reservationData.product_id) || null,
        ...reservationData
     }]);
  };

  const handleAddReservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guestName || !roomId || !newReservationDateRange?.from || !newReservationDateRange?.to) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields to create a reservation.",
        variant: "destructive",
      });
      return;
    }

    const newReservationData = {
      guest_name: guestName,
      product_id: roomId,
      check_in: newReservationDateRange.from.toISOString(),
      check_out: newReservationDateRange.to.toISOString(),
      status: "Confirmed" as const,
      sale_id: null,
    };

    try {
      addReservation(newReservationData);
      
      setIsAddDialogOpen(false);
      setGuestName("");
      setRoomId("");
      setNewReservationDateRange(undefined);

      toast({
        title: "Reservation Created",
        description: `Booking for ${guestName} has been confirmed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating reservation",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
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
    const dataToExport = filteredReservations.map(r => {
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
    const dataToExport = filteredRooms.map(room => ({
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddReservation}>
                <DialogHeader>
                  <DialogTitle>New Reservation</DialogTitle>
                  <DialogDescription>
                    Fill in the details to book a room for a guest.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="guestName" className="text-right">
                      Guest Name
                    </Label>
                    <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room" className="text-right">
                      Room
                    </Label>
                    <Select onValueChange={setRoomId} value={roomId} required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.filter(r => r.status === 'Available').map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} ({currency}{room.price.toFixed(2)}/night)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Dates</Label>
                    <div className="col-span-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newReservationDateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newReservationDateRange?.from ? (
                              newReservationDateRange.to ? (
                                <>
                                  {format(newReservationDateRange.from, "LLL dd, y")} -{" "}
                                  {format(newReservationDateRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(newReservationDateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick check-in and check-out dates</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={newReservationDateRange?.from}
                            selected={newReservationDateRange}
                            onSelect={setNewReservationDateRange}
                            numberOfMonths={1}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Confirm Reservation</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Room Status</h2>
        <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search rooms..."
                    className="pl-9"
                    value={roomSearchTerm}
                    onChange={(e) => setRoomSearchTerm(e.target.value)}
                />
            </div>
            <Select value={roomStatusFilter} onValueChange={setRoomStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Occupied">Occupied</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
            </Select>
        </div>
        {loading ? (
             <p>Loading room statuses...</p>
        ): filteredRooms.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredRooms.map(room => (
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
                <p className="text-muted-foreground">No rooms found for the current filters.</p>
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
          <div className="flex flex-wrap items-center gap-2 mb-4">
              <Input
                placeholder="Search by Guest or Room..."
                value={bookingSearchTerm}
                onChange={(e) => setBookingSearchTerm(e.target.value)}
                className="max-w-xs"
              />
               <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Checked-in">Checked-in</SelectItem>
                      <SelectItem value="Checked-out">Checked-out</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
              </Select>
               <Select value={bookingRoomFilter} onValueChange={setBookingRoomFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by room" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !bookingDateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingDateRange?.from ? (bookingDateRange.to ? (<>{format(bookingDateRange.from, "LLL dd, y")} - {format(bookingDateRange.to, "LLL dd, y")}</>) : (format(bookingDateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={bookingDateRange} onSelect={setBookingDateRange} numberOfMonths={2}/></PopoverContent>
              </Popover>
          </div>
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
              ) : filteredReservations.length > 0 ? (
                filteredReservations.map((reservation) => {
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
                    No reservations found for the current filters.
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
