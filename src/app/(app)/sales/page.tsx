

"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { format, differenceInDays } from "fns";
import { type DateRange } from "react-day-picker";

import { PageHeader } from "@/components/page-header";
import { type Product, type Customer, type Category, type SaleItem, type OpenTicket, UserRole, Sale, Reservation, Debt } from "@/lib/types";
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
import { Plus, Minus, X, CreditCard, CalendarIcon, DollarSign, Save, Ticket, Trash2, Search, PlusCircle, Loader2, Store } from "lucide-react";
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

type EnrichedProduct = Product & {
    price: number;
    stock: number;
};

type OrderItem = {
  product: EnrichedProduct;
  quantity: number;
};

function ProductCard({
  product,
  onAddToCart,
  categoryName,
  currency,
}: {
  product: EnrichedProduct;
  onAddToCart: (product: EnrichedProduct) => void;
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
       {(product.status === 'Occupied' || product.status === 'Maintenance') && isRoom && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10">{product.status}</Badge>
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

const generateUniqueOrderNumber = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000);
  return parseInt(`${timestamp.toString().slice(-6)}${randomSuffix.toString().padStart(3, '0')}`);
};

export default function SalesPage() {
  const { 
    featureSettings, 
    paymentTypes: configuredPaymentTypes,
    loggedInUser,
    users,
    selectedDevice,
    ownerSelectedStore,
    setOwnerSelectedStore,
    stores,
    currency,
    products,
    setProducts,
    categories,
    customers,
    setCustomers,
    sales,
    setSales,
    debts,
    setDebts,
    reservations,
    setReservations,
    debtToSettle,
    setDebtToSettle,
    taxes,
  } = useSettings();
  const { openTickets, saveTicket, deleteTicket, ticketToLoad, setTicketToLoad } = usePos();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isTicketsDialogOpen, setIsTicketsDialogOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<OpenTicket | null>(null);
  const [loadedTicketItemIds, setLoadedTicketItemIds] = useState<Set<string>>(new Set());


  const [isReservationPaymentDialogOpen, setIsReservationPaymentDialogOpen] = useState(false);
  const [isSplitPaymentDialogOpen, setIsSplitPaymentDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  const [guestName, setGuestName] = useState("");
  const [reservationCustomerId, setReservationCustomerId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [splitPaymentMethod, setSplitPaymentMethod] = useState(configuredPaymentTypes[0]?.name || "Cash");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);

  const isReservationsEnabled = featureSettings.reservations;
  
  const isAdmin = useMemo(() => {
    if (!loggedInUser) return false;
    return ['Owner', 'Administrator', 'Manager'].includes(loggedInUser.role);
  }, [loggedInUser]);

  const getCategoryName = (categoryId: string | null) => categories.find(c => c.id === categoryId)?.name;
  
  const productsForCurrentStore = useMemo((): EnrichedProduct[] => {
    const currentStoreId = isAdmin ? ownerSelectedStore?.id : selectedDevice?.store_id;
    if (!currentStoreId) return [];
    
    return products.map(p => {
        const storeProduct = p.store_products?.find(sp => sp.store_id === currentStoreId);
        if (storeProduct) {
            return { ...p, price: storeProduct.price, stock: storeProduct.stock };
        }
        return null;
    }).filter((p): p is EnrichedProduct => p !== null);
  }, [products, selectedDevice, isAdmin, ownerSelectedStore]);

  useEffect(() => {
    const roomItem = orderItems.find(item => getCategoryName(item.product.category_id) === 'Room');
    if (roomItem && dateRange?.from && dateRange?.to) {
      const nights = differenceInDays(dateRange.to, dateRange.from);
      const validNights = Math.max(1, nights); // Ensure at least 1 night
      if (roomItem.quantity !== validNights) {
        setOrderItems(prevItems =>
          prevItems.map(item =>
            item.product.id === roomItem.product.id
              ? { ...item, quantity: validNights }
              : item
          )
        );
      }
    }
  }, [dateRange, orderItems, getCategoryName]);

  const handleLoadTicket = async (ticket: OpenTicket) => {
    if (orderItems.length > 0 && !activeTicket && !debtToSettle) {
      if (!window.confirm("Loading this ticket will replace your current unsaved order. Are you sure?")) {
        return;
      }
    }
    
    if (!ticket.id) {
        toast({ title: "Error", description: "This ticket has an invalid ID and cannot be loaded.", variant: "destructive" });
        return;
    }

    const ticketItems = ticket.items as SaleItem[];
    const newOrderItems: OrderItem[] = ticketItems.map(item => {
        const product = productsForCurrentStore.find(p => p.id === item.id);
        return product ? { product, quantity: item.quantity } : null;
    }).filter((item): item is OrderItem => item !== null);
    
    if (newOrderItems.length !== ticketItems.length) {
        toast({ title: "Error Loading Ticket", description: "Some items in this ticket no longer exist and were removed.", variant: "destructive" });
    }

    // Immediately delete ticket from backend and state after loading
    await deleteTicket(ticket.id);

    setOrderItems(newOrderItems);
    setActiveTicket(ticket);
    setSelectedCustomerId(ticket.customer_id);
    setLoadedTicketItemIds(new Set(ticketItems.map(item => item.id))); // Track original items
    setIsTicketsDialogOpen(false);
    setTicketToLoad(null);
    
    toast({ title: "Ticket Loaded", description: `Order #${ticket.order_number} has been loaded and removed from open tickets.`});
  };

  useEffect(() => {
    if (ticketToLoad) {
      handleLoadTicket(ticketToLoad);
    } else if (debtToSettle) {
       const correspondingDebt = debts.find(d => d.sale_id === debtToSettle.id && d.status === 'Unpaid');
        if (!correspondingDebt && debtToSettle.id) {
          setDebtToSettle(null);
          handleClearOrder();
          toast({
            title: "Cleared Stale Debt",
            description: "A previously selected debt was no longer valid and has been cleared.",
            variant: "default"
          });
          return;
        }

        const debtItems: OrderItem[] = debtToSettle.items.map(item => {
            const product = products.find(p => p.id === item.id);
            const enrichedProduct: EnrichedProduct = {
                ...(product || {}),
                id: item.id,
                name: item.name,
                price: item.price,
                stock: product ? (product.store_products?.find(sp => sp.store_id === (isAdmin ? ownerSelectedStore?.id : selectedDevice?.store_id))?.stock ?? 999) : 999,
                category_id: product?.category_id || null,
                created_at: product?.created_at || new Date().toISOString(),
                image_url: product?.image_url || null,
                status: product?.status || 'Available',
                store_products: product?.store_products || [],
                businessId: loggedInUser?.businessId || '',
            };
            return { product: enrichedProduct, quantity: item.quantity };
        });

        setOrderItems(debtItems);
        setSelectedCustomerId(debtToSettle.customer_id);

    } else {
      const walkIn = customers.find(c => c.name.toLowerCase() === 'walk-in customer');
      if (walkIn) {
        setSelectedCustomerId(walkIn.id);
        setReservationCustomerId(walkIn.id);
      }
    }
    setLoading(false);
  }, [customers, debtToSettle, ticketToLoad, debts, setDebtToSettle, products, loggedInUser, productsForCurrentStore, selectedDevice, ownerSelectedStore, isAdmin]);

  const addReservation = async (reservationData: Omit<Reservation, 'id' | 'created_at' | 'products' | 'businessId'>) => {
    const newReservation: Omit<Reservation, 'id' | 'businessId'> = {
       created_at: new Date().toISOString(),
       products: products.find(p => p.id === reservationData.product_id) || null,
       ...reservationData
    };
    await setReservations(prev => [...prev, newReservation as Reservation]);
  };

  const handleConfirmBooking = async (status: 'Confirmed' | 'Checked-in') => {
    const roomItem = orderItems.find(item => getCategoryName(item.product.category_id) === 'Room');
    const guest = customers.find(c => c.id === reservationCustomerId);

    if (!roomItem || !guest || !dateRange?.from || !dateRange?.to) {
        toast({ title: "Missing Information", description: "Please select a guest and reservation dates.", variant: "destructive" });
        return;
    }

    if (status === 'Checked-in') {
      setIsCheckingIn(true);
      setIsReservationPaymentDialogOpen(false);
      handlePayment(true); // Open payment dialog
      return;
    }
    
    setIsProcessing(true);
    try {
        const reservationData = {
            guest_name: guest.name,
            product_id: roomItem.product.id,
            check_in: dateRange.from.toISOString(),
            check_out: dateRange.to.toISOString(),
            status: status,
            sale_id: null,
        };

        await addReservation(reservationData);
        
        if (activeTicket?.id) await deleteTicket(activeTicket.id);

        setIsReservationPaymentDialogOpen(false);
        setReservationCustomerId(null);
        setDateRange(undefined);
        handleClearOrder();

        toast({
          title: "Room Reserved",
          description: `Booking for ${guest.name} in ${roomItem.product.name} has been confirmed.`,
        });

    } catch(error: any) {
         toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };


  const handleAddToCart = (product: EnrichedProduct) => {
    const categoryName = getCategoryName(product.category_id);

    if (product.stock <= 0 && categoryName !== 'Room') {
      toast({ title: "Out of Stock", description: `${product.name} is currently unavailable.`, variant: "destructive" });
      return;
    }
    
    if (categoryName === 'Room' && product.status !== 'Available') {
        toast({ title: "Room Not Available", description: `${product.name} is currently ${product.status}.`, variant: "destructive" });
        return;
    }

    setOrderItems((prevItems) => {
      if (categoryName === 'Room' && prevItems.some(item => getCategoryName(item.product.category_id) === 'Room')) {
        toast({ title: "One Room at a Time", description: "You can only book one room per transaction.", variant: "destructive" });
        return prevItems;
      }

      const existingItem = prevItems.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (categoryName !== 'Room' && existingItem.quantity + 1 > product.stock) {
          toast({ title: "Stock Limit Reached", description: `Only ${product.stock} ${product.name} in stock.`, variant: "destructive" });
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
      if (!itemToUpdate) return prevItems;
      
      const categoryName = getCategoryName(itemToUpdate.product.category_id);
      const newQuantity = itemToUpdate.quantity + amount;

      if (newQuantity > 0 && categoryName !== 'Room' && newQuantity > itemToUpdate.product.stock) {
        toast({ title: "Stock Limit Reached", description: `Only ${itemToUpdate.product.stock} ${itemToUpdate.product.name} in stock.`, variant: "destructive" });
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

  const subtotal = useMemo(() =>
    orderItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [orderItems]
  );
  
  const defaultTax = useMemo(() => taxes.find(t => t.is_default), [taxes]);
  
  const tax = useMemo(() => {
    if (!defaultTax) return 0;
    return subtotal * (defaultTax.rate / 100);
  }, [subtotal, defaultTax]);

  const total = subtotal + tax;
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = parseFloat((total - totalPaid).toFixed(2));

  const handlePayment = (forcePaymentDialog = false) => {
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Please add items to the order before proceeding to payment.", variant: "destructive" });
      return;
    }
    const hasRoom = orderItems.some(item => getCategoryName(item.product.category_id) === 'Room');
    if (hasRoom && !forcePaymentDialog && !debtToSettle) {
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
      handleCompleteSale({ creditInfo: { customerId: creditCustomerId, amount: remainingBalance } });
      return;
    }

    const amount = parseFloat(formData.get("paymentAmount") as string);

    if (isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive"});
        return;
    }
    
    // Convert to integers (cents) for reliable comparison
    const amountInCents = Math.round(amount * 100);
    const remainingBalanceInCents = Math.round(remainingBalance * 100);

    if (amountInCents > remainingBalanceInCents) { 
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

 const handleCompleteSale = async (options: { creditInfo?: { customerId: string; amount: number; } } = {}) => {
    const { creditInfo } = options;
    if (remainingBalance > 0.001 && !creditInfo && !isCheckingIn) {
        toast({ title: "Payment Incomplete", description: `There is still a remaining balance of ${currency}${remainingBalance.toFixed(2)}.`, variant: "destructive" });
        return;
    }
    
    const currentPosDeviceId = isAdmin ? null : selectedDevice?.id || null;

    setIsProcessing(true);
    try {
        const saleItems: SaleItem[] = orderItems.map(item => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
        }));

        if (debtToSettle) {
          const originalSale = sales.find(s => s.id === debtToSettle.id);
          if (!originalSale) {
            throw new Error("Original sale for this debt could not be found.");
          }
          const settlementPayments = payments.map(p => p.method);
          const updatedSale: Sale = {
            ...originalSale,
            payment_methods: [...originalSale.payment_methods.filter(pm => pm !== 'Credit'), ...settlementPayments],
          };

          await setSales(prevSales => prevSales.map(s => s.id === updatedSale.id ? updatedSale : s));

          const originalDebt = debts.find(d => d.sale_id === debtToSettle.id);
          if (originalDebt) {
            const updatedDebt = { ...originalDebt, status: 'Paid' as const };
            await setDebts(prevDebts => prevDebts.map(d => 
              d.id === originalDebt.id ? updatedDebt : d
            ));
          }
           toast({ title: "Debt Settled", description: `Debt for order #${originalSale.order_number} has been settled.` });
        } else {
          // This is a new sale
          const newSale: Sale = {
              id: `sale_${new Date().getTime()}`,
              order_number: generateUniqueOrderNumber(),
              created_at: new Date().toISOString(),
              items: saleItems,
              total: total,
              payment_methods: creditInfo ? ['Credit'] : payments.map(p => p.method),
              customer_id: creditInfo ? creditInfo.customerId : selectedCustomerId,
              employee_id: loggedInUser?.id || null,
              pos_device_id: currentPosDeviceId,
              status: 'Fulfilled' as const,
              customers: customers.find(c => c.id === (creditInfo ? creditInfo.customerId : selectedCustomerId)) || null,
              users: { name: loggedInUser?.name || null },
              pos_devices: selectedDevice ? { store_id: selectedDevice.store_id } : null,
              businessId: loggedInUser?.businessId || '',
          };
          await setSales(prev => [...prev, newSale]);
        
          // DEBT CREATION IS NOW HANDLED BY A SYNC EFFECT IN use-settings.ts
          
          if (isCheckingIn) {
              const roomItem = orderItems.find(item => getCategoryName(item.product.category_id) === 'Room');
              const guest = customers.find(c => c.id === reservationCustomerId);
              if (roomItem && guest && dateRange?.from && dateRange.to) {
                  await addReservation({
                      guest_name: guest.name,
                      product_id: roomItem.product.id,
                      check_in: dateRange.from.toISOString(),
                      check_out: dateRange.to.toISOString(),
                      status: 'Checked-in',
                      sale_id: newSale.id,
                  });

                  await setProducts(prevProducts => 
                      prevProducts.map(room => room.id === roomItem.product.id ? { ...room, status: 'Occupied' } : room)
                  );

                  toast({
                    title: "Room Checked In",
                    description: `Booking for ${guest.name} in ${roomItem.product.name} has been paid and confirmed.`,
                  });
              }
              setIsCheckingIn(false);
              setReservationCustomerId(null);
              setDateRange(undefined);
          }
          let toastDescription = `Order complete. Total: ${currency}${total.toFixed(2)}.`;

          if (creditInfo) {
              const customer = customers.find(c => c.id === creditInfo.customerId);
              toastDescription += ` ${currency}${creditInfo.amount.toFixed(2)} recorded as debt for ${customer?.name}.`;
          }
          toast({ title: "Sale Completed", description: toastDescription });
        }
        
        const stockUpdates = orderItems
            .filter(item => getCategoryName(item.product.category_id) !== 'Room')
            .map(item => ({ id: item.product.id, quantity: item.quantity }));
        
        const updateStoreId = isAdmin ? ownerSelectedStore?.id : selectedDevice?.store_id;

        if(stockUpdates.length > 0 && updateStoreId) {
            await setProducts(prevProducts =>
                prevProducts.map(p => {
                    const update = stockUpdates.find(u => u.id === p.id);
                    if (!update) return p;

                    const newStoreProducts = p.store_products.map(sp => 
                        sp.store_id === updateStoreId ? { ...sp, stock: sp.stock - update.quantity } : sp
                    );
                    return { ...p, store_products: newStoreProducts };
                })
            );
        }
        
        if (activeTicket?.id) await deleteTicket(activeTicket.id);

        handleClearOrder();

    } catch (error: any) {
        toast({ title: "Error completing sale", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };
  
  
  const visibleCategories = useMemo(() => {
    if (isReservationsEnabled) return categories;
    return categories.filter(c => c.name.toLowerCase() !== 'room');
  }, [categories, isReservationsEnabled]);
  
  const filteredProducts = useMemo(() => {
    let prods = productsForCurrentStore;
    
    if (categoryFilter !== 'all') {
      prods = prods.filter(p => p.category_id === categoryFilter);
    }

    if (productSearchTerm) {
      prods = prods.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
    }

    return prods;
  }, [productsForCurrentStore, categoryFilter, productSearchTerm]);

  const handleClearOrder = () => {
    setOrderItems([]);
    setActiveTicket(null);
    setPayments([]);
    setIsSplitPaymentDialogOpen(false);
    setLoadedTicketItemIds(new Set());
    setDebtToSettle(null);
    const walkIn = customers.find(c => c.name.toLowerCase() === 'walk-in customer');
    if (walkIn) {
      setSelectedCustomerId(walkIn.id);
      setReservationCustomerId(walkIn.id);
    }
  };

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      toast({ title: "Empty Order", description: "Cannot save an empty order.", variant: "destructive" });
      return;
    }
    if (!loggedInUser?.businessId) {
      toast({ title: "Error", description: "Cannot determine business for this ticket.", variant: "destructive" });
      return;
    }
  
    const saleItems: SaleItem[] = orderItems.map(item => ({ id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price }));
    
    setIsProcessing(true);
    try {
        const ticketPayload: Partial<OpenTicket> = {
            items: saleItems,
            total: total,
            employee_id: loggedInUser?.id ?? null,
            customer_id: selectedCustomerId,
            order_number: generateUniqueOrderNumber(),
            businessId: loggedInUser.businessId,
        };
        
        // If it's an update to a loaded ticket, create a new one instead of updating
        if (activeTicket) {
             toast({ title: "Order Saved", description: "The updated order has been saved as a new open ticket." });
        } else {
             toast({ title: "Order Saved", description: "The order has been saved as an open ticket." });
        }
        
        await saveTicket(ticketPayload);
        handleClearOrder();
    } catch (error: any) {
        toast({ title: "Error Saving Order", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const hasPermission = (permission: any) => loggedInUser?.permissions.includes(permission);
  
  const currentPaymentType = configuredPaymentTypes.find(p => p.name === splitPaymentMethod);
  
  const cardTitle = debtToSettle ? `Settle Debt` : activeTicket ? `Editing Order #${activeTicket.order_number}` : "Current Order";

  const handleAddCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!name || !email) {
      toast({ title: "Missing fields", description: "Please provide both name and email.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    try {
      const newCustomer = {
        name,
        email,
        phone: null,
        id: `cust_${new Date().getTime()}`,
        created_at: new Date().toISOString(),
      };
      await setCustomers([newCustomer as Customer, ...customers]);
      setSelectedCustomerId(newCustomer.id);
      setReservationCustomerId(newCustomer.id); // Also select for reservation
      setIsAddCustomerDialogOpen(false);
      toast({ title: "Customer Added", description: `${name} has been added and selected.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const availablePaymentTypes = useMemo(() => {
    if (debtToSettle) {
      return configuredPaymentTypes.filter(pt => pt.type !== 'Credit');
    }
    return configuredPaymentTypes;
  }, [debtToSettle, configuredPaymentTypes]);

  useEffect(() => {
    if (debtToSettle && splitPaymentMethod === 'Credit') {
      setSplitPaymentMethod(availablePaymentTypes[0]?.name || 'Cash');
    }
  }, [debtToSettle, splitPaymentMethod, availablePaymentTypes]);

  return (
    <TooltipProvider>
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <PageHeader title="Sales" description="Create a new order." />
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-center">
                    {isAdmin && (
                         <div className="grid gap-2 w-full sm:w-auto">
                            <Select 
                                value={ownerSelectedStore?.id || ''} 
                                onValueChange={(storeId) => {
                                    const store = stores.find(s => s.id === storeId);
                                    if(store) setOwnerSelectedStore(store);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Select Store..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="w-full sm:w-auto flex items-center gap-1">
                        <Select value={selectedCustomerId || ''} onValueChange={setSelectedCustomerId} disabled={!!debtToSettle}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsAddCustomerDialogOpen(true)} className="h-10 w-10 shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                    {featureSettings.open_tickets && !debtToSettle && (
                        <Button variant="outline" onClick={() => setIsTicketsDialogOpen(true)} className="w-full sm:w-auto">
                            <Ticket className="mr-2 h-4 w-4" />
                            Open Tickets ({openTickets.length})
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                            <TabsTrigger value="all">All</TabsTrigger>
                            {visibleCategories.map((category) => (
                            <TabsTrigger key={category.id} value={category.id}>
                                {category.name}
                            </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search products..."
                            className="pl-9"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
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
                            <p>There are no products for the current filter and search term.</p>
                        </CardContent>
                    </Card>
                )}
                </div>
            </div>

            <div className="lg:sticky lg:top-8">
                <Card>
                <CardHeader>
                    <CardTitle>{cardTitle}</CardTitle>
                    {activeTicket && <CardDescription>This ticket is now active and has been removed from the open tickets list.</CardDescription>}
                    {debtToSettle && <CardDescription>Paying off order #{debtToSettle.order_number}</CardDescription>}
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
                                disabled={getCategoryName(item.product.category_id) === 'Room' || !!debtToSettle}
                                >
                                <Minus className="h-3 w-3" />
                                </Button>
                                <span>{item.quantity}</span>
                                <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                disabled={getCategoryName(item.product.category_id) === 'Room' || !!debtToSettle}
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
                                disabled={!!debtToSettle || loadedTicketItemIds.has(item.product.id)}
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
                        {tax > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax ({defaultTax?.name} @ {defaultTax?.rate}%)</span>
                                <span>{currency}{tax.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{currency}{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                         {featureSettings.open_tickets && !debtToSettle && (
                            <Button variant="secondary" onClick={handleSaveOrder} className="w-full" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isProcessing ? 'Saving...' : 'Save Order'}
                            </Button>
                         )}
                    </div>
                    <div className="flex flex-col gap-2">
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full">
                                    <Button size="lg" className="w-full" onClick={() => handlePayment(false)} disabled={!loggedInUser || isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                        {isProcessing ? 'Processing...' : 'Proceed to Payment'}
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
                    <div className="col-span-3 flex items-center gap-1">
                        <Select value={reservationCustomerId || ''} onValueChange={setReservationCustomerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsAddCustomerDialogOpen(true)} className="h-10 w-10 shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
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
                <Button onClick={() => handleConfirmBooking('Checked-in')} className="w-full" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Pay & Check-in Now
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isSplitPaymentDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setPayments([]);
                setSplitPaymentMethod(configuredPaymentTypes[0]?.name || "Cash");
            }
            setIsSplitPaymentDialogOpen(isOpen);
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
                                            {availablePaymentTypes.map(pt => (
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
                                    <div className="flex items-center gap-1">
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
                                        <Button variant="outline" size="icon" onClick={() => setIsAddCustomerDialogOpen(true)} className="h-10 w-10 shrink-0">
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSplitPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => handleCompleteSale()} disabled={remainingBalance > 0.001 || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                        Select a saved ticket to load it. This will remove it from the open tickets list.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {openTickets.length > 0 ? (
                                    openTickets.map(ticket => {
                                        const canLoadTicket = loggedInUser?.id === ticket.employee_id || hasPermission('MANAGE_OPEN_TICKETS');
                                        return (
                                            <TableRow key={ticket.id || ticket.order_number}>
                                                <TableCell className="font-medium">#{ticket.order_number}</TableCell>
                                                <TableCell>{ticket.users?.name ?? 'N/A'}</TableCell>
                                                <TableCell>{format(new Date(ticket.created_at!), 'LLL dd, y HH:mm')}</TableCell>
                                                <TableCell className="text-right">{currency}{ticket.total.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleLoadTicket(ticket)} disabled={!canLoadTicket}>Load</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
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
        <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleAddCustomer}>
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                        <DialogDescription>
                            Quickly add a new customer to the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Customer Name</Label>
                            <Input id="name" name="name" placeholder="John Doe or Table 5" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="customer@example.com" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddCustomerDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Customer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}


    
