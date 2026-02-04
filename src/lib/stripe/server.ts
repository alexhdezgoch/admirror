import Stripe from 'stripe';

// Create Stripe instance lazily to avoid build-time errors
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!stripeInstance) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
      }
      stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
      });
    }
    return stripeInstance[prop as keyof Stripe];
  },
});

export const BRAND_PRICE_ID = process.env.STRIPE_PRICE_ID;
