import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  UNISWAP_API_BASE: 'https://trade-api.gateway.uniswap.org/v1',
  UNISWAP_API_KEY: 'test-key',
  CHAINS: {
    base: { chain: {}, rpc: 'https://mainnet.base.org', chainId: '8453' },
    celo: { chain: {}, rpc: 'https://forno.celo.org', chainId: '42220' },
  },
  QUOTE_CHAINS: {
    ethereum: { chainId: 1, name: 'Ethereum' },
    base: { chainId: 8453, name: 'Base' },
    arbitrum: { chainId: 42161, name: 'Arbitrum' },
    polygon: { chainId: 137, name: 'Polygon' },
    optimism: { chainId: 10, name: 'Optimism' },
    celo: { chainId: 42220, name: 'Celo' },
    bnb: { chainId: 56, name: 'BNB Chain' },
    avalanche: { chainId: 43114, name: 'Avalanche' },
    blast: { chainId: 81457, name: 'Blast' },
    worldchain: { chainId: 480, name: 'World Chain' },
  },
  TOKENS: {
    base: { ETH: '0x0000000000000000000000000000000000000000', USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    celo: { CELO: '0x0000000000000000000000000000000000000000', cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a', USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' },
  },
  getAccount: () => ({ address: '0x1234567890123456789012345678901234567890' }),
  getPublicClient: () => ({
    getBalance: vi.fn().mockResolvedValue(BigInt('0')),
    readContract: vi.fn().mockResolvedValue(BigInt('0')),
  }),
}));

describe('Celo Cross-Chain Support', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getQuote with Celo chain', () => {
    it('sends correct chainId for Celo', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          routing: 'CLASSIC',
          quote: {
            input: { token: '0x0', amount: '1000000000000000000' },
            output: { token: '0xcUSD', amount: '80000000000000000' },
          },
        }),
      }) as any;

      const { getQuote } = await import('../../src/modules/uniswap/client.js');
      await getQuote('0x0' as any, '0xcUSD' as any, '1000000000000000000', '0xswapper' as any, 'celo');

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.tokenInChainId).toBe(42220);
      expect(body.tokenOutChainId).toBe(42220);
    });

    it('defaults to Base chain', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ routing: 'CLASSIC', quote: { input: {}, output: {} } }),
      }) as any;

      const { getQuote } = await import('../../src/modules/uniswap/client.js');
      await getQuote('0x0' as any, '0xUSDC' as any, '100', '0xswapper' as any);

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.tokenInChainId).toBe(8453);
    });
  });

  describe('getTokenBalance with Celo', () => {
    it('calls Celo RPC for native balance', async () => {
      const { getTokenBalance } = await import('../../src/modules/uniswap/client.js');
      const balance = await getTokenBalance(
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
        'celo',
      );
      expect(balance).toBe('0');
    });
  });
});

describe('Cross-chain service routes', () => {
  it('swap-quote accepts chain parameter', async () => {
    vi.mock('../../src/modules/identity/logger.js', () => ({ log: vi.fn() }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: {
          input: { token: '0x0', amount: '1000000000000000000' },
          output: { token: '0xcUSD', amount: '80000000000000000' },
          gasFeeUSD: '0.001',
          priceImpact: 0.01,
        },
      }),
    }) as any;

    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/api/swap-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        amount: '1000000000000000000',
        chain: 'celo',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routing).toBe('CLASSIC');
  });

  it('discovery shows cross-chain support', async () => {
    vi.mock('../../src/modules/identity/logger.js', () => ({ log: vi.fn() }));

    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/x402-discovery');
    const data = await res.json();

    expect(data.supportedChains).toContain('base (8453)');
    expect(data.supportedChains).toContain('celo (42220)');
    expect(data.supportedChains).toContain('ethereum (1)');
    expect(data.supportedChains).toHaveLength(10);
  });

  it('self-status endpoint works', async () => {
    vi.mock('../../src/modules/identity/logger.js', () => ({ log: vi.fn() }));

    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/api/self-status');
    const data = await res.json();

    expect(data.selfEnabled).toBeDefined();
    expect(data.verified).toBe(false);
  });
});
