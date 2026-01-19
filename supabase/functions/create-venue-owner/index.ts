import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: e.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { user_id, full_name, email, phone } = body;

    console.log("Received request body:", body);
    console.log("Extracted fields:", { user_id, full_name, email, phone });

    if (!user_id || !full_name || !email) {
      console.error("Missing required fields:", { 
        hasUserId: !!user_id, 
        hasFullName: !!full_name, 
        hasEmail: !!email 
      });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          required: ["user_id", "full_name", "email"],
          received: { user_id: !!user_id, full_name: !!full_name, email: !!email }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Creating venue owner:", { user_id, full_name, email, phone });

    // Insert into venue_owners table using service role (bypasses RLS)
    // Retry logic for foreign key constraint (user might not be visible immediately after creation)
    let data = null;
    let error = null;
    let retries = 3;
    let delay = 500; // Start with 500ms delay

    while (retries > 0) {
      const result = await supabase
        .from("venue_owners")
        .insert([
          {
            user_id,
            full_name,
            email,
            phone,
          },
        ])
        .select()
        .single();

      error = result.error;
      data = result.data;

      // If successful, break out of retry loop
      if (!error) {
        console.log("✅ Venue owner created successfully on attempt", 4 - retries);
        break;
      }

      // If it's a foreign key error, retry after delay
      if (error?.code === '23503' && retries > 1) {
        console.log(`⚠️ Foreign key constraint error, retrying in ${delay}ms... (${retries - 1} retries left)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 500ms, 1000ms, 2000ms
      } else {
        // Not a retryable error, break
        break;
      }
    }

    if (error) {
      console.error("Error creating venue owner:", error);
      console.error("Error code:", error.code);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({
            error: "Venue owner already exists",
            details: "A venue owner record with this user_id already exists",
            code: error.code,
          }),
          {
            status: 409, // Conflict
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: "Failed to create venue owner",
          details: error.message,
          code: error.code,
          hint: error.hint,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Venue owner created successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
