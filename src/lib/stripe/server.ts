import Stripe from 'stripe';

// Create Stripe instance lazily to avoid build-time errors
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
      }
      // Debug: log key format (first 10 chars only for security)
      console.log('[Stripe] Key prefix:', key.substring(0, 10), 'length:', key.length);
      stripeInstance = new Stripe(key.trim(), {
        typescript: true,
      });
    }
    return stripeInstance[prop as keyof Stripe];
  },
});

export const BRAND_PRICE_ID = process.env.STRIPE_PRICE_ID;
