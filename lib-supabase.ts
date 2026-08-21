import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada');
}

// Client para backend (service role - acesso total)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: { persistSession: false },
});

// Client para frontend (anon key - RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');
