"use client";

import { useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { products, type Product, customers } from "@/lib/data";
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
import { Plus, Minus, X, CreditCard, ReceiptText } from "lucide-react";
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
        data-ai-hint="food beverage"
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddToCart = (product: Product) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
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

    // Mock payment processing
    toast({
      title: "Payment Successful",
      description: `Order total: $${total.toFixed(2)}.`,
    });
    setOrderItems([]);
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
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <PageHeader title="Sales" description="Create a new order." />
        <div className="flex-1 grid md:grid-cols-3 gap-8 mt-8 overflow-hidden">
          <div className="md:col-span-2 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Current Order</CardTitle>
              <CardDescription>Order #105</CardDescription>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="pr-6">
                {orderItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No items in order
                  </div>
                ) : (
                  <div className="space-y-4">
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
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span>{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
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
                )}
              </CardContent>
            </ScrollArea>
            {orderItems.length > 0 && (
              <CardFooter className="flex-col !items-stretch mt-auto p-4 space-y-4">
                <Separator />
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="lg" variant="secondary" className="w-full" onClick={() => setIsCreditDialogOpen(true)}>
                    <ReceiptText className="mr-2 h-5 w-5" /> Record as Credit
                  </Button>
                  <Button size="lg" className="w-full" onClick={handlePayment}>
                    <CreditCard className="mr-2 h-5 w-5" /> Proceed to Payment
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
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
    </>
  );
}
