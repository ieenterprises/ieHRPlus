
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

// NOTE: Adding a new user is now handled through the sign-up flow or by inviting users via Supabase Auth.
// This function is for creating users directly in the 'users' table which should only be done
// if you are managing users outside of Supabase's built-in auth (e.g., for employees who only use PINs).
// The current implementation uses Supabase Auth, so this function is less relevant for new user creation.
// However, it's useful for creating employees who might not have a password but just a PIN.
export async function addUser(userData: {
    name: string; email: string; role: UserRole; pin: string | null; permissions: string[]; avatar_url: string;
}) {
    checkSupabase();
    // This is tricky without a password. In a real scenario, you'd likely send an invite email.
    // For this app, we'll create a user without a Supabase auth entry, meaning they can ONLY log in with a PIN.
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
    // This will delete from the public.users table.
    // The user might still exist in auth.users. A more robust solution
    // would be a serverless function to delete the auth user too.
    const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    // Also attempt to delete from auth. This requires service_role key on the server.
    // For now, this will likely fail without a proper backend setup, but it's the correct pattern.
    // const { error: authError } = await supabase.auth.admin.deleteUser(id);
    // if (authError) console.warn(`Could not delete auth user: ${authError.message}`);

    revalidatePath('/team');
    return data;
}
