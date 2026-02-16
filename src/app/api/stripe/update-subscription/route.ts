import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, BRAND_PRICE_ID, COMPETITOR_PRICE_ID, FREE_ACCOUNTS } from '@/lib/stripe/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandCount, competitorCount } = body;

    if (typeof brandCount !== 'number' || typeof competitorCount !== 'number') {
      return NextResponse.json(
        { error: 'brandCount and competitorCount are required as numbers' },
        { status: 400 }
      );
    }

    // Free accounts skip Stripe entirely
    if (FREE_ACCOUNTS.has(user.email || '')) {
      return NextResponse.json({ success: true });
    }

    // Get user's subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // If both counts are 0, cancel the subscription
    if (brandCount === 0 && competitorCount === 0) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          brand_quantity: 0,
          competitor_quantity: 0,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return NextResponse.json({ success: true, canceled: true });
    }

    // Retrieve the current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Find existing items by price ID
    const brandItem = stripeSubscription.items.data.find(
      (item: Stripe.SubscriptionItem) => item.price.id === BRAND_PRICE_ID
    );
    const competitorItem = stripeSubscription.items.data.find(
      (item: Stripe.SubscriptionItem) => item.price.id === COMPETITOR_PRICE_ID
    );

    // Build items array — only include items that are actually changing
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    // Brand item: only include if quantity changed or it's new
    if (brandItem) {
      if (brandItem.quantity !== brandCount) {
        items.push({ id: brandItem.id, quantity: brandCount });
      }
    } else if (brandCount > 0) {
      items.push({ price: BRAND_PRICE_ID, quantity: brandCount });
    }

    // Competitor item: only include if quantity changed, new, or being removed
    if (competitorItem) {
      if (competitorCount === 0) {
        items.push({ id: competitorItem.id, deleted: true });
      } else if (competitorItem.quantity !== competitorCount) {
        items.push({ id: competitorItem.id, quantity: competitorCount });
      }
    } else if (competitorCount > 0) {
      items.push({ price: COMPETITOR_PRICE_ID, quantity: competitorCount });
    }

    // Skip Stripe call if nothing actually changed
    if (items.length === 0) {
      return NextResponse.json({ success: true, noChanges: true });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations',
    });

    // Immediately invoice pending proration items so the customer is charged now.
    // Don't pass `subscription` — that causes Stripe to bill the full subscription
    // recurring amount, not just the pending proration items.
    const invoice = await stripe.invoices.create({
      customer: stripeSubscription.customer as string,
    });

    if (invoice.amount_due > 0) {
      await stripe.invoices.pay(invoice.id);
    }

    // Update local DB
    await supabase
      .from('subscriptions')
      .update({
        brand_quantity: brandCount,
        competitor_quantity: competitorCount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
