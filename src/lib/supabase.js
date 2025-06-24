import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection (optional, can be removed in production)
supabase.auth.getSession().then(
  ({ data, error }) => {
    if (error) {
      console.error('Supabase connection error:', error.message)
    } else {
      console.log('Supabase connected successfully')
    }
  }
)

// Utility function to fetch tables for a venue
export async function fetchTables(venueId) {
  const { data, error } = await supabase
    .from('venue_tables')
    .select('*')
    .eq('venue_id', venueId);
  return { data, error };
}

// Example function to fetch venues with owner info
export async function fetchVenuesWithOwners() {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, owner_id, venue_owners(*)');
  return { data, error };
}

export async function fetchMemberBookings(venueId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('user_id, user:user_profiles(first_name, last_name), credit_balance')
    .eq('venue_id', venueId);
  return { data, error };
}

export async function addTable(venueId, tableData) {
  const { data, error } = await supabase
    .from('venue_tables')
    .insert([{ venue_id: venueId, ...tableData }])
    .select()
  return { data, error };
}
