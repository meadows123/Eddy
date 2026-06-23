import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthCallbackRequest {
  code: string;
  state: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json() as OAuthCallbackRequest;

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get environment variables
    const stripeClientId = Deno.env.get("STRIPE_CLIENT_ID");
    const stripeClientSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeTestSecret = Deno.env.get("STRIPE_TEST_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeClientId || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    // Use test secret if available, otherwise use live secret
    const stripeSecret = stripeTestSecret || stripeClientSecret;

    if (!stripeSecret) {
      throw new Error("No Stripe secret key available");
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: stripeClientId,
        client_secret: stripeSecret,
        code: code,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Stripe token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    const stripeUserId = tokenData.stripe_user_id;
    const stripeAccessToken = tokenData.access_token;

    if (!stripeUserId) {
      throw new Error("No Stripe user ID in token response");
    }

    // Get the current user from the request context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with service role key to update venue_owners
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Extract user ID from auth header or get from session
    // For now, we'll need to get it from the request body or session
    // This will be passed from the frontend
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Could not verify user from token");
    }

    // Update the venue_owners table with the connected account ID
    const { data: updateData, error: updateError } = await supabaseClient
      .from("venue_owners")
      .update({
        stripe_connected_account_id: stripeUserId,
        stripe_access_token: stripeAccessToken, // Optional: store for future API calls
      })
      .eq("user_id", user.id)
      .select();

    if (updateError) {
      throw new Error(`Failed to update venue owner: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Stripe account connected successfully",
        connected_account_id: stripeUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Stripe OAuth error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect Stripe account",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

