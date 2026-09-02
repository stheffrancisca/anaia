import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'SUPABASE_URL não está configurada.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'SUPABASE_ANON_KEY não está configurada.'
  );
}

export function createSupabaseServerClient() {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}