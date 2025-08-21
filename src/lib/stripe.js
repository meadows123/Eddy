import { loadStripe } from '@stripe/stripe-js';

// Use test key by default in development
const stripeKey = import.meta.env.MODE === 'development' 
  ? import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY 
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = loadStripe(stripeKey); 