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
    const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    revalidatePath('/reservations');
    revalidatePath('/sales');
    return data;
}
