'use server';

import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdminApp } from '@/lib/firebase-admin';

/**
 * Updates a user's password in Firebase Authentication.
 * This is a server-side action and requires admin privileges.
 *
 * @param uid The UID of the user to update.
 * @param newPassword The new password for the user.
 * @returns An object indicating success or an error message.
 */
export async function updateUserPassword(uid: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await initFirebaseAdminApp();
    await getAuth().updateUser(uid, {
      password: newPassword,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user password:', error);
    // Provide a more user-friendly error message
    const errorMessage = error.code === 'auth/user-not-found'
      ? 'The user could not be found in the authentication system.'
      : 'An unexpected error occurred while updating the password.';
    return { success: false, error: errorMessage };
  }
}
