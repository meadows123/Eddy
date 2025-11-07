import Stripe from 'stripe'

// Prioritize test key for testing - prefer STRIPE_TEST_SECRET_KEY if available and non-empty
const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY')?.trim() ?? ''
const liveKey = Deno.env.get('STRIPE_SECRET_KEY')?.trim() ?? ''
const stripeSecretKey = (testKey && testKey.length > 0) ? testKey : liveKey

// Log which key is being used (without exposing the actual key)
const keySource = (testKey && testKey.length > 0) ? 'STRIPE_TEST_SECRET_KEY' : (liveKey && liveKey.length > 0 ? 'STRIPE_SECRET_KEY' : 'NONE')
const keyPrefix = stripeSecretKey.length > 0 ? stripeSecretKey.substring(0, 7) : 'NONE'
console.log(`🔑 Stripe key source: ${keySource}, prefix: ${keyPrefix}`)
console.log(`🔍 STRIPE_TEST_SECRET_KEY exists: ${Deno.env.get('STRIPE_TEST_SECRET_KEY') !== undefined}, length: ${testKey.length}`)
console.log(`🔍 STRIPE_SECRET_KEY exists: ${Deno.env.get('STRIPE_SECRET_KEY') !== undefined}, length: ${liveKey.length}`)

// Detect if we're using a live key (starts with sk_live_)
const isLiveKey = stripeSecretKey.startsWith('sk_live_')
const isTestKey = stripeSecretKey.startsWith('sk_test_')

if (isLiveKey) {
  console.warn('⚠️ WARNING: Edge Function is using a LIVE Stripe secret key! This will charge real money.')
  console.warn('⚠️ For testing, set STRIPE_TEST_SECRET_KEY to a TEST key (starts with sk_test_) in Supabase Edge Function environment variables.')
  console.warn('⚠️ Or update STRIPE_SECRET_KEY to a TEST key (starts with sk_test_)')
}

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY is not set in Edge Function environment variables!')
} else if (isTestKey) {
  console.log('✅ Using TEST Stripe secret key for testing')
} else if (!isLiveKey && !isTestKey && stripeSecretKey.length > 0) {
  console.warn('⚠️ Stripe key format unrecognized - should start with sk_test_ or sk_live_')
  console.warn(`⚠️ Current key prefix: ${keyPrefix}`)
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Use the latest version
  httpClient: Stripe.createFetchHttpClient(),
}) 