import { serve } from "std/http/server.ts";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js'

// Secure CORS headers - restrict to your domain only
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.com", // Replace with your actual domain
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    if (req.method === "GET") {
      // List payment methods
      const url = new URL(req.url);
      const email = url.searchParams.get('email');
      
      if (!email || email !== user.email) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing email parameter" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Find Stripe customer
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        return new Response(
          JSON.stringify({ paymentMethods: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const customer = customers.data[0];
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });

      return new Response(
        JSON.stringify({ paymentMethods: paymentMethods.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else if (req.method === "DELETE") {
      // Remove payment method
      const body = await req.json();
      const { id } = body;
      
      if (!id || typeof id !== 'string') {
        return new Response(
          JSON.stringify({ error: "Payment method ID is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Verify the payment method belongs to this user
      const paymentMethod = await stripe.paymentMethods.retrieve(id);
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length === 0 || paymentMethod.customer !== customers.data[0].id) {
        return new Response(
          JSON.stringify({ error: "Payment method not found or access denied" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Detach the payment method
      await stripe.paymentMethods.detach(id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
      );
    }

  } catch (error) {
    console.error('Stripe payment methods error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}); 