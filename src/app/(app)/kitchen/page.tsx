"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { sales as initialSales, type Sale } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

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


export default function KitchenPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleFulfillOrder = (saleId: string) => {
    setSales((prevSales) =>
      prevSales.map((sale) =>
        sale.id === saleId ? { ...sale, status: "Fulfilled" } : sale
      )
    );
    toast({
      title: "Order Fulfilled",
      description: "The order has been marked as fulfilled.",
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Sales Feed"
        description="A real-time feed of all completed sales transactions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Showing the latest sales from all channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Employee</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">#{sale.orderNumber}</TableCell>
                  <TableCell>{isClient ? format(sale.date, "LLL dd, y HH:mm") : null}</TableCell>
                  <TableCell className="hidden sm:table-cell">{sale.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{sale.employeeName}</TableCell>
                   <TableCell>
                     {sale.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                   </TableCell>
                  <TableCell className="text-right">${sale.total.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        {sale.paymentMethods.map(method => (
                             <Badge key={method} variant={getPaymentBadgeVariant(method)} className="capitalize">
                                {method}
                            </Badge>
                        ))}
                    </div>
                  </TableCell>
                   <TableCell>
                    <Badge variant={sale.status === 'Fulfilled' ? 'secondary' : 'default'}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                   <TableCell>
                    {sale.status === 'Pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleFulfillOrder(sale.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Fulfill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
               {sales.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                        No sales recorded yet.
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
