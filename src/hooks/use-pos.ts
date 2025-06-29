"use client";

import { createContext, useContext, useState, ReactNode, createElement } from 'react';
import type { OpenTicket } from '@/lib/types';

const MOCK_OPEN_TICKETS: (OpenTicket & { users: {name: string | null}, customers: {name: string | null} })[] = [
    { id: "ticket_1", ticket_name: "Table 5", total: 17.49, created_at: new Date(Date.now() - 60*60*1000).toISOString(), employee_id: 'user_2', customer_id: null, items: [{id: 'prod_1', name: 'Cheeseburger', quantity: 1, price: 12.99}, {id: 'prod_2', name: 'Fries', quantity: 1, price: 4.50}], users: { name: 'John Cashier'}, customers: null, notes: "No onions" },
    { id: "ticket_2", ticket_name: "Bar Seat 2", total: 27.50, created_at: new Date(Date.now() - 30*60*1000).toISOString(), employee_id: 'user_1', customer_id: null, items: [{id: 'prod_4', name: 'T-Shirt', quantity: 1, price: 25.00}, {id: 'prod_3', name: 'Cola', quantity: 1, price: 2.50}], users: { name: 'Admin'}, customers: null, notes: "Size L" },
];

type OpenTicketWithRelations = OpenTicket & { users: {name: string | null}, customers: {name: string | null} };

type PosContextType = {
  openTickets: OpenTicketWithRelations[];
  saveOrUpdateTicket: (ticket: OpenTicketWithRelations, isUpdate: boolean) => void;
  deleteTicket: (ticketId: string) => void;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>(MOCK_OPEN_TICKETS);

  const saveOrUpdateTicket = (ticket: OpenTicketWithRelations, isUpdate: boolean) => {
    setOpenTickets(prevTickets => {
      if (isUpdate) {
        return prevTickets.map(t => t.id === ticket.id ? ticket : t);
      } else {
        return [ticket, ...prevTickets];
      }
    });
  };

  const deleteTicket = (ticketId: string) => {
    setOpenTickets(prevTickets => prevTickets.filter(t => t.id !== ticketId));
  };

  return createElement(PosContext.Provider, {
    value: { openTickets, saveOrUpdateTicket, deleteTicket }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
