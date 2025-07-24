
'use server';

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }
    return true;
}

// NOTE: This function is for creating employees who might not have a password but just a PIN.
// With the new auth flow, we invite users through Supabase Auth.
export async function addUser(userData: {
    name: string; email: string; role: UserRole; permissions: string[]; avatar_url: string;
}) {
    checkSupabase();
    // In a real app, you would use Supabase's admin functionality to invite a user by email
    // This is a simplified version for this app.
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
    name: string; email: string; role: UserRole; permissions: string[];
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
    
    // This is the correct way to delete a user using the admin client.
    // The corresponding profile in `public.users` will be deleted automatically
    // by the `ON DELETE CASCADE` constraint we set up in the SQL schema.
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
        console.error("Error deleting user:", error.message);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    revalidatePath('/team');
    return { success: true };
}
