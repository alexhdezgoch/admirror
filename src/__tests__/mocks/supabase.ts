import { vi } from 'vitest';

export function createMockSupabaseClient(user: { id: string; email: string } | null = null) {
  const queryResult = { data: null, error: null };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(queryResult);
    chain.upsert = vi.fn().mockResolvedValue(queryResult);
    chain.update = vi.fn().mockReturnValue(chain);
    return chain;
  };

  const mockChain = chainable();

  const client = {
    from: vi.fn().mockReturnValue(mockChain),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
    _chain: mockChain,
    _setQueryResult(data: unknown, error: unknown = null) {
      mockChain.single = vi.fn().mockResolvedValue({ data, error });
    },
  };

  return client;
}

export function createMockSupabaseAdmin() {
  const queryResult = { data: null, error: null };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(queryResult);
    chain.upsert = vi.fn().mockResolvedValue(queryResult);
    chain.update = vi.fn().mockReturnValue(chain);
    return chain;
  };

  const mockChain = chainable();

  const admin = {
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
    _setUpsertError(error: unknown) {
      mockChain.upsert = vi.fn().mockResolvedValue({ error });
    },
    _setUpdateError(error: unknown) {
      const updateChain: Record<string, unknown> = {};
      updateChain.eq = vi.fn().mockResolvedValue({ error });
      mockChain.update = vi.fn().mockReturnValue(updateChain);
    },
  };

  return admin;
}
