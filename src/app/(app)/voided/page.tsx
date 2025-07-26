
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voided Logs"
        description="A log of all voided tickets and items."
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
                      <Badge variant={log.type === 'ticket' ? 'destructive' : 'secondary'}>
                        {log.type === 'ticket' ? 'Ticket Void' : 'Item Void'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.type === 'ticket' 
                        ? `Ticket: ${log.data.ticket_name}`
                        : `Item: ${log.data.item_name} (x${log.data.quantity}) from ticket ${log.data.ticket_name}`
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {log.type === 'ticket'
                        ? `${currency}${log.data.ticket_total?.toFixed(2)}`
                        : `${currency}${(log.data.price! * log.data.quantity!).toFixed(2)}`
                      }
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
