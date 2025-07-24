
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
    
    // Deletes the user from the `auth.users` table, which will cascade and delete
    // the corresponding entry from the `public.users` table due to the foreign key constraint.
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
        // Fallback to delete from public.users if admin deletion fails
        // This might happen if the user was manually created or if permissions are not sufficient.
        console.warn(`Could not delete auth user: ${authError.message}. Deleting from public users table as a fallback.`);
        const { error: publicError } = await supabase.from('users').delete().eq('id', id);
        if (publicError) throw new Error(publicError.message);
    }

    revalidatePath('/team');
    return { success: true };
}
