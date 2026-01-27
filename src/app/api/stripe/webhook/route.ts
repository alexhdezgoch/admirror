import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Create Supabase admin client lazily to avoid build-time errors
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not configured');
    }
    supabaseAdminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdminInstance;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process competitor slot purchases
        if (session.metadata?.type !== 'competitor_slot') {
          break;
        }

        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('No user_id in checkout session metadata');
          break;
        }

        // Increment competitor_limit by 1
        const { data: subscription, error: fetchError } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('competitor_limit')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching subscription:', fetchError);
          break;
        }

        const currentLimit = subscription?.competitor_limit || 1;

        const { error: updateError } = await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            competitor_limit: currentLimit + 1,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log(`Incremented competitor limit for user ${userId} to ${currentLimit + 1}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: subRecord } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (subRecord) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: subscription.status,
              stripe_subscription_id: subscription.id,
              current_period_end: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subRecord.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: subRecord } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (subRecord) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subRecord.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: subRecord } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (subRecord) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subRecord.user_id);

          console.log(`Marked subscription as past_due for customer ${customerId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const customerId = charge.customer as string;

        if (!customerId) {
          console.error('No customer on refunded charge');
          break;
        }

        const { data: subRecord } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id, competitor_limit')
          .eq('stripe_customer_id', customerId)
          .single();

        if (subRecord && subRecord.competitor_limit > 1) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              competitor_limit: subRecord.competitor_limit - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subRecord.user_id);

          console.log(`Decremented competitor limit for customer ${customerId} to ${subRecord.competitor_limit - 1}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
