
'use server';

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        // In a real app, you'd want to handle this more gracefully.
        // For mock mode, we'll just return early.
        return false;
    }
    return true;
}

export async function addUser(userData: {
    name: string; email: string; role: UserRole; pin: string | null; permissions: string[]; avatar_url: string;
}) {
    if (!checkSupabase()) {
        console.log("Mock addUser called", userData);
        return { ...userData, id: `user_${new Date().getTime()}`, created_at: new Date().toISOString()};
    }
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
     if (!checkSupabase()) {
        console.log("Mock updateUser called", id, userData);
        return { ...userData, id: id };
    }
    const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
}

export async function deleteUser(id: string) {
    if (!checkSupabase()) {
        console.log("Mock deleteUser called", id);
        return { id };
    }
    const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
}
