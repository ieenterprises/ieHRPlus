
"use client";

import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react";
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
import { addReservation } from "@/app/actions/reservations";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/hooks/use-settings";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currency } = useSettings();

  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      const [reservationsRes, productsRes, categoriesRes] = await Promise.all([
        supabase.from('reservations').select('*, products(name)').order('check_in', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('categories').select('id').eq('name', 'Room').limit(1),
      ]);

      if (reservationsRes.error) {
        toast({ title: "Error fetching reservations", description: reservationsRes.error.message, variant: "destructive" });
      } else {
        setReservations(reservationsRes.data || []);
      }

      if (productsRes.error) {
         toast({ title: "Error fetching room data", description: productsRes.error.message, variant: "destructive" });
      } else if (categoriesRes.error) {
          // This check handles potential RLS or other access errors for categories table
         toast({ title: "Error fetching room categories", description: categoriesRes.error.message, variant: "destructive" });
      } else {
        const roomCategoryId = categoriesRes.data?.[0]?.id;
        if (roomCategoryId) {
            setRooms(productsRes.data?.filter(p => p.category_id === roomCategoryId) || []);
        } else {
            setRooms([]); // No "Room" category found, so no rooms to show.
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [toast]);

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
      const newReservation = await addReservation(newReservationData);
      const room = rooms.find(r => r.id === roomId);
      
      setReservations([{...newReservation, products: { name: room?.name || '' }}, ...reservations]);
      setIsDialogOpen(false);
      
      setGuestName("");
      setRoomId("");
      setDateRange(undefined);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Reservations"
          description="Manage room bookings and availability."
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                      {rooms.map((room) => (
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
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="hidden md:table-cell">Check-in</TableHead>
                <TableHead className="hidden md:table-cell">Check-out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{reservation.guest_name}</TableCell>
                    <TableCell>{reservation.products?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(reservation.check_in), "LLL dd, y")}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(reservation.check_out), "LLL dd, y")}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(reservation.status as any)}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    No reservations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
