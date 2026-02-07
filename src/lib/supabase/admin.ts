import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;
let cachedServiceRoleKey: string | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate environment variables
  if (!url || !serviceRoleKey) {
    console.error('[Supabase Admin] Missing environment variables:', {
      hasUrl: !!url,
      hasServiceRoleKey: !!serviceRoleKey,
      serviceRoleKeyLength: serviceRoleKey?.length,
    });
    throw new Error('Supabase environment variables are not configured');
  }

  // Recreate client if the service role key changed (e.g., env reload)
  if (supabaseAdminInstance && cachedServiceRoleKey !== serviceRoleKey) {
    console.log('[Supabase Admin] Service role key changed, recreating client');
    supabaseAdminInstance = null;
  }

  if (!supabaseAdminInstance) {
    console.log('[Supabase Admin] Creating new admin client:', {
      url,
      serviceRoleKeyLength: serviceRoleKey.length,
      serviceRoleKeyPrefix: serviceRoleKey.substring(0, 20) + '...',
    });

    supabaseAdminInstance = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    cachedServiceRoleKey = serviceRoleKey;
  }

  return supabaseAdminInstance;
}
