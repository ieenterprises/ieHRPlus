import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = "https://pyhryzlanyjhyhnoyjpu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aHJ5emxhbnlqaHlobm95anB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjY5MzIsImV4cCI6MjA2ODk0MjkzMn0.JCeoLg1Q6eOvc4Wo3eRlbDSmNqYJXWw4KBwlBuBYaZ4";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


let supabaseInstance = null;
let supabaseAdminInstance = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    if (supabaseServiceKey) {
      supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
       console.warn(
        "Supabase admin client not initialized. Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables for admin-level operations."
      );
    }

  } catch (error) {
    console.error("Error initializing Supabase client:", error);
  }
} else {
  console.warn(
    "Supabase integration is disconnected. The app is running in a local development mode with mock data. To connect to a database, provide Supabase credentials in your environment variables."
  );
}

export const supabase = supabaseInstance;
export const supabaseAdmin = supabaseAdminInstance;
