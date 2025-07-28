
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { type Debt, type Sale } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Download, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";

export default function DebtsPage() {
  const { debts, setDebts, sales, users, customers, currency, setDebtToSettle } = useSettings();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const enrichedDebts = useMemo(() => {
    return debts.map(debt => {
      const sale = sales.find(s => s.id === debt.sale_id);
      return {
        ...debt,
        sales: sale ? { ...sale, order_number: sale.order_number } : null,
        customers: customers.find(c => c.id === debt.customer_id) || null,
        users: users.find(u => u.id === sale?.employee_id) || null,
      }
    });
  }, [debts, sales, customers, users]);


  useEffect(() => {
    setLoading(false);
  }, []);

  const handleSettleDebt = (debt: (typeof enrichedDebts)[0]) => {
    if (!debt.sales) {
      toast({
        title: "Sale Not Found",
        description: "The original sale for this debt could not be found.",
        variant: "destructive",
      });
      return;
    }
    setDebtToSettle(debt.sales as Sale);
    router.push("/sales");
  };

  const handleExport = () => {
    const dataToExport = enrichedDebts.map(d => ({
        "Order #": d.sales?.order_number,
        "Customer": d.customers?.name,
        "Employee": d.users?.name || "N/A",
        "Date": format(new Date(d.created_at!), "LLL dd, y"),
        "Amount": d.amount.toFixed(2),
        "Status": d.status,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `debt_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Debt report has been downloaded." });
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Debt Management"
          description="Track and recover outstanding credit sales."
        />
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>
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
                <TableHead className="hidden sm:table-cell">Employee</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : enrichedDebts.length > 0 ? (
                enrichedDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.sales?.order_number}</TableCell>
                    <TableCell>{debt.customers?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{debt.users?.name || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(debt.created_at!), "LLL dd, y")}</TableCell>
                    <TableCell className="text-right">{currency}{debt.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={debt.status === "Paid" ? "secondary" : "destructive"}>
                        {debt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {debt.status === "Unpaid" && (
                        <Button variant="outline" size="sm" onClick={() => handleSettleDebt(debt)}>
                          <Coins className="mr-2 h-4 w-4" />
                          Settle Debt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
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
