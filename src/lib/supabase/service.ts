import { createClient } from '@supabase/supabase-js'
import type { DB } from './types'

export const createServiceDB = () =>
    createClient<DB>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    )