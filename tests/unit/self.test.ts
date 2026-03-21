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
    unichain: { chainId: 130, name: 'Unichain' },
    zksync: { chainId: 324, name: 'zkSync' },
    linea: { chainId: 59144, name: 'Linea' },
    zora: { chainId: 7777777, name: 'Zora' },
    monad: { chainId: 143, name: 'Monad' },
    xlayer: { chainId: 196, name: 'X Layer' },
    soneium: { chainId: 1868, name: 'Soneium' },
    tempo: { chainId: 4217, name: 'Tempo' },
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

vi.mock('@selfxyz/agent-sdk', () => ({
  SelfAgentVerifier: {
    create: () => ({
      network: vi.fn().mockReturnThis(),
      requireAge: vi.fn().mockReturnThis(),
      requireOFAC: vi.fn().mockReturnThis(),
      sybilLimit: vi.fn().mockReturnThis(),
      rateLimit: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({
        verify: vi.fn().mockResolvedValue({ valid: false, error: 'Mock: not verified' }),
      }),
    }),
  },
}));

describe('Self Agent ID Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('selfAgentAuth middleware (direct)', () => {
    it('passes through when SELF_ENABLED is false (no Self headers)', async () => {
      // When SELF_ENABLED is not set, the middleware is never mounted.
      // But the middleware itself also passes through when no headers are present
      // and required=false (default).
      const { selfAgentAuth } = await import('../../src/modules/self/middleware.js');
      const middleware = selfAgentAuth({ required: false });

      let nextCalled = false;
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as any;
      const mockNext = async () => { nextCalled = true; };

      await middleware(mockContext, mockNext);
      expect(nextCalled).toBe(true);
    });

    it('returns 401 when required=true and no Self headers', async () => {
      const { selfAgentAuth } = await import('../../src/modules/self/middleware.js');
      const middleware = selfAgentAuth({ required: true });

      let jsonResponse: any = null;
      let jsonStatus: number | undefined;
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
        json: vi.fn((body: any, status?: number) => {
          jsonResponse = body;
          jsonStatus = status;
          return new Response(JSON.stringify(body), { status });
        }),
      } as any;
      const mockNext = vi.fn();

      await middleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Self Agent ID verification required. Include x-self-agent-* headers.',
          docs: 'https://docs.self.xyz/agent-id',
        },
        401,
      );
    });

    it('passes through when required=false and no Self headers (x402 handles auth)', async () => {
      const { selfAgentAuth } = await import('../../src/modules/self/middleware.js');
      const middleware = selfAgentAuth({ network: 'mainnet', required: false });

      let nextCalled = false;
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as any;
      const mockNext = async () => { nextCalled = true; };

      await middleware(mockContext, mockNext);
      expect(nextCalled).toBe(true);
    });
  });

  describe('selfAgent context enrichment', () => {
    it('includes enriched fields (isProofFresh, daysUntilExpiry) on successful verification', async () => {
      const { selfAgentAuth } = await import('../../src/modules/self/middleware.js');
      const middleware = selfAgentAuth({ network: 'mainnet', required: false });

      // Mock verifier to return successful verification
      const mockSdk = await import('@selfxyz/agent-sdk');
      const mockVerify = vi.fn().mockResolvedValue({
        valid: true,
        agentAddress: '0xFC543091E36BBE048EfF59E90Af7C293962eB4d0',
        agentId: 42,
        agentCount: 1,
        isProofFresh: true,
        proofExpiresAt: '2027-03-20T00:00:00Z',
        daysUntilExpiry: 364,
      });
      (mockSdk.SelfAgentVerifier.create as any) = () => ({
        network: vi.fn().mockReturnThis(),
        sybilLimit: vi.fn().mockReturnThis(),
        rateLimit: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue({ verify: mockVerify }),
      });

      const contextStore: Record<string, any> = {};
      const mockContext = {
        req: {
          header: vi.fn((h: string) => {
            if (h === 'x-self-agent-signature') return 'test-sig';
            if (h === 'x-self-agent-timestamp') return '1700000000000';
            return undefined;
          }),
          text: vi.fn().mockResolvedValue(''),
          method: 'POST',
          url: 'http://localhost:3402/api/arbitrage',
        },
        set: vi.fn((k: string, v: any) => { contextStore[k] = v; }),
      } as any;

      let nextCalled = false;
      await middleware(mockContext, async () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(contextStore.selfAgent).toBeDefined();
      expect(contextStore.selfAgent.verified).toBe(true);
      expect(contextStore.selfAgent.isProofFresh).toBe(true);
      expect(contextStore.selfAgent.daysUntilExpiry).toBe(364);
    });
  });

  describe('self-verify endpoint via routes', () => {
    it('returns trust card structure from /api/self-verify', async () => {
      delete process.env.SELF_ENABLED;
      delete process.env.SELF_AGENT_PRIVATE_KEY;

      const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
      const app = await createRoutes();

      const res = await app.request('/api/self-verify');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('agent');
      expect(data).toHaveProperty('trust');
      expect(data.agent).toHaveProperty('isVerified');
      expect(data.agent).toHaveProperty('sybilLimit');
      expect(data.trust).toHaveProperty('x402Payment', true);
      expect(data.trust).toHaveProperty('erc8004Identity', true);
      expect(data.trust).toHaveProperty('proofChain', 'Celo mainnet');
      expect(data.trust).toHaveProperty('registryContract');
    });

    it('returns graceful response when SELF_AGENT_PRIVATE_KEY is not set', async () => {
      delete process.env.SELF_AGENT_PRIVATE_KEY;

      const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
      const app = await createRoutes();

      const res = await app.request('/api/self-verify');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.agent.isVerified).toBe(false);
    });
  });

  describe('agent-card endpoint via routes', () => {
    it('returns 503 when SELF_AGENT_PRIVATE_KEY is not set', async () => {
      delete process.env.SELF_AGENT_PRIVATE_KEY;

      const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
      const app = await createRoutes();

      const res = await app.request('/api/agent-card');
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toBe('SELF_AGENT_PRIVATE_KEY not configured');
      expect(data.card).toBeNull();
    });
  });

  describe('self-status endpoint via routes', () => {
    it('returns correct structure when Self is not verified', async () => {
      // Ensure SELF_ENABLED is not set so middleware is not mounted
      delete process.env.SELF_ENABLED;

      const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
      const app = await createRoutes();

      const res = await app.request('/api/self-status');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('selfEnabled');
      expect(data).toHaveProperty('verified');
      expect(data).toHaveProperty('agentAddress');
      expect(data).toHaveProperty('agentId');
      expect(data).toHaveProperty('message');
      expect(data.verified).toBe(false);
      expect(data.agentAddress).toBeNull();
      expect(data.agentId).toBeNull();
      expect(data.message).toBe(
        'Self Agent ID headers not provided or verification not enabled',
      );
    });

    it('shows selfEnabled=true when SELF_ENABLED env var is set', async () => {
      process.env.SELF_ENABLED = 'true';

      try {
        const { createRoutes } = await import('../../src/modules/x402-service/routes.js');
        const app = await createRoutes();

        const res = await app.request('/api/self-status');
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.selfEnabled).toBe(true);
      } finally {
        delete process.env.SELF_ENABLED;
      }
    });
  });
});
