import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from '@/__tests__/helpers/request';

const { mockStripe, mockSupabaseState } = vi.hoisted(() => {
  const mockStripe = {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
    billingPortal: {
      sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }) },
    },
  };

  const mockSupabaseState = {
    user: { id: 'user-1', email: 'test@example.com' } as { id: string; email: string } | null,
    queryData: { stripe_customer_id: 'cus_123' } as unknown,
  };

  return { mockStripe, mockSupabaseState };
});

vi.mock('@/lib/stripe/server', () => ({
  stripe: mockStripe,
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
  mockSupabaseState.queryData = { stripe_customer_id: 'cus_123' };
});

describe('portal', () => {
  it('returns 401 when not authenticated', async () => {
    mockSupabaseState.user = null;
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when no stripe_customer_id exists', async () => {
    mockSupabaseState.queryData = null;
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No billing account');
  });

  it('creates billing portal session and returns URL', async () => {
    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/portal_xyz',
    });
    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://billing.stripe.com/portal_xyz');
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_123' }),
    );
  });
});
