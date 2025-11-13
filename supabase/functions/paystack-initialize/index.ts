import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        }
      );
    }

    // Get environment variables
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const PAYSTACK_CALLBACK_URL = Deno.env.get("PAYSTACK_CALLBACK_URL") ||
      "https://www.oneeddy.com/paystack-callback";

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Parse request body
    const body = await req.json();
    const {
      email,
      amount, // in kobo
      firstName,
      lastName,
      phone,
      metadata
    } = body;

    console.log("🇳🇬 Paystack Initialize Request:", {
      email,
      amount,
      firstName,
      lastName,
      phone,
      metadataKeys: Object.keys(metadata || {})
    });

    // Validate required fields
    if (!email || !amount || amount <= 0) {
      throw new Error("Missing or invalid: email, amount (must be > 0)");
    }

    if (!phone) {
      throw new Error("Phone number is required");
    }

    // Prepare Paystack request
    const paystackPayload = {
      email,
      amount, // must be in kobo
      first_name: firstName || "",
      last_name: lastName || "",
      mobile_number: phone,
      callback_url: `${PAYSTACK_CALLBACK_URL}?reference={REFERENCE}`,
      metadata: {
        ...metadata,
        cancel_action: `${PAYSTACK_CALLBACK_URL}?status=cancelled`
      }
    };

    console.log("📞 Calling Paystack API...");

    // Call Paystack API
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      }
    );

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error("❌ Paystack API Error:", errorData);
      throw new Error(
        errorData.message || "Paystack API error: " + paystackResponse.statusText
      );
    }

    const paystackData = await paystackResponse.json();

    console.log("✅ Paystack Payment Initialized:", {
      status: paystackData.status,
      reference: paystackData.data?.reference,
      authUrl: paystackData.data?.authorization_url ? "✅" : "❌"
    });

    // Return success response
    return new Response(
      JSON.stringify({
        status: paystackData.status,
        message: paystackData.message,
        data: {
          reference: paystackData.data?.reference,
          authorization_url: paystackData.data?.authorization_url,
          access_code: paystackData.data?.access_code,
          authorization_url_formatted: paystackData.data?.authorization_url
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Paystack Initialize Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        status: false,
        message: errorMessage,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

