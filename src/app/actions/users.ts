'use server';

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.");
    }
}

export async function addUser(userData: {
    name: string; email: string; role: UserRole; pin: string | null; permissions: string[]; avatar_url: string;
}) {
    checkSupabase();
    const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
}

export async function updateUser(id: string, userData: {
    name: string; email: string; role: UserRole; pin: string | null; permissions: string[];
}) {
    checkSupabase();
    const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
}

export async function deleteUser(id: string) {
    checkSupabase();
    const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
}
