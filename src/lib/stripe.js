<<<<<<< HEAD
import { loadStripe } from '@stripe/stripe-js';

// Always use test key for now to avoid live mode issues
const stripeKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.warn('⚠️ VITE_STRIPE_TEST_PUBLISHABLE_KEY is not set. Please add it to your .env file.');
}

export const stripePromise = loadStripe(stripeKey); 
=======
import { loadStripe } from '@stripe/stripe-js';

// Prioritize environment variables for Stripe publishable key (required)
const envTestKey = (import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '').trim();
const envLiveKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
const stripeKey = envTestKey || envLiveKey;

// Only load Stripe if we have a valid key
const isValidStripeKey = stripeKey && typeof stripeKey === 'string' && stripeKey.trim().length > 0;

// Detect if we're using a live key (starts with pk_live_) or test key (starts with pk_test_)
const isLiveKey = isValidStripeKey && stripeKey.trim().startsWith('pk_live_');
const isTestKey = isValidStripeKey && stripeKey.trim().startsWith('pk_test_');

if (isLiveKey) {
  console.warn('⚠️ WARNING: Frontend is using a LIVE Stripe publishable key! This will charge real money. Make sure this is intentional.');
  console.warn('⚠️ For testing, use a TEST key that starts with pk_test_');
}

if (!envTestKey && !envLiveKey) {
  console.warn('⚠️ Stripe publishable key is not set. Please add VITE_STRIPE_TEST_PUBLISHABLE_KEY (or VITE_STRIPE_PUBLISHABLE_KEY) to your .env file.');
}

export const stripePromise = isValidStripeKey ? loadStripe(stripeKey) : null;
export const isStripeLiveMode = isLiveKey; 
>>>>>>> 8e47d4d1fc2c487c708c02ab1035619c9d6440f5
