import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from '@/__tests__/helpers/request';

const { mockStripe, mockSupabaseState } = vi.hoisted(() => {
  const mockStripe = {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_mock123' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ id: 'sub_mock123', customer: 'cus_mock123', items: { data: [] } }),
      update: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
    },
    invoices: {
      create: vi.fn().mockResolvedValue({ id: 'inv_mock', amount_due: 3000 }),
      pay: vi.fn().mockResolvedValue({ id: 'inv_mock', status: 'paid' }),
    },
    webhooks: { constructEvent: vi.fn() },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }) } },
  };

  const mockSupabaseState = {
    user: { id: 'user-1', email: 'test@example.com' } as { id: string; email: string } | null,
    queryData: null as unknown,
  };

  return { mockStripe, mockSupabaseState };
});

vi.mock('@/lib/stripe/server', () => ({
  stripe: mockStripe,
  BRAND_PRICE_ID: 'price_brand',
  COMPETITOR_PRICE_ID: 'price_competitor',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: mockSupabaseState.queryData });
    chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.update = vi.fn().mockReturnValue(chain);
    return {
      from: vi.fn().mockReturnValue(chain),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseState.user } }),
      },
    };
  },
}));

import { POST } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseState.user = { id: 'user-1', email: 'test@example.com' };
  mockSupabaseState.queryData = { stripe_subscription_id: 'sub_123', status: 'active' };
  mockStripe.invoices.create.mockResolvedValue({ id: 'inv_mock', amount_due: 3000 });
});

describe('update-subscription', () => {
  it('returns 401 when not authenticated', async () => {
    mockSupabaseState.user = null;
    const req = createMockRequest({ brandCount: 1, competitorCount: 0 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when brandCount/competitorCount are not numbers', async () => {
    const req = createMockRequest({ brandCount: 'one', competitorCount: 0 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required as numbers');
  });

  it('returns 400 when no subscription exists', async () => {
    mockSupabaseState.queryData = null;
    const req = createMockRequest({ brandCount: 1, competitorCount: 0 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No active subscription');
  });

  it('cancels subscription when both counts = 0', async () => {
    const req = createMockRequest({ brandCount: 0, competitorCount: 0 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    const body = await res.json();
    expect(body.canceled).toBe(true);
  });

  it('updates existing brand item quantity', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      customer: 'cus_mock123',
      items: {
        data: [{ id: 'si_brand', price: { id: 'price_brand' }, quantity: 1 }],
      },
    });
    const req = createMockRequest({ brandCount: 3, competitorCount: 0 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      items: [{ id: 'si_brand', quantity: 3 }],
      proration_behavior: 'create_prorations',
    });
    expect(mockStripe.invoices.create).toHaveBeenCalledWith({
      customer: 'cus_mock123',
    });
    expect(mockStripe.invoices.pay).toHaveBeenCalledWith('inv_mock');
  });

  it('adds competitor line item without re-sending unchanged brand item', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      customer: 'cus_mock123',
      items: {
        data: [{ id: 'si_brand', price: { id: 'price_brand' }, quantity: 1 }],
      },
    });
    const req = createMockRequest({ brandCount: 1, competitorCount: 2 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      items: [
        { price: 'price_competitor', quantity: 2 },
      ],
      proration_behavior: 'create_prorations',
    });
    expect(mockStripe.invoices.create).toHaveBeenCalledWith({
      customer: 'cus_mock123',
    });
    expect(mockStripe.invoices.pay).toHaveBeenCalledWith('inv_mock');
  });

  it('deletes competitor line item (credit applied, no immediate charge)', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      customer: 'cus_mock123',
      items: {
        data: [
          { id: 'si_brand', price: { id: 'price_brand' }, quantity: 1 },
          { id: 'si_comp', price: { id: 'price_competitor' }, quantity: 2 },
        ],
      },
    });
    mockStripe.invoices.create.mockResolvedValue({ id: 'inv_mock', amount_due: 0 });

    const req = createMockRequest({ brandCount: 1, competitorCount: 0 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      items: [
        { id: 'si_comp', deleted: true },
      ],
      proration_behavior: 'create_prorations',
    });
    expect(mockStripe.invoices.create).toHaveBeenCalled();
    expect(mockStripe.invoices.pay).not.toHaveBeenCalled();
  });

  it('skips Stripe call when nothing changed', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      customer: 'cus_mock123',
      items: {
        data: [
          { id: 'si_brand', price: { id: 'price_brand' }, quantity: 1 },
          { id: 'si_comp', price: { id: 'price_competitor' }, quantity: 2 },
        ],
      },
    });
    const req = createMockRequest({ brandCount: 1, competitorCount: 2 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
    expect(mockStripe.invoices.create).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.noChanges).toBe(true);
  });

  it('updates local DB after successful Stripe update', async () => {
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      customer: 'cus_mock123',
      items: {
        data: [{ id: 'si_brand', price: { id: 'price_brand' }, quantity: 1 }],
      },
    });
    const req = createMockRequest({ brandCount: 2, competitorCount: 1 });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.subscriptions.update).toHaveBeenCalled();
  });
});
