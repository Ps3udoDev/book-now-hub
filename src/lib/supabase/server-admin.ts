import { Database } from '@/types'
import { createClient } from '@supabase/supabase-js'

export function createAdminSB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'admin-users' } },
  })
}
