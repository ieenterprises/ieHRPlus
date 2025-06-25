'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.");
    }
}

export async function addCustomer(customerData: { name: string, email: string, phone: string | null }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    revalidatePath('/customers');
    revalidatePath('/sales');
    return data;
}

export async function updateCustomer(id: string, customerData: { name: string, email: string, phone: string | null }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
    revalidatePath('/customers');
    revalidatePath('/sales');
    return data;
}

export async function deleteCustomer(id: string) {
    checkSupabase();
    // TODO: Add a check here if the customer has outstanding debts
    const { data, error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }
    revalidatePath('/customers');
    revalidatePath('/sales');
    return data;
}
