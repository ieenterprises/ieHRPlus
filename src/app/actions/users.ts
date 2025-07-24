
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

export async function inviteUser(userData: {
    name: string; email: string; role: UserRole; permissions: string[]; avatar_url: string;
}) {
    checkSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      userData.email,
      {
        data: {
          name: userData.name,
          role: userData.role,
          permissions: userData.permissions,
          avatar_url: userData.avatar_url,
        }
      }
    );

    if (error) {
        console.error("Error inviting user:", error.message);
        throw new Error(`Failed to invite user: ${error.message}`);
    }
    
    revalidatePath('/team');
    return data;
}

export async function updateUser(id: string, userData: {
    name: string; email: string; role: UserRole; permissions: string[];
}) {
    checkSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('users')
        .update(userData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/team');
    return data;
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
