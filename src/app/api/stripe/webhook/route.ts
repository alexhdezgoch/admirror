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

        if (session.metadata?.type !== 'brand_subscription') {
          break;
        }

        const userId = session.metadata?.user_id;
        const brandId = session.metadata?.brand_id;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !brandId || !stripeSubscriptionId) {
          console.error('Missing metadata in checkout session:', { userId, brandId, stripeSubscriptionId });
          break;
        }

        // Create brand_subscriptions row
        const { error: insertError } = await getSupabaseAdmin()
          .from('brand_subscriptions')
          .upsert({
            brand_id: brandId,
            user_id: userId,
            stripe_subscription_id: stripeSubscriptionId,
            competitor_limit: 10,
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'brand_id' });

        if (insertError) {
          console.error('Error creating brand subscription:', insertError);
        } else {
          console.log(`Created brand subscription for brand ${brandId}, user ${userId}`);
        }

        // Also update the user's subscriptions record with the customer ID
        await getSupabaseAdmin()
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Update brand_subscriptions status
        const { error: updateError } = await getSupabaseAdmin()
          .from('brand_subscriptions')
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating brand subscription:', updateError);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Remove brand_subscriptions rows for this subscription
        const { error: deleteError } = await getSupabaseAdmin()
          .from('brand_subscriptions')
          .delete()
          .eq('stripe_subscription_id', subscription.id);

        if (deleteError) {
          console.error('Error deleting brand subscription:', deleteError);
        } else {
          console.log(`Deleted brand subscription for stripe subscription ${subscription.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await getSupabaseAdmin()
            .from('brand_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Marked brand subscription as past_due for subscription ${subscriptionId}`);
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
