import { vi } from 'vitest';

export function createMockStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_mock123' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'sub_mock123',
        metadata: { user_id: 'user-1' },
        items: { data: [] },
      }),
      update: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_mock123' }),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
  };
}
