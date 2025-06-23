import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.auth.getSession().then(
  ({ data, error }) => {
    if (error) {
      console.error('Supabase connection error:', error.message)
    } else {
      console.log('Supabase connected successfully')
    }
  }
)

const { data, error } = await supabase
  .from('venues')
  .select(`
    *,
    venue_owner:owner_id (
      full_name,
      email
    )
  `)
  .eq('status', 'pending'); 