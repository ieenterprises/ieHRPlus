
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

export const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ data, type }, ref) => {
    const { branches, posDevices, receiptSettings, currency, loggedInUser } = useSettings();
    
    const isSale = (d: any): d is Sale => type === 'receipt' && 'order_number' in d;

    const getBranchIdFromSale = (sale: Sale) => {
        const device = posDevices.find(d => d.id === sale.pos_device_id);
        if (device) return device.branch_id;

        // Fallback for older sales or admin sales without a specific device
        const mainBranch = branches.find(s => s.name.toLowerCase() === 'main branch');
        return mainBranch?.id || branches[0]?.id || null;
    }
    
    const branchId = isSale(data) ? getBranchIdFromSale(data) : (branches.find(s => s.name.toLowerCase() === 'main branch')?.id || branches[0]?.id);
    const currentBranch = branches.find(s => s.id === branchId);

    const defaultSettings = {
      header: `Welcome to ${currentBranch?.name || 'our branch'}!`,
      footer: "Thank you for your purchase!",
      printedLogo: null,
      showCustomerInfo: true,
      showComments: false,
      language: 'en',
    };

    const currentReceiptSettings = (branchId && receiptSettings[branchId]) || defaultSettings;

    const items = data.items as SaleItem[];
    const total = data.total;
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = total - subtotal;
    
    return (
      <div ref={ref} className="bg-white text-black font-sans text-xs w-[302px] p-2 flex flex-col">
        <div className="text-center space-y-1 w-full">
          {currentReceiptSettings.printedLogo && (
            <div className="flex justify-center mb-2">
              <Image
                src={currentReceiptSettings.printedLogo}
                alt={`${currentBranch?.name || 'Branch'} Logo`}
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          )}
          <h1 className="text-sm font-bold">{currentBranch?.name || "ieOrderFlow POS"}</h1>
          <p>{currentBranch?.address}</p>
          <p>{format(new Date(data.created_at!), "LLL dd, y HH:mm")}</p>
          
          {currentReceiptSettings.header && <p className="pt-1">{currentReceiptSettings.header}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black"></div>
        
        <div className="text-center w-full">
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
              <p className="font-bold">OPEN TICKET #{ (data as OpenTicket).order_number }</p>
              <p>Employee: {(data as OpenTicket).users?.name || 'N/A'}</p>
            </>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black"></div>

        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left w-[45%]">ITEM</th>
              <th className="text-center w-[15%]">QTY</th>
              <th className="text-right w-[20%]">PRICE</th>
              <th className="text-right w-[20%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.id}-${index}`}>
                <td className="text-left pr-1 break-words">{item.name}</td>
                <td className="text-center align-top">{item.quantity}</td>
                <td className="text-right align-top">{currency}{item.price.toFixed(2)}</td>
                <td className="text-right align-top">{currency}{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-2 border-t border-dashed border-black"></div>

        <div className="space-y-1 w-full">
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
              <div className="space-y-1 w-full">
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
        
        <div className="text-center space-y-1 w-full">
          <p>{currentReceiptSettings.footer}</p>
        </div>
      </div>
    );
  }
);
PrintableReceipt.displayName = "PrintableReceipt";
