import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, userData, venueData } = await req.json()

    if (!email || !password || !userData || !venueData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone,
        venue_name: venueData.venue_name
      }
    })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account', details: authError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', authData.user.id)

    // Step 2: Wait a moment to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Verify user exists in auth.users
    const { data: userCheck, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(authData.user.id)
    
    if (userCheckError || !userCheck.user) {
      return new Response(
        JSON.stringify({ error: 'User verification failed', details: userCheckError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User verified in auth.users:', userCheck.user.id)

    // Step 4: Create venue owner record
    const { data: venueOwnerData, error: venueOwnerError } = await supabaseAdmin
      .from('venue_owners')
      .insert([{
        user_id: authData.user.id,
        venue_name: venueData.venue_name,
        venue_description: venueData.venue_description,
        venue_address: venueData.venue_address,
        venue_city: venueData.venue_city,
        venue_country: venueData.venue_country,
        venue_phone: venueData.venue_phone,
        owner_name: userData.full_name,
        owner_email: email,
        owner_phone: userData.phone,
        venue_type: venueData.venue_type,
        opening_hours: venueData.opening_hours || '',
        capacity: venueData.capacity || '',
        price_range: venueData.price_range || '$$',
        status: 'pending_approval'
      }])
      .select()
      .single()

    if (venueOwnerError) {
      console.error('Venue owner creation failed:', venueOwnerError)
      
      // If venue owner creation fails, we should clean up the user account
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create venue owner record', details: venueOwnerError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Venue owner created successfully:', venueOwnerData.id)

    // Step 5: Create pending request record
    const { data: pendingRequestData, error: pendingRequestError } = await supabaseAdmin
      .from('pending_venue_owner_requests')
      .insert([{
        user_id: authData.user.id,
        email: email,
        venue_name: venueData.venue_name,
        venue_address: venueData.venue_address,
        venue_city: venueData.venue_city,
        venue_country: venueData.venue_country,
        contact_name: userData.full_name,
        contact_phone: userData.phone,
        additional_info: venueData.venue_description,
        venue_type: venueData.venue_type,
        opening_hours: venueData.opening_hours,
        capacity: venueData.capacity,
        price_range: venueData.price_range,
        status: 'pending'
      }])
      .select()
      .single()

    if (pendingRequestError) {
      console.warn('Pending request creation failed:', pendingRequestError)
      // Don't fail the whole process for this
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: authData.user,
        venue_owner: venueOwnerData,
        pending_request: pendingRequestData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})