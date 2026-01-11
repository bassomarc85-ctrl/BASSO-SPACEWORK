import { createClient } from '@supabase/supabase-js'
import { requiredEnv } from './env'
export const supabase = createClient(requiredEnv('VITE_SUPABASE_URL'), requiredEnv('VITE_SUPABASE_ANON_KEY'))
