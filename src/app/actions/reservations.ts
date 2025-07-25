
'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

type NewReservationData = {
  guest_name: string;
  product_id: string;
  check_in: string;
  check_out: string;
  status: 'Confirmed' | 'Checked-in';
};

const checkSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Please check your environment variables.");
    }
}

export async function addReservation(reservationData: NewReservationData) {
    checkSupabase();
    
    // Create the reservation
    const { data: newReservation, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    
    // If the guest is checking in immediately, update the room status
    if (reservationData.status === 'Checked-in' && newReservation.product_id) {
        const { error: roomError } = await supabase
            .from('products')
            .update({ status: 'Occupied' })
            .eq('id', newReservation.product_id);
            
        if (roomError) {
             // Log the error but don't block the main operation
             console.error(`Failed to update room status for product ${newReservation.product_id}:`, roomError.message);
        }
    }

    revalidatePath('/reservations');
    revalidatePath('/sales');
    return newReservation;
}

export async function updateReservationStatus(
    reservationId: string,
    productId: string,
    status: 'Confirmed' | 'Checked-in' | 'Checked-out'
) {
    checkSupabase();

    // 1. Update the reservation status
    const { data, error: reservationError } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', reservationId);

    if (reservationError) {
        throw new Error(reservationError.message);
    }

    // 2. Determine the new room status and update the product
    let newRoomStatus: 'Occupied' | 'Available' | null = null;
    if (status === 'Checked-in') {
        newRoomStatus = 'Occupied';
    } else if (status === 'Checked-out') {
        newRoomStatus = 'Available';
    }

    if (newRoomStatus) {
        const { error: roomError } = await supabase
            .from('products')
            .update({ status: newRoomStatus })
            .eq('id', productId);
        
        if (roomError) {
            // Log the error but don't block the main operation, as the reservation itself was updated.
            // A more robust solution might involve transactions if this needs to be atomic.
            console.error(`Failed to update room status for product ${productId}:`, roomError.message);
        }
    }

    revalidatePath('/reservations');
    return data;
}
