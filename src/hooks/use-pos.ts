
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, createElement, useCallback } from 'react';
import type { OpenTicket } from '@/lib/types';
import { useToast } from './use-toast';
import { useSettings } from './use-settings';

type OpenTicketWithRelations = OpenTicket & { users: {name: string | null} | null, customers: {name: string | null} | null };

type PosContextType = {
  openTickets: OpenTicketWithRelations[];
  saveTicket: (ticket: {
    id: string | null;
    items: any[];
    total: number;
    employee_id: string | null;
    customer_id?: string | null;
    ticket_name?: string;
  }) => Promise<string | null>;
  deleteTicket: (ticketId: string) => Promise<void>;
  reservationMode: boolean;
  setReservationMode: (mode: boolean) => void;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const { openTickets: openTicketsData, users, customers, saveTicket, deleteTicket } = useSettings();
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>([]);
  const [reservationMode, setReservationMode] = useState(false);

  useEffect(() => {
    const enrichedTickets = openTicketsData.map(ticket => ({
      ...ticket,
      id: ticket.id, // Ensure the id is carried over
      users: users.find(u => u.id === ticket.employee_id) || null,
      customers: customers.find(c => c.id === ticket.customer_id) || null,
    }));
    setOpenTickets(enrichedTickets);
  }, [openTicketsData, users, customers]);
  
  return createElement(PosContext.Provider, {
    value: { openTickets, saveTicket, deleteTicket, reservationMode, setReservationMode }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
