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
    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { formData } = await req.json()

    // Step 1: Create user with admin client (this ensures it's immediately available)
    console.log('Creating user account...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: formData.full_name,
        phone: formData.phone,
        venue_name: formData.venue_name
      }
    })

    if (authError || !authData.user) {
      console.error('User creation failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user account', details: authError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', authData.user.id)

    // Step 2: Create venue owner record (user definitely exists now)
    const { data: venueOwnerData, error: venueOwnerError } = await supabaseAdmin
      .from('venue_owners')
      .insert([{
        user_id: authData.user.id,
        venue_name: formData.venue_name,
        venue_description: formData.venue_description,
        venue_address: formData.venue_address,
        venue_city: formData.venue_city,
        venue_country: formData.venue_country,
        venue_phone: formData.phone,
        owner_name: formData.full_name,
        owner_email: formData.email,
        owner_phone: formData.phone,
        venue_type: formData.venue_type,
        opening_hours: formData.opening_hours || '',
        capacity: formData.capacity || '',
        price_range: formData.price_range || '$$',
        status: 'pending_approval'
      }])
      .select()
      .single()

    if (venueOwnerError) {
      console.error('Venue owner creation failed:', venueOwnerError)
      // Clean up the user if venue owner creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create venue owner record', details: venueOwnerError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Venue owner created successfully:', venueOwnerData.id)

    // Step 3: Create pending request
    const { data: pendingRequestData, error: pendingRequestError } = await supabaseAdmin
      .from('pending_venue_owner_requests')
      .insert([{
        user_id: authData.user.id,
        email: formData.email,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        venue_city: formData.venue_city,
        venue_country: formData.venue_country,
        contact_name: formData.full_name,
        contact_phone: formData.phone,
        additional_info: formData.venue_description,
        venue_type: formData.venue_type,
        opening_hours: formData.opening_hours,
        capacity: formData.capacity,
        price_range: formData.price_range,
        status: 'pending'
      }])

    if (pendingRequestError) {
      console.warn('Pending request creation failed:', pendingRequestError)
      // Don't fail the whole process for this
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: authData.user,
        venueOwner: venueOwnerData,
        pendingRequest: pendingRequestData
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