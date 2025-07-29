
'use server'

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import type { User, Role } from '@/lib/types';

// This is a simplified example. In a real app, you'd use Firebase Admin SDK for user creation.
// For simplicity, we are managing users directly in Firestore here.
// NOTE: This approach does not use Firebase Authentication and is for demo purposes.

export async function createUser(userData: Omit<User, 'id'>) {
    // This is a placeholder for actual user creation with Firebase Auth.
    // We'll generate a random ID for the Firestore document.
    const newId = doc(collection(db, "users")).id;
    const userDocRef = doc(db, 'users', newId);
    await setDoc(userDocRef, { ...userData, id: newId });
    revalidatePath('/team');
}

export async function updateUser(userId: string, userData: Partial<User>) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, userData);
    revalidatePath('/team');
}

export async function deleteUser(userId: string) {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    revalidatePath('/team');
}

export async function createRole(roleData: Omit<Role, 'id'>) {
    const newId = doc(collection(db, "roles")).id;
    const roleDocRef = doc(db, 'roles', newId);
    await setDoc(roleDocRef, { ...roleData, id: newId });
    revalidatePath('/team');
}

export async function updateRole(roleId: string, roleData: Partial<Role>) {
    const batch = writeBatch(db);
    const roleDocRef = doc(db, 'roles', roleId);
    batch.update(roleDocRef, roleData);

    // Update permissions for all users with this role
    if (roleData.name && roleData.permissions) {
        const usersQuery = query(collection(db, 'users'), where('role', '==', roleData.name));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(userDoc => {
            const userDocRef = doc(db, 'users', userDoc.id);
            batch.update(userDocRef, { permissions: roleData.permissions });
        });
    }
    
    await batch.commit();
    revalidatePath('/team');
}

export async function deleteRole(roleId: string) {
    const roleDocRef = doc(db, 'roles', roleId);
    await deleteDoc(roleDocRef);
    revalidatePath('/team');
}

    