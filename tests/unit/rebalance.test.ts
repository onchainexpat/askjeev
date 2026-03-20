import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
  getWalletClient: () => ({
    sendTransaction: vi.fn().mockResolvedValue('0xapproval_hash'),
  }),
  CHAINS: {
    base: { chain: {}, rpc: 'https://mainnet.base.org', chainId: '8453' },
    celo: { chain: {}, rpc: 'https://forno.celo.org', chainId: '42220' },
  },
  TOKENS: {
    base: {
      ETH: '0x0000000000000000000000000000000000000000',
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    celo: {
      CELO: '0x0000000000000000000000000000000000000000',
      USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
      cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    },
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

// Mock getPublicClient for getTokenBalance calls
vi.mock('../../src/modules/uniswap/client.js', () => ({
  getTokenBalance: vi.fn().mockImplementation((token: string) => {
    // Return different balances based on token
    if (token === '0x0000000000000000000000000000000000000000') {
      return Promise.resolve('500000000000000000'); // 0.5 ETH or CELO
    }
    if (token === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
      return Promise.resolve('1000000000'); // 1000 USDC on Base
    }
    if (token === '0x765DE816845861e75A25fCA122bb6898B8B1282a') {
      return Promise.resolve('500000000000000000000'); // 500 cUSD
    }
    if (token === '0xcebA9300f2b948710d2653dD7B07f33A8B32118C') {
      return Promise.resolve('200000000'); // 200 USDC on Celo
    }
    return Promise.resolve('0');
  }),
  getQuote: vi.fn(),
  executeSwap: vi.fn(),
  checkApproval: vi.fn(),
}));

describe('Rebalance Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentAllocations returns portfolio with USD values', async () => {
    const { getCurrentAllocations } = await import('../../src/modules/rebalance/client.js');

    const portfolio = await getCurrentAllocations();

    expect(portfolio.wallet).toBe('0x1234567890123456789012345678901234567890');
    expect(portfolio.allocations.length).toBe(5); // ETH, USDC(Base), CELO, cUSD, USDC(Celo)
    expect(portfolio.totalValueUSD).toBeGreaterThan(0);

    // Check that percentages sum to ~100%
    const totalPercent = portfolio.allocations.reduce((sum, a) => sum + a.percentOfTotal, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
  });

  it('getCurrentAllocations includes correct symbols', async () => {
    const { getCurrentAllocations } = await import('../../src/modules/rebalance/client.js');

    const portfolio = await getCurrentAllocations();
    const symbols = portfolio.allocations.map(a => a.symbol);

    expect(symbols).toContain('ETH');
    expect(symbols).toContain('USDC (Base)');
    expect(symbols).toContain('CELO');
    expect(symbols).toContain('cUSD');
    expect(symbols).toContain('USDC (Celo)');
  });

  it('computeRebalanceSwaps generates correct swaps', async () => {
    const { computeRebalanceSwaps } = await import('../../src/modules/rebalance/client.js');

    const allocations = [
      { symbol: 'ETH', token: '0x00' as any, chain: 'base' as const, balance: '0', balanceFormatted: '0.5', decimals: 18, valueUSD: 1050, percentOfTotal: 60 },
      { symbol: 'USDC (Base)', token: '0x01' as any, chain: 'base' as const, balance: '0', balanceFormatted: '700', decimals: 6, valueUSD: 700, percentOfTotal: 40 },
    ];

    const targets = [
      { symbol: 'ETH', targetPercent: 40 },
      { symbol: 'USDC (Base)', targetPercent: 60 },
    ];

    const swaps = computeRebalanceSwaps(allocations, targets, 1750);

    expect(swaps.length).toBe(1);
    expect(swaps[0].from).toBe('ETH');
    expect(swaps[0].to).toBe('USDC (Base)');
    expect(swaps[0].amountUSD).toBeGreaterThan(0);
    expect(swaps[0].reason).toContain('ETH');
  });

  it('computeRebalanceSwaps returns empty array when balanced', async () => {
    const { computeRebalanceSwaps } = await import('../../src/modules/rebalance/client.js');

    const allocations = [
      { symbol: 'ETH', token: '0x00' as any, chain: 'base' as const, balance: '0', balanceFormatted: '0.5', decimals: 18, valueUSD: 500, percentOfTotal: 50 },
      { symbol: 'USDC (Base)', token: '0x01' as any, chain: 'base' as const, balance: '0', balanceFormatted: '500', decimals: 6, valueUSD: 500, percentOfTotal: 50 },
    ];

    const targets = [
      { symbol: 'ETH', targetPercent: 50 },
      { symbol: 'USDC (Base)', targetPercent: 50 },
    ];

    const swaps = computeRebalanceSwaps(allocations, targets, 1000);
    expect(swaps.length).toBe(0);
  });

  it('computeRebalanceSwaps handles zero total USD', async () => {
    const { computeRebalanceSwaps } = await import('../../src/modules/rebalance/client.js');

    const swaps = computeRebalanceSwaps([], [{ symbol: 'ETH', targetPercent: 100 }], 0);
    expect(swaps.length).toBe(0);
  });
});

describe('Rebalance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rebalancePortfolio returns plan in dryRun mode', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Mock Venice analysis
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: { content: 'The portfolio is heavily weighted toward stablecoins. The rebalance plan looks reasonable.' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
    });

    const { rebalancePortfolio } = await import('../../src/modules/rebalance/service.js');

    const result = await rebalancePortfolio({
      targets: [
        { symbol: 'ETH', targetPercent: 50 },
        { symbol: 'USDC (Base)', targetPercent: 50 },
      ],
      dryRun: true,
    });

    expect(result.executed).toBe(false);
    expect(result.transactions).toHaveLength(0);
    expect(result.portfolio).toBeDefined();
    expect(result.portfolio.totalValueUSD).toBeGreaterThan(0);
    expect(result.analysis).toBeTruthy();
  });
});
