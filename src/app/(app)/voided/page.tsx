
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import { type VoidedLog } from "@/lib/types";

export default function VoidedPage() {
  const { voidedLogs, currency, users } = useSettings();
  const [loading, setLoading] = useState(true);

  const enrichedLogs = useMemo(() => {
    return voidedLogs.map(log => ({
      ...log,
      users: users.find(u => u.id === log.voided_by_employee_id) || null
    })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [voidedLogs, users]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const getBadgeVariant = (type: VoidedLog['type']) => {
    switch (type) {
        case 'ticket': return 'destructive';
        case 'receipt': return 'destructive';
        case 'item': return 'secondary';
        default: return 'outline';
    }
  }

  const getLogDetails = (log: VoidedLog) => {
    switch (log.type) {
        case 'ticket':
            return `Ticket: ${log.data.ticket_name}`;
        case 'item':
            return `Item: ${log.data.item_name} (x${log.data.quantity}) from ticket ${log.data.ticket_name}`;
        case 'receipt':
            return `Receipt #${log.data.order_number}: ${log.data.items}`;
        default:
            return '';
    }
  }
  
  const getLogAmount = (log: VoidedLog) => {
    switch (log.type) {
        case 'ticket':
            return log.data.ticket_total?.toFixed(2);
        case 'item':
            return (log.data.price! * log.data.quantity!).toFixed(2);
        case 'receipt':
            return log.data.receipt_total?.toFixed(2);
        default:
            return '0.00';
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voided Logs"
        description="A log of all voided tickets, items, and receipts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Void History</CardTitle>
          <CardDescription>
            Chronological list of all void actions performed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : enrichedLogs.length > 0 ? (
                enrichedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), "LLL dd, y HH:mm")}
                    </TableCell>
                    <TableCell>{log.users?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(log.type)}>
                        {log.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>{getLogDetails(log)}</TableCell>
                    <TableCell className="text-right">
                      {currency}{getLogAmount(log)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No voided items or tickets found.
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
