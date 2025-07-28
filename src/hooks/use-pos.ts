
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
  }) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  setOpenTickets: React.Dispatch<React.SetStateAction<OpenTicket[]>>;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error parsing localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    }, [key, value]);

    return [value, setValue];
};


export function PosProvider({ children }: { children: ReactNode }) {
  const [openTicketsData, setOpenTicketsData] = useLocalStorage<OpenTicket[]>('openTickets', []);
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>([]);
  const { users, customers } = useSettings();

  useEffect(() => {
    const enrichedTickets = openTicketsData.map(ticket => ({
      ...ticket,
      users: users.find(u => u.id === ticket.employee_id) || null,
      customers: customers.find(c => c.id === ticket.customer_id) || null,
    }));
    setOpenTickets(enrichedTickets);
  }, [openTicketsData, users, customers]);

  const saveTicket = async (ticketData: any) => {
    setOpenTicketsData(prev => {
        const existingIndex = prev.findIndex(t => t.id === ticketData.id);
        if (existingIndex > -1) {
            const updatedTickets = [...prev];
            updatedTickets[existingIndex] = { ...updatedTickets[existingIndex], ...ticketData };
            return updatedTickets;
        } else {
            const newTicket = { ...ticketData, id: `ticket_${new Date().getTime()}`, created_at: new Date().toISOString() };
            return [...prev, newTicket];
        }
    });
  };

  const deleteTicket = async (ticketId: string) => {
    setOpenTicketsData(prev => prev.filter(t => t.id !== ticketId));
  };
  
  return createElement(PosContext.Provider, {
    value: { openTickets, saveTicket, deleteTicket, setOpenTickets: setOpenTicketsData }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
