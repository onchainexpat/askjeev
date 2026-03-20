import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
  CHAINS: {
    base: { chain: {}, rpc: 'https://mainnet.base.org', chainId: '8453' },
    celo: { chain: {}, rpc: 'https://forno.celo.org', chainId: '42220' },
  },
  TOKENS: {
    base: { ETH: '0x0000000000000000000000000000000000000000', USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    celo: { CELO: '0x0000000000000000000000000000000000000000', USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' },
  },
  UNISWAP_API_BASE: 'https://trade-api.gateway.uniswap.org/v1',
  UNISWAP_API_KEY: 'test',
  VENICE_API_BASE: 'https://api.venice.ai/api/v1',
  VENICE_API_KEY: 'test',
  BANKR_LLM_BASE: 'https://llm.bankr.bot',
  BANKR_API_KEY: 'test',
}));

vi.mock('../../src/modules/identity/logger.js', () => ({
  log: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Discovery Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('queryX402Scan returns curated results when x402scan.com is down', async () => {
    const { queryX402Scan } = await import('../../src/modules/discovery/client.js');

    // Simulate x402scan.com being unavailable
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await queryX402Scan('swap');
    expect(results.length).toBeGreaterThan(0);
    // AskJeev should be in curated list and match "swap"
    expect(results.some(r => r.name === 'AskJeev')).toBe(true);
  });

  it('queryX402Scan curated list has substantial coverage', async () => {
    const { queryX402Scan } = await import('../../src/modules/discovery/client.js');

    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    // Empty query returns nothing (filter requires match)
    // Use a broad term to see total coverage
    const results = await queryX402Scan('a');
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it('queryX402Scan parses x402scan.com response', async () => {
    const { queryX402Scan } = await import('../../src/modules/discovery/client.js');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        services: [
          { domain: 'example.com', name: 'TestService', description: 'A test service', chains: ['base'] },
        ],
      }),
    });

    const results = await queryX402Scan('test');
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe('example.com');
    expect(results[0].name).toBe('TestService');
  });

  it('fetchX402Manifest fetches .well-known/x402', async () => {
    const { fetchX402Manifest } = await import('../../src/modules/discovery/client.js');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        version: 2,
        agent: 'TestAgent',
        description: 'A test agent',
        endpoints: [
          { path: '/api/test', method: 'POST', price: '$0.01', description: 'Test endpoint' },
        ],
        supportedChains: ['base'],
      }),
    });

    const manifest = await fetchX402Manifest('example.com');
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('TestAgent');
    expect(manifest!.endpoints).toHaveLength(1);
    expect(manifest!.endpoints[0].price).toBe('$0.01');
  });

  it('fetchX402Manifest tries /x402-discovery as fallback', async () => {
    const { fetchX402Manifest } = await import('../../src/modules/discovery/client.js');

    // First call (.well-known/x402) fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // Second call (/x402-discovery) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        agent: 'FallbackAgent',
        endpoints: [{ path: '/api/data', method: 'GET', price: 'free' }],
      }),
    });

    const manifest = await fetchX402Manifest('example.com');
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('FallbackAgent');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fetchX402Manifest returns null when both paths fail', async () => {
    const { fetchX402Manifest } = await import('../../src/modules/discovery/client.js');

    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const manifest = await fetchX402Manifest('nonexistent.com');
    expect(manifest).toBeNull();
  });
});

describe('Discovery Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('discoverServices returns results from curated directory', async () => {
    const { discoverServices } = await import('../../src/modules/discovery/service.js');

    // x402scan query fails → curated fallback
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    // All manifest fetches and Venice call return generic responses
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          agent: 'GenericService',
          endpoints: [{ path: '/api/test', method: 'POST', price: '$0.01' }],
          // Also serves as valid Venice response (Venice ranking will parse this as non-JSON-array and fall back)
          choices: [{ message: { content: 'not a json array' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
        }),
      }),
    );

    const result = await discoverServices({ query: 'analysis' });

    expect(result.services.length).toBeGreaterThan(0);
    expect(result.query).toBe('analysis');
    expect(result.rankedBy).toBe('venice-ai');
  });

  it('discoverServices handles complete failure gracefully', async () => {
    const { discoverServices } = await import('../../src/modules/discovery/service.js');

    // Everything fails
    mockFetch.mockRejectedValue(new Error('network down'));

    const result = await discoverServices({ query: 'anything' });

    // Should still return results from curated list (if query matches)
    // but all services will have stub data (manifest fetch failed)
    expect(result.query).toBe('anything');
    expect(result.rankedBy).toBe('venice-ai');
  });
});
