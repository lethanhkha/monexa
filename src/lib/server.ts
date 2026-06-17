import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

// Server-side Supabase client (for API routes / edge functions)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey || import.meta.env.VITE_SUPABASE_ANON_KEY)
}
