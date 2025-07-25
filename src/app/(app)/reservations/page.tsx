
"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, Bed, Wrench, CheckCircle, MoreVertical, Edit } from "lucide-react";
import { type DateRange } from "react-day-picker";

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
import { type Reservation, type Product } from "@/lib/types";
import { addReservation, updateReservationStatus } from "@/app/actions/reservations";
import { updateRoomStatus } from "@/app/actions/inventory";
import { supabase } from "@/lib/supabase";
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

  const currentStatus = room.status as RoomStatus;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const { toast } = useToast();
  const { currency } = useSettings();

  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    const [reservationsRes, productsRes, categoriesRes] = await Promise.all([
      supabase.from('reservations').select('*, products(name, price)').order('check_in', { ascending: false }),
      supabase.from('products').select('*, categories(name)').order('name', { ascending: true }),
      supabase.from('categories').select('*'),
    ]);
  
    if (reservationsRes.error) {
      toast({ title: "Error fetching reservations", description: reservationsRes.error.message, variant: "destructive" });
    } else {
      setReservations(reservationsRes.data || []);
    }
  
    const roomCategory = categoriesRes.data?.find(c => c.name === 'Room');
    if (productsRes.error) {
       toast({ title: "Error fetching room data", description: productsRes.error.message, variant: "destructive" });
    } else if (roomCategory) {
      setRooms(productsRes.data?.filter(p => p.category_id === roomCategory.id) || []);
    } else {
      setRooms([]);
    }

    if (categoriesRes.data) setCategories(categoriesRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddReservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guestName || !roomId || !dateRange?.from || !dateRange?.to) {
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
      check_in: dateRange.from.toISOString(),
      check_out: dateRange.to.toISOString(),
      status: "Confirmed" as const,
    };

    try {
      await addReservation(newReservationData);
      
      setIsAddDialogOpen(false);
      setGuestName("");
      setRoomId("");
      setDateRange(undefined);

      toast({
        title: "Reservation Created",
        description: `Booking for ${guestName} has been confirmed.`,
      });
      fetchData(); // Refresh all data
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
        await updateRoomStatus(roomId, status);
        setRooms(prevRooms => 
            prevRooms.map(room => room.id === roomId ? { ...room, status } : room)
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
    if (!editingReservation) return;

    const formData = new FormData(event.currentTarget);
    const newStatus = formData.get("status") as Reservation['status'];

    try {
        await updateReservationStatus(editingReservation.id, newStatus);
        fetchData();
        setIsEditDialogOpen(false);
        setEditingReservation(null);
        toast({ title: "Reservation Updated", description: `Booking for ${editingReservation.guest_name} is now ${newStatus}.`});
    } catch (error: any) {
        toast({ title: "Error updating reservation", description: error.message, variant: "destructive" });
    }
  }

  const getStatusVariant = (status: Reservation['status']) => {
    switch (status) {
      case 'Checked-in':
        return 'default';
      case 'Confirmed':
        return 'secondary';
      case 'Checked-out':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || 'N/A';
  
  const calculateTotal = (reservation: Reservation) => {
    if (!reservation.products?.price) return 0;
    const nights = differenceInDays(new Date(reservation.check_out), new Date(reservation.check_in));
    return nights * reservation.products.price;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Reservations"
          description="Manage room bookings and availability."
        />
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
                          {room.name} ({currency}{room.price}/night)
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
                            <span>Pick check-in and check-out dates</span>
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
                <p className="text-muted-foreground">No rooms found.</p>
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
                <TableHead>Customer</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{reservation.guest_name}</TableCell>
                    <TableCell>{reservation.products?.name}</TableCell>
                    <TableCell>
                        {format(new Date(reservation.check_in), "LLL dd, y")} - {format(new Date(reservation.check_out), "LLL dd, y")}
                    </TableCell>
                    <TableCell className="text-right">{currency}{calculateTotal(reservation).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(reservation.status as any)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditReservation(reservation)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
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
                                <SelectItem value="Confirmed">Confirmed</SelectItem>
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
