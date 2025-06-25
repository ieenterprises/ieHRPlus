'use server';

import { supabase } from '@/lib/supabase';
import type { SaleItem } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function addSale(
    saleData: {
        items: SaleItem[];
        total: number;
        payment_methods: string[];
        customer_id: string | null;
        employee_id: string | null;
        status: 'Pending' | 'Fulfilled';
    },
    creditInfo?: { customerId: string, amount: number }
) {
    const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();

    if (saleError) {
        throw new Error(saleError.message);
    }

    if (creditInfo) {
        const debtData = {
            sale_id: newSale.id,
            customer_id: creditInfo.customerId,
            amount: creditInfo.amount,
            status: 'Unpaid'
        };
        const { error: debtError } = await supabase.from('debts').insert([debtData]);
        if (debtError) {
            // Potentially roll back sale or handle error appropriately
            throw new Error(debtError.message);
        }
    }

    revalidatePath('/sales');
    revalidatePath('/kitchen');
    revalidatePath('/debts');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    return newSale;
}


export async function updateProductStock(stockUpdates: { id: string; stock: number }[]) {
    const updates = stockUpdates.map(({ id, stock }) =>
        supabase.from('products').update({ stock }).eq('id', id)
    );
    const results = await Promise.all(updates);

    const error = results.find(res => res.error);
    if (error) {
        throw new Error(error.error.message);
    }
}


export async function fulfillOrder(saleId: string) {
    const { data, error } = await supabase
        .from('sales')
        .update({ status: 'Fulfilled' })
        .eq('id', saleId);
    
    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/kitchen');
    return data;
}
