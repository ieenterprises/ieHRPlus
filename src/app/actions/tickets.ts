'use server';

import { supabase } from '@/lib/supabase';
import type { SaleItem } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }
}

export async function getOpenTickets() {
    checkSupabase();
    const { data, error } = await supabase
        .from('open_tickets')
        .select('*, users(name), customers(name)')
        .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data;
}

export async function saveTicket(ticketData: {
    items: SaleItem[];
    total: number;
    employee_id: string | null;
    customer_id?: string | null;
    ticket_name?: string;
}) {
    checkSupabase();
    const { data, error } = await supabase
        .from('open_tickets')
        .insert([ticketData])
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    revalidatePath('/sales');
    return data;
}

export async function deleteTicket(id: string) {
    checkSupabase();
    const { data, error } = await supabase
        .from('open_tickets')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/sales');
    return data;
}
