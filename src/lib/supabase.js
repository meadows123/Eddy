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

async function fetchVenues() {
  await supabase.from('venues').select('*');
}
fetchVenues();

// Insert a new venue
async function insertVenue() {
  await supabase.from('venues').insert({
    name: 'My Venue',
    owner_id: 'the-user-id', // This must match a user_id in venue_owners
    // ...other fields
  });
}

insertVenue();

// Example function to fetch venues with owner info
export async function fetchVenuesWithOwners() {
  const { data, error } = await supabase
    .from('venues')
    .select('*, venue_owners(*)');
  return { data, error };
}

const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length;
const pendingPayouts = bookings
  .filter(b => b.status === 'pending_payout')
  .reduce((sum, b) => sum + (b.tables?.price || 0), 0);

// Fetch tables for the venue
export async function fetchTables(venueId) {
  const { data, error } = await supabase
    .from('venue_tables')
    .select('*')
    .eq('venue_id', venueId);
  return { data, error };
}

const totalTables = tables ? tables.length : 0;

setStats({
  totalBookings,
  totalRevenue,
  averageRating,
  popularTables,
  pendingPayouts,
  activeBookings,
  totalTables,
});

const { data: memberBookings, error: memberError } = await supabase
  .from('bookings')
  .select('user_id, user:user_profiles(first_name, last_name), credit_balance')
  .eq('venue_id', venueId);

const uniqueMembers = Array.from(
  new Map(
    memberBookings.map(m => [m.user_id, m.user])
  ).values()
);

setMembers(uniqueMembers); 