
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";

import { PageHeader } from "@/components/page-header";
import { type Product, type Customer, type Category, type SaleItem, type OpenTicket, UserRole } from "@/lib/types";
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
import { Plus, Minus, X, CreditCard, CalendarIcon, DollarSign, Save, Ticket, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { usePos } from "@/hooks/use-pos";
import { useSettings } from "@/hooks/use-settings";

type OrderItem = {
  product: Product;
  quantity: number;
};

function ProductCard({
  product,
  onAddToCart,
  categoryName,
  currency,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
  categoryName: string;
  currency: string;
}) {
  const isRoom = categoryName === 'Room';

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow duration-300 relative",
        product.stock > 0 || isRoom ? "cursor-pointer hover:shadow-lg" : "opacity-50 cursor-not-allowed"
      )}
      onClick={product.stock > 0 || isRoom ? () => onAddToCart(product) : undefined}
    >
      {product.stock === 0 && !isRoom && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10">Out of Stock</Badge>
      )}
      <Image
        src={product.image_url || 'https://placehold.co/300x200.png'}
        alt={product.name}
        width={300}
        height={200}
        className="w-full h-32 object-cover"
        data-ai-hint={isRoom ? "hotel room" : "food beverage"}
      />
      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-muted-foreground font-medium">
          {currency}{product.price.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SalesPage() {
  const { 
    featureSettings, 
    paymentTypes: configuredPaymentTypes,
    loggedInUser,
    users,
    selectedDevice,
    currency,
    products,
    setProducts,
    categories,
    customers,
    setSales,
    setDebts,
    setReservations,
    setVoidedLogs,
  } = useSettings();
  const { openTickets, saveTicket, deleteTicket } = usePos();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [loading, setLoading] = useState(true);

  const [isTicketsDialogOpen, setIsTicketsDialogOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const [isReservationPaymentDialogOpen, setIsReservationPaymentDialogOpen] = useState(false);
  const [isSplitPaymentDialogOpen, setIsSplitPaymentDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  const [guestName, setGuestName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [splitPaymentMethod, setSplitPaymentMethod] = useState(configuredPaymentTypes[0]?.name || "Cash");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);


  useEffect(() => {
    const walkIn = customers.find(c => c.name.toLowerCase() === 'walk-in customer');
    if (walkIn) setSelectedCustomerId(walkIn.id);
    setLoading(false);
  }, [customers]);

  const addReservation = (reservationData: Omit<Omit<import("/Users/user/Downloads/work/studio-f3/studio-f3/src/lib/types.ts").Reservation, "id" | "created_at" | "products">, "guest_name" | "product_id" | "check_in" | "check_out" | "status"> & { guest_name: any; product_id: any; check_in: any; check_out: any; status: any; }) => {
     setReservations(prev => [...prev, {
        id: `res_${new Date().getTime()}`,
        created_at: new Date().toISOString(),
        products: products.find(p => p.id === reservationData.product_id) || null,
        ...reservationData
     }]);
  };

  const handleConfirmBooking = async (status: 'Confirmed' | 'Checked-in') => {
    const roomItem = orderItems.find(item => getCategoryName(item.product.category_id) === 'Room');
    if (!roomItem || !guestName || !dateRange?.from || !dateRange?.to) {
        toast({ title: "Missing Information", description: "Please provide guest name and reservation dates.", variant: "destructive" });
        return;
    }
    
    try {
        const reservationData = {
            guest_name: guestName,
            product_id: roomItem.product.id,
            check_in: dateRange.from.toISOString(),
            check_out: dateRange.to.toISOString(),
            status: status
        };

        if (status === 'Checked-in') {
            handleCompleteSale(true);
            addReservation(reservationData);
        } else {
             addReservation(reservationData);
        }
        
        if (activeTicketId) await deleteTicket(activeTicketId);

        setIsReservationPaymentDialogOpen(false);
        setGuestName("");
        setDateRange(undefined);
        handleClearOrder();

        toast({
          title: status === 'Checked-in' ? "Room Checked In" : "Room Reserved",
          description: `Booking for ${guestName} in ${roomItem.product.name} has been confirmed.`,
        });

    } catch(error: any) {
         toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const handleAddToCart = (product: Product) => {
    const categoryName = getCategoryName(product.category_id);
    const productInStock = products.find(p => p.id === product.id);

    if (!productInStock || (productInStock.stock <= 0 && categoryName !== 'Room')) {
      toast({ title: "Out of Stock", description: `${product.name} is currently unavailable.`, variant: "destructive" });
      return;
    }

    setOrderItems((prevItems) => {
      if (categoryName === 'Room' && prevItems.some(item => getCategoryName(item.product.category_id) === 'Room')) {
        toast({ title: "One Room at a Time", description: "You can only book one room per transaction.", variant: "destructive" });
        return prevItems;
      }

      const existingItem = prevItems.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (categoryName !== 'Room' && existingItem.quantity + 1 > productInStock.stock) {
          toast({ title: "Stock Limit Reached", description: `Only ${productInStock.stock} ${productInStock.name} in stock.`, variant: "destructive" });
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
      const itemToUpdate = prevItems.find(item => item.product.id === productId);
      const productInStock = products.find(p => p.id === productId);

      if (!itemToUpdate || !productInStock) return prevItems;
      
      const categoryName = getCategoryName(itemToUpdate.product.category_id);
      const newQuantity = itemToUpdate.quantity + amount;

      if (newQuantity > 0 && categoryName !== 'Room' && newQuantity > productInStock.stock) {
        toast({ title: "Stock Limit Reached", description: `Only ${productInStock.stock} ${productInStock.name} in stock.`, variant: "destructive" });
        return prevItems;
      }
      
      const updatedItems = prevItems
        .map((item) => {
          if (item.product.id === productId) {
             if (categoryName === 'Room') return item;
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
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = total - totalPaid;

  const handlePayment = () => {
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Please add items to the order before proceeding to payment.", variant: "destructive" });
      return;
    }
    const hasRoom = orderItems.some(item => getCategoryName(item.product.category_id) === 'Room');
    if (hasRoom) {
        setIsReservationPaymentDialogOpen(true);
    } else {
        setPayments([]);
        setIsSplitPaymentDialogOpen(true);
    }
  };

  const handleAddPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const method = formData.get("paymentMethod") as string;
    const paymentTypeDetails = configuredPaymentTypes.find(p => p.name === method);

    if (paymentTypeDetails?.type === "Credit") {
      const creditCustomerId = formData.get("creditCustomer") as string;
      if (!creditCustomerId) {
        toast({ title: "Customer Required", description: "Please select a customer.", variant: "destructive" });
        return;
      }
      handleCompleteSale(false, { customerId: creditCustomerId, amount: remainingBalance });
      return;
    }

    const amount = parseFloat(formData.get("paymentAmount") as string);

    if (isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive"});
        return;
    }

    if (amount > remainingBalance + 0.001) { 
         toast({ title: "Amount Exceeds Balance", description: `Cannot pay more than the remaining ${currency}${remainingBalance.toFixed(2)}.`, variant: "destructive"});
        return;
    }

    setPayments([...payments, { method, amount: Math.min(amount, remainingBalance) }]);
    (event.target as HTMLFormElement).reset();
    setSplitPaymentMethod(configuredPaymentTypes[0]?.name || "Cash");
  };


  const handleRemovePayment = (index: number) => {
      setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompleteSale = async (isRoomCheckout = false, creditInfo?: { customerId: string, amount: number }) => {
    if (remainingBalance > 0.001 && !creditInfo && !isRoomCheckout) {
        toast({ title: "Payment Incomplete", description: `There is still a remaining balance of ${currency}${remainingBalance.toFixed(2)}.`, variant: "destructive" });
        return;
    }
    
    try {
        const saleItems: SaleItem[] = orderItems.map(item => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
        }));

        const newSale = {
            id: `sale_${new Date().getTime()}`,
            order_number: Math.floor(Math.random() * 100000),
            created_at: new Date().toISOString(),
            items: saleItems,
            total: total,
            payment_methods: creditInfo ? ['Credit'] : payments.map(p => p.method),
            customer_id: creditInfo ? creditInfo.customerId : selectedCustomerId,
            employee_id: loggedInUser?.id || null,
            pos_device_id: selectedDevice?.id || null,
            status: 'Fulfilled' as const,
            customers: customers.find(c => c.id === (creditInfo ? creditInfo.customerId : selectedCustomerId)) || null,
            users: { name: loggedInUser?.name || null },
            pos_devices: selectedDevice ? { store_id: selectedDevice.store_id } : null,
        };

        setSales(prev => [...prev, newSale]);
        
        if (creditInfo) {
            const newDebt = {
              id: `debt_${new Date().getTime()}`,
              sale_id: newSale.id,
              customer_id: creditInfo.customerId,
              amount: creditInfo.amount,
              status: "Unpaid" as const,
              created_at: new Date().toISOString(),
              sales: { order_number: newSale.order_number },
              customers: { name: customers.find(c => c.id === creditInfo.customerId)?.name || null },
            };
            setDebts(prev => [...prev, newDebt]);
        }
        
        if (activeTicketId && !isRoomCheckout) await deleteTicket(activeTicketId);

        const stockUpdates = orderItems
            .filter(item => getCategoryName(item.product.category_id) !== 'Room')
            .map(item => ({ id: item.product.id, stock: item.product.stock - item.quantity }));
        
        if(stockUpdates.length > 0) {
            setProducts(prevProducts =>
                prevProducts.map(p => {
                    const update = stockUpdates.find(u => u.id === p.id);
                    return update ? { ...p, stock: update.stock } : p;
                })
            );
        }
        
        if (!isRoomCheckout) {
            let toastDescription = `Order complete. Total: ${currency}${total.toFixed(2)}.`;
            if (creditInfo) {
                const customer = customers.find(c => c.id === creditInfo.customerId);
                toastDescription += ` ${currency}${creditInfo.amount.toFixed(2)} recorded as debt for ${customer?.name}.`;
            }

            toast({ title: "Sale Completed", description: toastDescription });

            handleClearOrder();
            setPayments([]);
            setIsSplitPaymentDialogOpen(false);
        }
    } catch (error: any) {
        toast({ title: "Error completing sale", description: error.message, variant: "destructive" });
        if (!isRoomCheckout) {
          throw error;
        }
    }
  };
  
  const getCategoryName = (categoryId: string | null) => categories.find(c => c.id === categoryId)?.name;
  
  const filteredProducts = products.filter(
    (product) => categoryFilter === "all" || product.category_id === categoryFilter
  );

  const handleClearOrder = () => {
    setOrderItems([]);
    setActiveTicketId(null);
  };

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Cannot save an empty order.", variant: "destructive" });
      return;
    }

    const saleItems: SaleItem[] = orderItems.map(item => ({ id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price }));
    
    try {
        await saveTicket({
            id: activeTicketId, // can be null
            items: saleItems,
            total: total,
            employee_id: loggedInUser?.id ?? null,
            customer_id: selectedCustomerId,
            ticket_name: `Ticket @ ${format(new Date(), 'HH:mm')}`,
        });
        
        toast({ title: activeTicketId ? "Order Updated" : "Order Saved", description: "The order has been saved as an open ticket." });
        handleClearOrder();
    } catch (error: any) {
        toast({ title: "Error Saving Order", description: error.message, variant: "destructive" });
    }
  };

  const handleLoadTicket = (ticket: OpenTicket) => {
    if (orderItems.length > 0 && !activeTicketId) {
      if (!window.confirm("Loading this ticket will replace your current unsaved order. Are you sure?")) {
        return;
      }
    }

    const newOrderItems: OrderItem[] = (ticket.items as SaleItem[]).map(item => {
        const product = products.find(p => p.id === item.id);
        return product ? { product, quantity: item.quantity } : null;
    }).filter((item): item is OrderItem => item !== null);
    
    if (newOrderItems.length !== (ticket.items as SaleItem[]).length) {
        toast({ title: "Error Loading Ticket", description: "Some items in this ticket no longer exist and were removed.", variant: "destructive" });
    }

    setOrderItems(newOrderItems);
    setActiveTicketId(ticket.id);
    setSelectedCustomerId(ticket.customer_id);
    setIsTicketsDialogOpen(false);
  };
  
  const handleMoveTicketToVoid = (ticketId: string) => {
    const ticketToVoid = openTickets.find(t => t.id === ticketId);
    if (!ticketToVoid) return;

    setVoidedLogs(prev => [...prev, {
        id: `void_${new Date().getTime()}`,
        type: 'ticket',
        voided_by_employee_id: loggedInUser?.id || 'unknown',
        created_at: new Date().toISOString(),
        data: ticketToVoid,
        users: null,
    }]);

    deleteTicket(ticketId);

    toast({ title: "Ticket Moved", description: `Ticket "${ticketToVoid.ticket_name}" has been moved to the voided logs.` });
  }

  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);
  
  const currentPaymentType = configuredPaymentTypes.find(p => p.name === splitPaymentMethod);

  return (
    <TooltipProvider>
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader title="Sales" description="Create a new order for products or room bookings." />
                <div className="flex items-center gap-2">
                    <Select value={selectedCustomerId || ''} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Customer" />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {featureSettings.open_tickets && (
                        <Button variant="outline" onClick={() => setIsTicketsDialogOpen(true)}>
                            <Ticket className="mr-2 h-4 w-4" />
                            Open Tickets ({openTickets.length})
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
                <Tabs defaultValue="all" onValueChange={setCategoryFilter}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id}>
                        {category.name}
                    </TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        categoryName={getCategoryName(product.category_id) || ''}
                        currency={currency}
                    />
                ))}
                {filteredProducts.length === 0 && (
                    <Card className="col-span-full flex items-center justify-center h-64">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <p className="text-lg font-medium">No products found</p>
                            <p>There are no products in the selected category.</p>
                        </CardContent>
                    </Card>
                )}
                </div>
            </div>

            <div className="lg:sticky lg:top-8">
                <Card>
                <CardHeader>
                    <CardTitle>{activeTicketId ? "Saved Order" : "Current Order"}</CardTitle>
                    {activeTicketId && <CardDescription>Now editing a saved ticket.</CardDescription>}
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
                                {currency}{item.product.price.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(item.product.id, -1)}
                                disabled={getCategoryName(item.product.category_id) === 'Room'}
                                >
                                <Minus className="h-3 w-3" />
                                </Button>
                                <span>{item.quantity}</span>
                                <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                disabled={getCategoryName(item.product.category_id) === 'Room'}
                                >
                                <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            <p className="w-16 text-right font-medium">
                                {currency}{(item.product.price * item.quantity).toFixed(2)}
                            </p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-2"
                                onClick={() => handleRemoveItem(item.product.id)}
                                disabled={!!activeTicketId}
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
                        <span>{currency}{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                        <span>Tax (8%)</span>
                        <span>{currency}{tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{currency}{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         {featureSettings.open_tickets && (
                            <Button variant="secondary" onClick={handleSaveOrder}>
                                <Save className="mr-2 h-4 w-4" /> {activeTicketId ? "Update" : "Save"} Order
                            </Button>
                         )}
                         <Button variant="outline" onClick={handleClearOrder} className={cn(!featureSettings.open_tickets && "col-span-2")}>
                            <X className="mr-2 h-4 w-4" /> {activeTicketId ? "Cancel" : "Clear"}
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full">
                                    <Button size="lg" className="w-full" onClick={handlePayment} disabled={!loggedInUser}>
                                        <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {!loggedInUser && <TooltipContent><p>Please sign in to process payments.</p></TooltipContent>}
                        </Tooltip>
                    </div>
                    </CardFooter>
                )}
                </Card>
            </div>
            </div>
        </div>
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
        <Dialog open={isSplitPaymentDialogOpen} onOpenChange={(isOpen) => {
            setIsSplitPaymentDialogOpen(isOpen);
            if (!isOpen) {
                setPayments([]);
                setSplitPaymentMethod(configuredPaymentTypes[0]?.name || "Cash");
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Complete Payment</DialogTitle>
                    <DialogDescription>
                        Split the payment across multiple methods if needed.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-lg font-bold">
                        <div className="text-muted-foreground">Total Due:</div>
                        <div className="text-right">{currency}{total.toFixed(2)}</div>
                        <div className="text-primary">Remaining:</div>
                        <div className="text-right text-primary">{currency}{remainingBalance.toFixed(2)}</div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Payments Added</Label>
                        {payments.length === 0 ? (
                            <div className="flex items-center justify-center h-16 rounded-md border border-dashed">
                                <p className="text-sm text-muted-foreground">No payments yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {payments.map((payment, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <div className="flex items-center gap-2">
                                            {configuredPaymentTypes.find(p=>p.name === payment.method)?.type === 'Cash' ? <DollarSign className="h-5 w-5 text-green-500" /> : <CreditCard className="h-5 w-5 text-blue-500" />}
                                            <span className="font-medium">{payment.method}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{currency}{payment.amount.toFixed(2)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePayment(index)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {remainingBalance > 0.001 && (
                        <form onSubmit={handleAddPayment} className="space-y-4">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="paymentAmount">Amount</Label>
                                    <Input
                                        key={splitPaymentMethod}
                                        id="paymentAmount"
                                        name="paymentAmount"
                                        type="number"
                                        step="0.01"
                                        required={currentPaymentType?.type !== 'Credit'}
                                        placeholder={`Max ${currency}${remainingBalance.toFixed(2)}`}
                                        min="0.01"
                                        max={remainingBalance.toFixed(2)}
                                        disabled={currentPaymentType?.type === 'Credit'}
                                        defaultValue={currentPaymentType?.type === 'Credit' ? remainingBalance.toFixed(2) : ''}
                                    />
                                </div>
                                <div className="w-40">
                                    <Label htmlFor="paymentMethod">Method</Label>
                                    <Select name="paymentMethod" required value={splitPaymentMethod} onValueChange={setSplitPaymentMethod}>
                                        <SelectTrigger id="paymentMethod">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {configuredPaymentTypes.map(pt => (
                                                <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit">{currentPaymentType?.type === 'Credit' ? 'Record' : 'Add'}</Button>
                            </div>
                             {currentPaymentType?.type === 'Credit' && (
                                <div className="space-y-2">
                                    <Label htmlFor="creditCustomer">Customer</Label>
                                    <Select name="creditCustomer" required>
                                        <SelectTrigger id="creditCustomer">
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
                            )}
                        </form>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSplitPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => handleCompleteSale()} disabled={Math.abs(remainingBalance) > 0.001}>
                        Complete Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={isTicketsDialogOpen} onOpenChange={setIsTicketsDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Open Tickets</DialogTitle>
                    <DialogDescription>
                        Select a saved ticket to load it.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket Name</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {openTickets.length > 0 ? (
                                    openTickets.map(ticket => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-medium">{ticket.ticket_name}</TableCell>
                                            <TableCell>{ticket.users?.name ?? 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(ticket.created_at!), 'LLL dd, y HH:mm')}</TableCell>
                                            <TableCell className="text-right">{currency}{ticket.total.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleLoadTicket(ticket as any)}>Load</Button>
                                                    {hasPermission('CANCEL_RECEIPTS') && (
                                                        <Button variant="destructive" size="sm" onClick={() => handleMoveTicketToVoid(ticket.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Move to Void
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No open tickets found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </TooltipProvider>
  );
}
