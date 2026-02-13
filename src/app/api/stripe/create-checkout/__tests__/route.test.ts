import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from '@/__tests__/helpers/request';

const { mockStripe, mockSupabaseState } = vi.hoisted(() => {
  const mockStripe = {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_mock123' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    webhooks: { constructEvent: vi.fn() },
    billingPortal: { sessions: { create: vi.fn() } },
  };

  const mockSupabaseState = {
    user: { id: 'user-1', email: 'test@example.com' } as { id: string; email: string } | null,
    queryData: null as unknown,
    brandPriceId: 'price_brand' as string | undefined,
  };

  return { mockStripe, mockSupabaseState };
});

vi.mock('@/lib/stripe/server', () => ({
  stripe: mockStripe,
  get BRAND_PRICE_ID() { return mockSupabaseState.brandPriceId; },
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
  mockSupabaseState.queryData = null;
  mockSupabaseState.brandPriceId = 'price_brand';
});

describe('create-checkout', () => {
  it('returns 401 when not authenticated', async () => {
    mockSupabaseState.user = null;
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when BRAND_PRICE_ID is not configured', async () => {
    mockSupabaseState.brandPriceId = undefined;
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('not configured');
  });

  it('returns 400 when brandId is missing', async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('brandId');
  });

  it('returns 400 when user already has active subscription', async () => {
    mockSupabaseState.queryData = {
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      status: 'active',
    };
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Active subscription exists');
  });

  it('creates Stripe customer when none exists', async () => {
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        metadata: { supabase_user_id: 'user-1' },
      }),
    );
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
  });

  it('reuses existing stripe_customer_id', async () => {
    mockSupabaseState.queryData = {
      stripe_customer_id: 'cus_existing',
      stripe_subscription_id: null,
      status: 'inactive',
    };
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });

  it('returns checkout session URL on success', async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_xyz',
    });
    const req = createMockRequest({ brandId: 'brand-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/session_xyz');
  });
});
