import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { user_id, venue_data } = await req.json()

    if (!user_id || !venue_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and venue_data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the current user from the session to verify they match
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user_id matches the authenticated user
    if (currentUser.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create venue owner record
    const { data: venueOwner, error: venueOwnerError } = await supabaseClient
      .from('venue_owners')
      .insert([{
        user_id: user_id,
        venue_name: venue_data.venue_name,
        venue_description: venue_data.venue_description,
        venue_address: venue_data.venue_address,
        venue_city: venue_data.venue_city,
        venue_country: venue_data.venue_country,
        venue_phone: venue_data.venue_phone,
        owner_name: venue_data.owner_name,
        owner_email: venue_data.owner_email,
        owner_phone: venue_data.owner_phone,
        venue_type: venue_data.venue_type,
        opening_hours: venue_data.opening_hours || '',
        capacity: venue_data.capacity || '',
        price_range: venue_data.price_range || '$$',
        status: 'pending_approval'
      }])
      .select()
      .single()

    if (venueOwnerError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create venue owner record', details: venueOwnerError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create pending venue owner request
    const { data: pendingRequest, error: pendingRequestError } = await supabaseClient
      .from('pending_venue_owner_requests')
      .insert([{
        user_id: user_id,
        email: venue_data.owner_email,
        venue_name: venue_data.venue_name,
        venue_address: venue_data.venue_address,
        venue_city: venue_data.venue_city,
        venue_country: venue_data.venue_country,
        contact_name: venue_data.owner_name,
        contact_phone: venue_data.owner_phone,
        additional_info: venue_data.venue_description,
        venue_type: venue_data.venue_type,
        opening_hours: venue_data.opening_hours,
        capacity: venue_data.capacity,
        price_range: venue_data.price_range,
        status: 'pending'
      }])
      .select()
      .single()

    if (pendingRequestError) {
      console.warn('Failed to create pending request:', pendingRequestError)
      // Don't fail the whole operation for this
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        venue_owner: venueOwner,
        pending_request: pendingRequest 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 