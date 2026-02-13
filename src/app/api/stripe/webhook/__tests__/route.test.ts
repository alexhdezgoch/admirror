import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRawBodyRequest } from '@/__tests__/helpers/request';

const { mockStripe, mockAdmin } = vi.hoisted(() => {
  const mockStripe = {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_mock123' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ id: 'sub_mock123', metadata: { user_id: 'user-1' }, items: { data: [] } }),
      update: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
    },
    webhooks: { constructEvent: vi.fn() },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }) } },
  };

  // Chainable mock for supabase admin
  const makeChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.update = vi.fn().mockReturnValue(chain);
    return chain;
  };
  const _chain = makeChain();
  const mockAdmin = {
    from: vi.fn().mockReturnValue(_chain),
    _chain,
  };

  return { mockStripe, mockAdmin };
});

vi.mock('@/lib/stripe/server', () => ({
  stripe: mockStripe,
  BRAND_PRICE_ID: 'price_brand',
  COMPETITOR_PRICE_ID: 'price_competitor',
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockAdmin,
}));

import { POST } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  // Re-wire chain after clearAllMocks
  mockAdmin._chain.select.mockReturnValue(mockAdmin._chain);
  mockAdmin._chain.eq.mockReturnValue(mockAdmin._chain);
  mockAdmin._chain.update.mockReturnValue(mockAdmin._chain);
  mockAdmin._chain.single.mockResolvedValue({ data: null, error: null });
  mockAdmin._chain.upsert.mockResolvedValue({ data: null, error: null });
  mockAdmin.from.mockReturnValue(mockAdmin._chain);
});

// --- Signature verification ---

describe('signature verification', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = createRawBodyRequest('{}', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing stripe-signature header' });
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_test' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Webhook secret not configured' });
  });

  it('returns 400 when constructEvent throws', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_bad' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid signature');
  });
});

// --- checkout.session.completed ---

describe('checkout.session.completed', () => {
  function makeCheckoutEvent(metadata: Record<string, string>, subscription: string | null = 'sub_123') {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: { metadata, subscription, customer: 'cus_123' },
      },
    });
  }

  it('upserts subscription: status=active, brand_quantity=1, competitor_quantity=0', async () => {
    makeCheckoutEvent({ type: 'initial_subscription', user_id: 'user-1' });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith('subscriptions');
    expect(mockAdmin._chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        status: 'active',
        brand_quantity: 1,
        competitor_quantity: 0,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('skips when metadata.type != initial_subscription', async () => {
    makeCheckoutEvent({ type: 'something_else', user_id: 'user-1' });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.upsert).not.toHaveBeenCalled();
  });

  it('skips when user_id or subscription ID is missing', async () => {
    makeCheckoutEvent({ type: 'initial_subscription' }, null);
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.upsert).not.toHaveBeenCalled();
  });

  it('returns 200 even if supabase upsert fails', async () => {
    makeCheckoutEvent({ type: 'initial_subscription', user_id: 'user-1' });
    mockAdmin._chain.upsert.mockResolvedValue({ error: { message: 'DB error' } });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});

// --- customer.subscription.updated ---

describe('customer.subscription.updated', () => {
  function makeUpdateEvent(metadata: Record<string, string>, items: Array<{ price: { id: string }; quantity: number }>, periodEnd = 1700000000) {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          metadata,
          status: 'active',
          items: { data: items },
          current_period_end: periodEnd,
        },
      },
    });
  }

  it('syncs brand/competitor quantities from Stripe items', async () => {
    makeUpdateEvent(
      { user_id: 'user-1' },
      [
        { price: { id: 'price_brand' }, quantity: 3 },
        { price: { id: 'price_competitor' }, quantity: 2 },
      ],
    );
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        brand_quantity: 3,
        competitor_quantity: 2,
        status: 'active',
      }),
    );
  });

  it('sets current_period_end from subscription', async () => {
    const ts = 1700000000;
    makeUpdateEvent({ user_id: 'user-1' }, [], ts);
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    await POST(req);

    expect(mockAdmin._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_end: new Date(ts * 1000).toISOString(),
      }),
    );
  });

  it('skips when user_id missing from metadata', async () => {
    makeUpdateEvent({}, []);
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.update).not.toHaveBeenCalled();
  });
});

// --- customer.subscription.deleted ---

describe('customer.subscription.deleted', () => {
  function makeDeleteEvent(metadata: Record<string, string>) {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { metadata } },
    });
  }

  it('sets canceled, zeroes quantities, nulls stripe_subscription_id', async () => {
    makeDeleteEvent({ user_id: 'user-1' });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'canceled',
        brand_quantity: 0,
        competitor_quantity: 0,
        stripe_subscription_id: null,
      }),
    );
  });

  it('skips when user_id missing', async () => {
    makeDeleteEvent({});
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockAdmin._chain.update).not.toHaveBeenCalled();
  });
});

// --- invoice.payment_failed ---

describe('invoice.payment_failed', () => {
  it('retrieves subscription, sets status=past_due', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_123' } },
    });
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      metadata: { user_id: 'user-1' },
    });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    expect(mockAdmin._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' }),
    );
  });

  it('skips when invoice has no subscription ID', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: { subscription: null } },
    });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
});

// --- unhandled events ---

describe('unhandled events', () => {
  it('returns 200 for unknown event types', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'some.unknown.event',
      data: { object: {} },
    });
    const req = createRawBodyRequest('{}', { 'stripe-signature': 'sig_ok' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});
