'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addCustomer(customerData: { name: string, email: string, phone: string | null }) {
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
