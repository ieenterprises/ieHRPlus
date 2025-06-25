'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.");
    }
}

export async function markDebtAsPaid(debtId: string) {
    checkSupabase();
    const { data, error } = await supabase
        .from('debts')
        .update({ status: 'Paid' })
        .eq('id', debtId);

    if (error) {
        throw new Error(error.message);
    }
    revalidatePath('/debts');
    return data;
}
