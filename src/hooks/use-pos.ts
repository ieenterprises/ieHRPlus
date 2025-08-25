
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, createElement, useCallback } from 'react';
import type { OpenTicket, User, Customer, SaleItem } from '@/lib/types';
import { useToast } from './use-toast';
import { useSettings } from './use-settings';
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

type OpenTicketWithRelations = OpenTicket & { 
    users: Pick<User, 'name'> | null, 
    customers: Pick<Customer, 'name'> | null 
};

type PosContextType = {
  openTickets: OpenTicketWithRelations[];
  saveTicket: (ticket: Partial<OpenTicket>) => Promise<OpenTicket | null>;
  updateTicket: (ticket: OpenTicket) => Promise<void>;
  deleteTicket: (ticketId: string) => void;
  reservationMode: boolean;
  setReservationMode: (mode: boolean) => void;
  ticketToSettle: OpenTicket | null;
  setTicketToSettle: React.Dispatch<React.SetStateAction<OpenTicket | null>>;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const { openTickets: openTicketsData, setOpenTickets: setOpenTicketsData, users, customers, loggedInUser } = useSettings();
  const [openTickets, setOpenTickets] = useState<OpenTicketWithRelations[]>([]);
  const [reservationMode, setReservationMode] = useState(false);
  const [ticketToSettle, setTicketToSettle] = useState<OpenTicket | null>(null);

  useEffect(() => {
    const enrichedTickets = openTicketsData.map(ticket => ({
      ...ticket,
      id: ticket.id, // Ensure the id is carried over
      users: users.find(u => u.id === ticket.employee_id) || null,
      customers: customers.find(c => c.id === ticket.customer_id) || null,
    }));
    setOpenTickets(enrichedTickets as OpenTicketWithRelations[]);
  }, [openTicketsData, users, customers]);

  const saveTicket = async (ticketData: Partial<OpenTicket>): Promise<OpenTicket | null> => {
      try {
          if (!loggedInUser?.businessId) {
              throw new Error("Business ID is missing.");
          }
          const dataToSave = {
              ...ticketData,
              businessId: loggedInUser.businessId,
          };
          if (ticketData.id) {
              const ticketRef = doc(db, 'open_tickets', ticketData.id);
              await updateDoc(ticketRef, dataToSave);
              return { ...ticketData, id: ticketData.id } as OpenTicket;
          } else {
              const newDocRef = await addDoc(collection(db, 'open_tickets'), {
                  ...dataToSave,
                  created_at: new Date().toISOString(),
              });
              return { ...ticketData, id: newDocRef.id, created_at: new Date().toISOString() } as OpenTicket;
          }
      } catch (error) {
          console.error("Error saving ticket:", error);
          return null;
      }
  };
  
  const updateTicket = async (ticketData: OpenTicket) => {
    // Optimistic UI update first
    setOpenTicketsData(prev =>
      prev.map(t => (t.id === ticketData.id ? ticketData : t))
    );
    // Then update in the background
    try {
      if (ticketData.id) {
        const ticketRef = doc(db, 'open_tickets', ticketData.id);
        await updateDoc(ticketRef, ticketData);
      }
    } catch (error) {
      console.error("Error updating ticket in DB:", error);
      // You might want to add error handling to revert the optimistic update
    }
  };

  const deleteTicket = (ticketId: string) => {
    // This is now purely an optimistic UI update.
    // The background DB operation is handled in the sales page.
    setOpenTicketsData(prev => prev.filter(ticket => ticket.id !== ticketId));
  };
  
  return createElement(PosContext.Provider, {
    value: { openTickets, saveTicket, updateTicket, deleteTicket, reservationMode, setReservationMode, ticketToSettle, setTicketToSettle }
  }, children);
}

export function usePos() {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
