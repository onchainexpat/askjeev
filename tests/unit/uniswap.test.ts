import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config before importing modules
vi.mock('../../src/config.js', () => ({
  UNISWAP_API_BASE: 'https://trade-api.gateway.uniswap.org/v1',
  UNISWAP_API_KEY: 'test-key',
  TOKENS: {
    ETH: '0x0000000000000000000000000000000000000000',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  PERMIT2_ADDRESS: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
  getWalletClient: () => ({
    signTypedData: vi.fn().mockResolvedValue('0xmocksignature'),
    sendTransaction: vi.fn().mockResolvedValue('0xmocktxhash'),
  }),
  getPublicClient: () => ({
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    readContract: vi.fn().mockResolvedValue(BigInt('1000000')),
  }),
}));

describe('Uniswap Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkApproval', () => {
    it('returns approvalNeeded=false when already approved', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ approval: null }),
      }) as any;

      const { checkApproval } = await import('../../src/modules/uniswap/client.js');
      const result = await checkApproval(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '1000000',
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.approvalNeeded).toBe(false);
      expect(result.tx).toBeUndefined();
    });

    it('returns approval tx when needed', async () => {
      const mockTx = { to: '0xpermit2', data: '0xapprove', value: '0' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ approval: mockTx }),
      }) as any;

      const { checkApproval } = await import('../../src/modules/uniswap/client.js');
      const result = await checkApproval(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '1000000',
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.approvalNeeded).toBe(true);
      expect(result.tx).toEqual(mockTx);
    });

    it('throws on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      }) as any;

      const { checkApproval } = await import('../../src/modules/uniswap/client.js');
      await expect(
        checkApproval('0xtoken', '1000', '0xwallet'),
      ).rejects.toThrow('check_approval failed (400)');
    });
  });

  describe('getQuote', () => {
    it('returns a CLASSIC quote', async () => {
      const mockQuote = {
        routing: 'CLASSIC',
        quote: {
          input: { token: '0xETH', amount: '1000000000000000000' },
          output: { token: '0xUSDC', amount: '2500000000' },
          gasFeeUSD: '0.01',
          priceImpact: 0.01,
        },
        permitData: {
          domain: { name: 'Permit2' },
          types: { PermitSingle: [] },
          values: { spender: '0xrouter' },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
      }) as any;

      const { getQuote } = await import('../../src/modules/uniswap/client.js');
      const result = await getQuote(
        '0x0000000000000000000000000000000000000000',
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '1000000000000000000',
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.routing).toBe('CLASSIC');
      expect(result.quote.output.amount).toBe('2500000000');
      expect(result.permitData).toBeDefined();
    });

    it('sends correct request body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ routing: 'CLASSIC', quote: {} }),
      }) as any;

      const { getQuote } = await import('../../src/modules/uniswap/client.js');
      await getQuote('0xIN', '0xOUT', '1000', '0xSWAPPER');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://trade-api.gateway.uniswap.org/v1/quote',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"tokenInChainId":"8453"'),
        }),
      );
    });
  });

  describe('getTokenBalance', () => {
    it('returns ETH balance for native token', async () => {
      const { getTokenBalance } = await import('../../src/modules/uniswap/client.js');
      const balance = await getTokenBalance(
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
      );
      expect(balance).toBe('1000000000000000000');
    });

    it('returns ERC20 balance for USDC', async () => {
      const { getTokenBalance } = await import('../../src/modules/uniswap/client.js');
      const balance = await getTokenBalance(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '0x1234567890123456789012345678901234567890',
      );
      expect(balance).toBe('1000000');
    });
  });
});
