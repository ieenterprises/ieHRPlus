'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function markDebtAsPaid(debtId: string) {
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
