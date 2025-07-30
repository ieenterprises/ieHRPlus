
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, createElement, useCallback } from 'react';
import type { OpenTicket, User, Customer, SaleItem } from '@/lib/types';
import { useToast } from './use-toast';
import { useSettings } from './use-settings';

type OpenTicketWithRelations = OpenTicket & { 
    users: Pick<User, 'name'> | null, 
    customers: Pick<Customer, 'name'> | null 
};

type PosContextType = {
  openTickets: OpenTicketWithRelations[];
  saveTicket: (ticket: {
    id: string | null;
    items: SaleItem[];
    total: number;
    employee_id: string | null;
    customer_id?: string | null;
    ticket_name?: string;
    order_number: number;
  }) => Promise<string | null>;
  deleteTicket: (ticketId: string) => Promise<void>;
  reservationMode: boolean;
  setReservationMode: (mode: boolean) => void;
  ticketToLoad: OpenTicket | null;
  setTicketToLoad: React.Dispatch<React.SetStateAction<OpenTicket | null>>;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const { openTickets: openTicketsData, users, customers, saveTicket, deleteTicket } = useSettings();
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>([]);
  const [reservationMode, setReservationMode] = useState(false);
  const [ticketToLoad, setTicketToLoad] = useState<OpenTicket | null>(null);

  useEffect(() => {
    const enrichedTickets = openTicketsData.map(ticket => ({
      ...ticket,
      id: ticket.id, // Ensure the id is carried over
      users: users.find(u => u.id === ticket.employee_id) || null,
      customers: customers.find(c => c.id === ticket.customer_id) || null,
    }));
    setOpenTickets(enrichedTickets as OpenTicketWithRelations[]);
  }, [openTicketsData, users, customers]);
  
  return createElement(PosContext.Provider, {
    value: { openTickets, saveTicket, deleteTicket, reservationMode, setReservationMode, ticketToLoad, setTicketToLoad }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
