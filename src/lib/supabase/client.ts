import { createBrowserClient } from '@supabase/ssr'
import { DB } from './types'

export const createBrowserSB = () =>
  createBrowserClient<DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
