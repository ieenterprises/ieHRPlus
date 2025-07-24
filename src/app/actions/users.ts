
'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }
    return true;
}

const checkSupabaseAdmin = () => {
    if (!supabaseAdmin) {
        throw new Error("Supabase admin client is not initialized. Please check your service role key environment variable.");
    }
    return true;
}

export async function createUser(userData: {
    name: string; email: string; password?: string; role: UserRole; permissions: string[]; avatar_url: string;
}) {
    checkSupabaseAdmin();
    
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm user's email
        user_metadata: {
          name: userData.name,
          role: userData.role,
          permissions: userData.permissions,
          avatar_url: userData.avatar_url,
        }
    });

    if (error) {
        console.error("Error creating user:", error.message);
        throw new Error(`Failed to create user: ${error.message}`);
    }
    
    revalidatePath('/team');
    return authData.user;
}

export async function updateUser(id: string, userData: {
    name: string; email: string; password?: string; role: UserRole; permissions: string[];
}) {
    checkSupabaseAdmin();

    const { password, ...profileData } = userData;

    // Update user profile data in the `users` table
    const { error: profileError } = await supabaseAdmin
        .from('users')
        .update(profileData)
        .eq('id', id);

    if (profileError) {
        console.error("Error updating user profile:", profileError.message);
        throw new Error(profileError.message);
    }
    
    // If a new password is provided, update it in Auth
    if (password) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            id,
            { password: password }
        );
        if (authError) {
            console.error("Error updating user password:", authError.message);
            throw new Error(`Failed to update password: ${authError.message}`);
        }
    }

    revalidatePath('/team');
    return { success: true };
}

export async function deleteUser(id: string) {
    checkSupabaseAdmin();
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
        console.error("Error deleting user:", error.message);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    revalidatePath('/team');
    return { success: true };
}
