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
import { debts as initialDebts, type Debt } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const { toast } = useToast();

  const handleMarkAsPaid = (debtId: string) => {
    setDebts((prevDebts) =>
      prevDebts.map((debt) =>
        debt.id === debtId ? { ...debt, status: "Paid" } : debt
      )
    );
    toast({
      title: "Debt Paid",
      description: "The debt has been marked as paid.",
    });
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
              {debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">{debt.orderNumber}</TableCell>
                  <TableCell>{debt.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{format(debt.date, "LLL dd, y")}</TableCell>
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
              ))}
               {debts.filter(d => d.status === 'Unpaid').length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No unpaid debts.
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
