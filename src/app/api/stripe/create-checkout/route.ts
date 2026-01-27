import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, BRAND_PRICE_ID } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BRAND_PRICE_ID) {
      return NextResponse.json(
        { error: 'Stripe price not configured' },
        { status: 500 }
      );
    }

    // Get brandId and brandName from request body
    const body = await request.json().catch(() => ({}));
    const { brandId, brandName, returnUrl: rawReturnUrl } = body;

    if (!brandId || !brandName) {
      return NextResponse.json(
        { error: 'brandId and brandName are required' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription record with customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          status: 'inactive',
          competitor_limit: 1,
        }, { onConflict: 'user_id' });
    }

    const baseUrl = rawReturnUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session for brand subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: BRAND_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}?checkout=success&brandId=${brandId}`,
      cancel_url: `${baseUrl}?checkout=canceled&brandId=${brandId}`,
      metadata: {
        user_id: user.id,
        brand_id: brandId,
        brand_name: brandName,
        type: 'brand_subscription',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          brand_id: brandId,
          brand_name: brandName,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
