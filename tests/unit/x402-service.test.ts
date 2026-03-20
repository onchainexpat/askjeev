import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
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
    celo: { CELO: '0x0000000000000000000000000000000000000000', USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' },
  },
  UNISWAP_API_BASE: 'https://trade-api.gateway.uniswap.org/v1',
  UNISWAP_API_KEY: 'test',
  VENICE_API_BASE: 'https://api.venice.ai/api/v1',
  VENICE_API_KEY: 'test',
  BANKR_LLM_BASE: 'https://llm.bankr.bot',
  BANKR_API_KEY: 'test',
}));

// Mock the logger to avoid file writes during tests
vi.mock('../../src/modules/identity/logger.js', () => ({
  log: vi.fn(),
}));

describe('x402 Service Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('serves health check', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/health');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.agent).toBe('AskJeev');
  });

  it('serves .well-known/x402 discovery', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes('https://askjeev.example.com');

    const res = await app.request('/.well-known/x402');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.version).toBe(2);
    expect(data.agent).toBe('AskJeev');
    expect(data.endpoints).toHaveLength(10);
    expect(data.endpoints[0].path).toBe('/api/swap-quote');
    expect(data.endpoints[1].path).toBe('/api/balances');
    expect(data.endpoints[2].path).toBe('/api/private-analyze');
    expect(data.endpoints[3].path).toBe('/api/ask');
    expect(data.endpoints[4].path).toBe('/api/discover');
    expect(data.endpoints[5].path).toBe('/api/arbitrage');
    expect(data.endpoints[6].path).toBe('/api/rebalance');
    expect(data.endpoints[7].path).toBe('/api/generate-image');
    expect(data.endpoints[8].path).toBe('/api/limit-order');
    expect(data.endpoints[9].path).toBe('/api/bridge');
  });

  it('serves agent.json', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes('https://askjeev.example.com');

    const res = await app.request('/agent.json');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('AskJeev');
    expect(data.type).toContain('eip-8004');
    expect(data.x402Support).toBe(true);
  });

  it('rejects swap-quote without required fields', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/api/swap-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn: '0x123' }), // missing tokenOut and amount
    });

    expect(res.status).toBe(400);
  });

  it('rejects ask without prompt', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('rejects private-analyze without prompt', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = await createRoutes();

    const res = await app.request('/api/private-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});
