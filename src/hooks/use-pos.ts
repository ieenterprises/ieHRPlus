
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
  deleteTicket: (ticketId: string) => Promise<void>;
  reservationMode: boolean;
  setReservationMode: (mode: boolean) => void;
  ticketToLoad: OpenTicket | null;
  setTicketToLoad: React.Dispatch<React.SetStateAction<OpenTicket | null>>;
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const { openTickets: openTicketsData, setOpenTickets: setOpenTicketsData, users, customers, loggedInUser } = useSettings();
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
  
  const deleteTicket = async (ticketId: string) => {
      try {
          if (ticketId) {
              await deleteDoc(doc(db, 'open_tickets', ticketId));
          }
      } catch (error) {
          console.error("Error deleting ticket:", error);
      }
  };
  
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
