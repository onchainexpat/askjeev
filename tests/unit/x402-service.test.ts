import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
  TOKENS: {
    ETH: '0x0000000000000000000000000000000000000000',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
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
    const app = createRoutes();

    const res = await app.request('/health');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.agent).toBe('AskJeev');
  });

  it('serves .well-known/x402 discovery', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = createRoutes('https://askjeev.example.com');

    const res = await app.request('/.well-known/x402');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.version).toBe(2);
    expect(data.agent).toBe('AskJeev');
    expect(data.endpoints).toHaveLength(3);
    expect(data.endpoints[0].path).toBe('/api/swap-quote');
    expect(data.endpoints[1].path).toBe('/api/private-analyze');
    expect(data.endpoints[2].path).toBe('/api/ask');
  });

  it('serves agent.json', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = createRoutes('https://askjeev.example.com');

    const res = await app.request('/agent.json');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('AskJeev');
    expect(data.type).toContain('eip-8004');
    expect(data.x402Support).toBe(true);
  });

  it('rejects swap-quote without required fields', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = createRoutes();

    const res = await app.request('/api/swap-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn: '0x123' }), // missing tokenOut and amount
    });

    expect(res.status).toBe(400);
  });

  it('rejects ask without prompt', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = createRoutes();

    const res = await app.request('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('rejects private-analyze without prompt', async () => {
    const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
    const app = createRoutes();

    const res = await app.request('/api/private-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});
