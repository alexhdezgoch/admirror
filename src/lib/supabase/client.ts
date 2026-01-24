import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Singleton instance to ensure consistent auth state across the app
let supabaseInstance: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Return existing instance if already created (singleton pattern)
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  // Debug: Log what the client sees
  if (typeof window !== 'undefined') {
    console.log('Client: Created browser client, checking cookies...');
    console.log('Client: Document cookies:', document.cookie);
  }

  return supabaseInstance;
}
