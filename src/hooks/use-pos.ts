
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, createElement, useCallback } from 'react';
import type { OpenTicket } from '@/lib/types';
import * as ticketActions from '@/app/actions/tickets';
import { useToast } from './use-toast';
import { supabase } from '@/lib/supabase';

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
  }) => Promise<void>;
  deleteTicket: (ticketId: string, silent?: boolean) => Promise<void>;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>([]);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    if (!supabase) return;
    try {
      const tickets = await ticketActions.getOpenTickets();
      setOpenTickets(tickets as OpenTicketWithRelations[]);
    } catch (error: any) {
      toast({ title: "Error fetching open tickets", description: error.message, variant: "destructive" });
    }
  }, [toast]);
  
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
  
  const saveTicket = async (ticketData: any) => {
    await ticketActions.saveTicket(ticketData);
    fetchTickets(); // Refresh list
  };

  const deleteTicket = async (ticketId: string, silent = false) => {
    await ticketActions.deleteTicket(ticketId);
    setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
  };
  
  return createElement(PosContext.Provider, {
    value: { openTickets, saveTicket, deleteTicket }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
