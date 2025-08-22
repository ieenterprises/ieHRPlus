
"use client";

import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import type { Sale, OpenTicket, SaleItem } from "@/lib/types";
import { useSettings } from "@/hooks/use-settings";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type PrintableA4ReceiptProps = {
  data: (Sale | OpenTicket) & { type: 'receipt' | 'ticket' };
  type: 'receipt' | 'ticket';
};

export const PrintableA4Receipt = ({ data, type }: PrintableA4ReceiptProps) => {
  const { stores, posDevices, receiptSettings, currency } = useSettings();
  
  const isSale = (d: any): d is Sale => type === 'receipt' && 'order_number' in d;

  const getStoreIdFromSale = (sale: Sale) => {
    if (!sale.pos_device_id) {
        const mainBranch = stores.find(s => s.name === 'Main Branch');
        return mainBranch?.id || stores[0]?.id || null;
    }
    const device = posDevices.find(d => d.id === sale.pos_device_id);
    return device?.store_id || null;
  }
  
  const storeId = isSale(data) ? getStoreIdFromSale(data) : (stores.find(s => s.name === 'Main Branch')?.id || stores[0]?.id);
  const currentStore = stores.find(s => s.id === storeId);

  const defaultSettings = {
    header: `Welcome to ${currentStore?.name || 'our store'}!`,
    footer: "Thank you for your purchase!",
    emailedLogo: null,
    showCustomerInfo: true,
  };

  const currentReceiptSettings = (storeId && receiptSettings[storeId]) || defaultSettings;

  const items = data.items as SaleItem[];
  const total = data.total;
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = total - subtotal;

  const documentTitle = isSale(data) ? "Tax Invoice" : "Order Ticket";
  const orderNumber = isSale(data) ? data.order_number : (data as OpenTicket).order_number;

  return (
    <div className="bg-white text-black p-8 font-sans w-[210mm] min-h-[297mm]">
      <header className="flex justify-between items-start pb-4 border-b">
        <div className="flex items-center gap-4">
          {currentReceiptSettings.emailedLogo && (
            <Image
              src={currentReceiptSettings.emailedLogo}
              alt={`${currentStore?.name || 'Store'} Logo`}
              width={96}
              height={96}
              className="object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{currentStore?.name || "ieOrderFlow POS"}</h1>
            <p className="text-sm text-gray-600">{currentStore?.address}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-700">{documentTitle}</h2>
          <p className="text-sm">Order #{orderNumber}</p>
          <p className="text-sm">Date: {format(new Date(data.created_at!), "LLL dd, y HH:mm")}</p>
        </div>
      </header>

      <section className="my-6 grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-1">Billed To:</h3>
          {currentReceiptSettings.showCustomerInfo && data.customers ? (
            <div className="text-sm text-gray-600">
              <p>{data.customers.name}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Walk-in Customer</p>
          )}
        </div>
        <div className="text-right">
          <h3 className="font-semibold mb-1">Served By:</h3>
          <p className="text-sm text-gray-600">{data.users?.name || 'N/A'}</p>
        </div>
      </section>

      <section className="my-8">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-1/2">Item Description</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{currency}{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{currency}{(item.price * item.quantity).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex justify-end my-8">
        <div className="w-1/2 space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>{currency}{subtotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span>{currency}{tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
                <span>{isSale(data) ? 'Total Paid:' : 'Amount Due:'}</span>
                <span>{currency}{total.toFixed(2)}</span>
            </div>
        </div>
      </section>
      
      {isSale(data) && (
        <section className="my-8">
            <h3 className="font-semibold mb-2">Payment Details</h3>
            {(data.payment_methods as string[]).map(method => (
                <div key={method} className="text-sm text-gray-600">
                    Paid with {method}
                </div>
            ))}
        </section>
      )}

      <footer className="mt-auto pt-8 border-t text-center text-xs text-gray-500">
        <p>{currentReceiptSettings.footer}</p>
      </footer>
    </div>
  );
};
