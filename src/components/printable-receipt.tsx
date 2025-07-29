
"use client";

import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import type { Sale, OpenTicket, SaleItem } from "@/lib/types";
import { useSettings } from "@/hooks/use-settings";

type PrintableReceiptProps = {
  data: (Sale | OpenTicket) & { type: 'receipt' | 'ticket' };
  type: 'receipt' | 'ticket';
};

export const PrintableReceipt = ({ data, type }: PrintableReceiptProps) => {
  const { stores, posDevices, receiptSettings, currency, loggedInUser } = useSettings();
  
  const isSale = (d: any): d is Sale => type === 'receipt' && 'order_number' in d;

  const getStoreIdFromSale = (sale: Sale) => {
    if (!sale.pos_device_id) {
        // Fallback for owner or if device isn't set
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
    printedLogo: null,
    showCustomerInfo: true,
    showComments: false,
    language: 'en',
  };

  const currentReceiptSettings = (storeId && receiptSettings[storeId]) || defaultSettings;

  const items = data.items as SaleItem[];
  const total = data.total;
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = total - subtotal;
  
  return (
    <div className="bg-white text-black font-mono text-xs w-[302px] p-2">
      <div className="text-center space-y-1">
        {currentReceiptSettings.printedLogo && (
          <div className="flex justify-center mb-2">
            <Image
              src={currentReceiptSettings.printedLogo}
              alt={`${currentStore?.name || 'Store'} Logo`}
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        )}
        <h1 className="text-sm font-bold">{currentStore?.name || "ieOrderFlow POS"}</h1>
        <p>{currentStore?.address}</p>
        <p>{format(new Date(data.created_at!), "LLL dd, y HH:mm")}</p>
        
        {currentReceiptSettings.header && <p className="pt-1">{currentReceiptSettings.header}</p>}
      </div>

      <div className="my-2 border-t border-dashed border-black"></div>
      
      <div className="text-center">
        {isSale(data) ? (
          <>
            <p className="font-bold">RECEIPT #{data.order_number}</p>
            <p>Cashier: {data.users?.name || 'N/A'}</p>
            {currentReceiptSettings.showCustomerInfo && data.customers && (
              <p>Customer: {data.customers.name}</p>
            )}
          </>
        ) : (
          <>
            <p className="font-bold">OPEN TICKET: {data.ticket_name}</p>
            <p>Employee: {(data as OpenTicket).users?.name || 'N/A'}</p>
          </>
        )}
      </div>

      <div className="my-2 border-t border-dashed border-black"></div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">ITEM</th>
            <th className="text-center">QTY</th>
            <th className="text-right">PRICE</th>
            <th className="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="text-left w-2/4 pr-1">{item.name}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{currency}{item.price.toFixed(2)}</td>
              <td className="text-right">{currency}{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-black"></div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{currency}{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>TAX:</span>
          <span>{currency}{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>{isSale(data) ? 'TOTAL:' : 'AMOUNT DUE:'}</span>
          <span>{currency}{total.toFixed(2)}</span>
        </div>
      </div>

      {isSale(data) && (
        <>
            <div className="my-2 border-t border-dashed border-black"></div>
            <div className="space-y-1">
                {(data.payment_methods as string[]).map(method => (
                    <div className="flex justify-between" key={method}>
                        <span>{method.toUpperCase()}:</span>
                        {/* In a real scenario, you'd have payment amounts per method */}
                        {data.payment_methods.length === 1 && <span>{currency}{total.toFixed(2)}</span>}
                    </div>
                ))}
            </div>
        </>
      )}

      <div className="my-2 border-t border-dashed border-black"></div>
      
      <div className="text-center space-y-1">
        <p>{currentReceiptSettings.footer}</p>
      </div>
    </div>
  );
};
