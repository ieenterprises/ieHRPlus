'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.");
    }
}

// Product Actions
export async function addProduct(productData: { name: string; category_id: string; price: number; stock: number; }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    revalidatePath('/sales');
    return data;
}

export async function updateProduct(id: string, productData: { name: string; category_id: string; price: number; stock: number; }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    revalidatePath('/sales');
    return data;
}

export async function deleteProduct(id: string) {
    checkSupabase();
    const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    revalidatePath('/sales');
    return data;
}


// Category Actions
export async function addCategory(categoryData: { name: string }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    return data;
}

export async function updateCategory(id: string, categoryData: { name: string }) {
    checkSupabase();
    const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    return data;
}

export async function deleteCategory(id: string) {
    checkSupabase();
    const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    return data;
}
