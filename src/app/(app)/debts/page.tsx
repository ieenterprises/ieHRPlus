"use client";

import { useState } from "react";
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
import { type Debt } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MOCK_DEBTS: Debt[] = [
    { id: "debt_1", sale_id: "sale_1", customer_id: "cust_3", amount: 75.50, status: "Unpaid", created_at: "2023-08-01T14:00:00Z", sales: { order_number: 1001 }, customers: { name: "Bob Williams" } },
    { id: "debt_2", sale_id: "sale_2", customer_id: "cust_2", amount: 120.00, status: "Unpaid", created_at: "2023-08-05T18:30:00Z", sales: { order_number: 1005 }, customers: { name: "Alice Johnson" } },
    { id: "debt_3", sale_id: "sale_3", customer_id: "cust_3", amount: 35.00, status: "Paid", created_at: "2023-07-20T10:00:00Z", sales: { order_number: 954 }, customers: { name: "Bob Williams" } },
];

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>(MOCK_DEBTS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleMarkAsPaid = async (debtId: string) => {
    try {
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === debtId ? { ...debt, status: "Paid" } : debt
        )
      );
      toast({
        title: "Debt Paid",
        description: "The debt has been marked as paid.",
      });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update debt status.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Debt Management"
        description="Track and recover outstanding credit sales."
      />
      <Card>
        <CardHeader>
          <CardTitle>Debts</CardTitle>
          <CardDescription>
            A list of all credit sales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Loading...
                    </TableCell>
                </TableRow>
              ) : debts.length > 0 ? (
                debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.sales?.order_number}</TableCell>
                    <TableCell>{debt.customers?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(debt.created_at!), "LLL dd, y")}</TableCell>
                    <TableCell className="text-right">${debt.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={debt.status === "Paid" ? "secondary" : "destructive"}>
                        {debt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {debt.status === "Unpaid" && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(debt.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No debts found.
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
