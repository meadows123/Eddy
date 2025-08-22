import { loadStripe } from '@stripe/stripe-js';

// Always use test key for now to avoid live mode issues
const stripeKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.warn('⚠️ VITE_STRIPE_TEST_PUBLISHABLE_KEY is not set. Please add it to your .env file.');
}

export const stripePromise = loadStripe(stripeKey); 