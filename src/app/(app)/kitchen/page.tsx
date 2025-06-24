"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { kitchenOrders, type KitchenOrder } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Hourglass } from "lucide-react";

function KitchenOrderCard({
  order,
  onUpdateStatus,
}: {
  order: KitchenOrder;
  onUpdateStatus: (id: string, status: KitchenOrder["status"]) => void;
}) {
  const statusConfig = {
    New: {
      color: "bg-blue-500",
      actionText: "Start Cooking",
      nextStatus: "In Progress" as const,
    },
    "In Progress": {
      color: "bg-yellow-500",
      actionText: "Mark as Done",
      nextStatus: "Done" as const,
    },
    Done: { color: "bg-green-500", actionText: "", nextStatus: null },
  };

  const currentStatus = statusConfig[order.status];

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        order.status === "Done" ? "opacity-50" : ""
      )}
    >
      <CardHeader
        className={cn(
          "flex-row items-center justify-between p-4 text-white rounded-t-lg",
          currentStatus.color
        )}
      >
        <CardTitle className="text-lg font-bold">
          Order #{order.orderNumber}
        </CardTitle>
        <Badge variant="secondary" className="text-sm">
          {order.status}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 flex-1">
        <ul className="space-y-2">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between items-center">
              <span className="font-medium">{item.name}</span>
              <span className="font-bold text-lg text-primary">
                x{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      {currentStatus.nextStatus && (
        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={() =>
              onUpdateStatus(order.id, currentStatus.nextStatus!)
            }
          >
            {order.status === 'New' ? <Hourglass className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
            {currentStatus.actionText}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>(kitchenOrders);

  const handleUpdateStatus = (id: string, status: KitchenOrder["status"]) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  };
  
  const activeOrders = orders.filter(o => o.status !== "Done");
  const completedOrders = orders.filter(o => o.status === "Done");


  return (
    <div className="space-y-8">
      <PageHeader
        title="Kitchen Display"
        description="Live orders for the kitchen and bar."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeOrders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
         {completedOrders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>
      {orders.length === 0 && (
         <Card className="mt-8 flex items-center justify-center h-64">
           <CardContent className="text-center text-muted-foreground">
             <p className="text-lg font-medium">No active orders</p>
             <p>New orders will appear here automatically.</p>
           </CardContent>
         </Card>
      )}
    </div>
  );
}
