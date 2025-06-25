"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { markDebtAsPaid } from "@/app/actions/debts";

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchDebts() {
      setLoading(true);
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("debts")
        .select(`
          *,
          sales ( order_number ),
          customers ( name )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error fetching debts", description: error.message, variant: "destructive" });
      } else {
        setDebts(data as Debt[]);
      }
      setLoading(false);
    }
    fetchDebts();
  }, [toast]);

  const handleMarkAsPaid = async (debtId: string) => {
    try {
      await markDebtAsPaid(debtId);
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
