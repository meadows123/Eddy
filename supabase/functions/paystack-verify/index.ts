import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Parse request body
    const body = await req.json();
    const { reference } = body;

    console.log("🔍 Paystack Verify Request:", {
      reference,
    });

    // Validate required fields
    if (!reference) {
      throw new Error("Missing required field: reference");
    }

    console.log("📞 Calling Paystack API to verify payment...");

    // Call Paystack API to verify payment
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
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

    console.log("✅ Paystack Verification Response:", {
      status: paystackData.data?.status,
      amount: paystackData.data?.amount,
      reference: paystackData.data?.reference,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        status: paystackData.status,
        message: paystackData.message,
        data: paystackData.data
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Paystack Verify Error:", error);

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

