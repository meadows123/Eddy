<<<<<<< HEAD
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} 
=======
import Stripe from 'stripe'

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16', // Use the latest version
  httpClient: Stripe.createFetchHttpClient(),
}) 
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
