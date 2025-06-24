
"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";

import { PageHeader } from "@/components/page-header";
import { products, type Product, customers, type Reservation, reservations as initialReservations } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, X, CreditCard, ReceiptText, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


type OrderItem = {
  product: Product;
  quantity: number;
};

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
      onClick={() => onAddToCart(product)}
    >
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={300}
        height={200}
        className="w-full h-32 object-cover"
        data-ai-hint={product.category === 'Room' ? "hotel room" : "food beverage"}
      />
      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-muted-foreground font-medium">
          ${product.price.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SalesPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isReservationPaymentDialogOpen, setIsReservationPaymentDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { toast } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  
  // State for the reservation payment dialog
  const [guestName, setGuestName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleConfirmBooking = (status: Reservation['status']) => {
    const roomItem = orderItems.find(item => item.product.category === 'Room');
    if (!roomItem || !guestName || !dateRange?.from || !dateRange?.to) {
        toast({
            title: "Missing Information",
            description: "Please provide guest name and reservation dates.",
            variant: "destructive",
        });
        return;
    }

    const newReservation: Reservation = {
      id: (reservations.length + 1).toString(),
      guestName,
      roomName: roomItem.product.name,
      checkIn: dateRange.from,
      checkOut: dateRange.to,
      status: status,
    };

    setReservations([newReservation, ...reservations]);
    
    // Clear form and close dialog
    setIsReservationPaymentDialogOpen(false);
    setGuestName("");
    setDateRange(undefined);
    setOrderItems([]); // Clear cart

    toast({
      title: status === 'Checked-in' ? "Room Checked In" : "Room Reserved",
      description: `Booking for ${guestName} in ${roomItem.product.name} has been confirmed.`,
    });
  };


  const handleAddToCart = (product: Product) => {
    setOrderItems((prevItems) => {
      // Prevent adding more than one room to the cart for simplicity
      if (product.category === 'Room' && prevItems.some(item => item.product.category === 'Room')) {
        toast({
            title: "One Room at a Time",
            description: "You can only book one room per transaction.",
            variant: "destructive"
        });
        return prevItems;
      }

      const existingItem = prevItems.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        // Prevent increasing quantity of a room
        if (existingItem.product.category === 'Room') {
            toast({
                title: "One Room at a Time",
                description: "You can only book one room per transaction.",
                variant: "destructive"
            });
            return prevItems;
        }
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, amount: number) => {
    setOrderItems((prevItems) => {
      const updatedItems = prevItems
        .map((item) => {
          if (item.product.id === productId) {
             if (item.product.category === 'Room') return item; // Don't change room quantity
            return { ...item, quantity: item.quantity + amount };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
      return updatedItems;
    });
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.product.id !== productId)
    );
  };

  const subtotal = orderItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handlePayment = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add items to the order before proceeding to payment.",
        variant: "destructive",
      });
      return;
    }

    const hasRoom = orderItems.some(item => item.product.category === 'Room');

    if (hasRoom) {
        setIsReservationPaymentDialogOpen(true);
    } else {
        // Mock payment processing for non-room items
        toast({
          title: "Payment Successful",
          description: `Order total: $${total.toFixed(2)}.`,
        });
        setOrderItems([]);
    }
  };

  const handleCreditSale = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Empty Order",
        description: "Cannot record an empty credit sale.",
        variant: "destructive",
      });
      return;
    }
    if (orderItems.some(item => item.product.category === 'Room')) {
        toast({
            title: "Credit Not Allowed for Rooms",
            description: "Room bookings cannot be recorded as credit sales.",
            variant: "destructive",
        });
        return;
    }
    if (!selectedCustomerId) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer for the credit sale.",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);

    toast({
      title: "Credit Sale Recorded",
      description: `Order for ${customer?.name} of $${total.toFixed(2)} has been recorded as a debt.`,
    });
    setOrderItems([]);
    setIsCreditDialogOpen(false);
    setSelectedCustomerId(null);
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader title="Sales" description="Create a new order for products or room bookings." />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-8">
            <Card>
              <CardHeader>
                <CardTitle>Current Order</CardTitle>
                <CardDescription>Order #105</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {orderItems.length === 0 ? (
                  <div className="flex items-center justify-center p-6 h-48 text-muted-foreground">
                    No items in order
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="p-6 pt-0 space-y-4">
                      {orderItems.map((item) => (
                        <div key={item.product.id} className="flex items-center">
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${item.product.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              disabled={item.product.category === 'Room'}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span>{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              disabled={item.product.category === 'Room'}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="w-16 text-right font-medium">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2"
                            onClick={() => handleRemoveItem(item.product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              {orderItems.length > 0 && (
                <CardFooter className="flex-col !items-stretch p-4 space-y-4 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="lg" className="w-full" onClick={handlePayment}>
                      <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
                    </Button>
                    <Button size="lg" variant="secondary" className="w-full" onClick={() => setIsCreditDialogOpen(true)}>
                      <ReceiptText className="mr-2 h-5 w-5" /> Record as Credit
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Credit Sale</DialogTitle>
            <DialogDescription>
              Select a customer to associate with this credit sale. The order will be added to their debts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedCustomerId} defaultValue={selectedCustomerId || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreditSale}>Confirm Credit Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isReservationPaymentDialogOpen} onOpenChange={setIsReservationPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Room Booking</DialogTitle>
                <DialogDescription>
                    Enter guest details and select dates for the room booking.
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
            <DialogFooter className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => handleConfirmBooking('Confirmed')}>Reserve for Later</Button>
                <Button onClick={() => handleConfirmBooking('Checked-in')}>Pay & Check-in Now</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
