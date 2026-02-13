import { NextRequest, NextResponse } from 'next/server';
import { stripe, BRAND_PRICE_ID, COMPETITOR_PRICE_ID } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import Stripe from 'stripe';

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

        if (session.metadata?.type !== 'initial_subscription') {
          break;
        }

        const userId = session.metadata?.user_id;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !stripeSubscriptionId) {
          console.error('Missing metadata in checkout session:', { userId, stripeSubscriptionId });
          break;
        }

        // Create/update subscription record with initial brand quantity
        const { error: upsertError } = await getSupabaseAdmin()
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSubscriptionId,
            status: 'active',
            brand_quantity: 1,
            competitor_quantity: 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Error creating subscription record:', upsertError);
        } else {
          console.log(`Created subscription for user ${userId}`);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata');
          break;
        }

        // Extract quantities from Stripe subscription items
        let brandQty = 0;
        let competitorQty = 0;

        for (const item of subscription.items.data) {
          if (item.price.id === BRAND_PRICE_ID) {
            brandQty = item.quantity || 0;
          } else if (item.price.id === COMPETITOR_PRICE_ID) {
            competitorQty = item.quantity || 0;
          }
        }

        const periodEnd = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();

        const { error: updateError } = await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            status: subscription.status,
            brand_quantity: brandQty,
            competitor_quantity: competitorQty,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log(`Updated subscription for user ${userId}: ${brandQty} brands, ${competitorQty} competitors`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata');
          break;
        }

        const { error: deleteError } = await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            status: 'canceled',
            brand_quantity: 0,
            competitor_quantity: 0,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error updating canceled subscription:', deleteError);
        } else {
          console.log(`Canceled subscription for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Look up the subscription to get user_id from metadata
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = stripeSubscription.metadata?.user_id;

          if (userId) {
            await getSupabaseAdmin()
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            console.log(`Marked subscription as past_due for user ${userId}`);
          }
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
