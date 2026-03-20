import { describe, it, expect, vi, beforeEach } from 'vitest';

const MOCK_QUOTE_CHAINS = {
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
};

const MOCK_QUOTE_TOKENS = {
  ethereum: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  },
  base: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  arbitrum: {
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  },
  polygon: {
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
  },
  optimism: {
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  celo: {
    USDC: { address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', decimals: 6 },
    WETH: { address: '0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207', decimals: 18 },
  },
  bnb: {
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    WETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
  },
  avalanche: {
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
  },
  blast: {
    USDC: { address: '0x4300000000000000000000000000000000000003', decimals: 18 },
    WETH: { address: '0x4300000000000000000000000000000000000004', decimals: 18 },
  },
  worldchain: {
    USDC: { address: '0x79A02482A880bCE3B13e09Da970dC34db4CD24d1', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
};

vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
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
  QUOTE_CHAINS: MOCK_QUOTE_CHAINS,
  QUOTE_TOKENS: MOCK_QUOTE_TOKENS,
  DEFAULT_CROSS_CHAIN_CHAINS: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'],
  ALL_CROSS_CHAIN_CHAINS: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'celo', 'bnb', 'avalanche', 'blast', 'worldchain'],
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

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Arbitrage Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getComparablePairs returns pairs with sideA and sideB', async () => {
    const { getComparablePairs } = await import('../../src/modules/arbitrage/client.js');

    const pairs = getComparablePairs();
    expect(pairs.length).toBeGreaterThanOrEqual(3);

    for (const pair of pairs) {
      expect(pair.sideA).toBeDefined();
      expect(pair.sideB).toBeDefined();
      expect(pair.sideA.token).toBeTruthy();
      expect(pair.sideB.token).toBeTruthy();
      expect(pair.name).toBeTruthy();
      expect(pair.description).toBeTruthy();
      // All pairs should be stablecoin comparisons
      expect(pair.sideA.chain).toBe('celo');
      expect(pair.sideB.chain).toBe('celo');
    }
  });

  it('getQuoteRate computes correct rate per unit', async () => {
    const { getQuoteRate } = await import('../../src/modules/arbitrage/client.js');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: {
          output: { amount: '9950000' }, // 9.95 USDC (6 decimals)
        },
      }),
    });

    const result = await getQuoteRate({
      label: 'cUSD→USDC (Celo)',
      chain: 'celo',
      token: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
      quoteToken: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
      amount: '10000000000000000000', // 10 cUSD (18 decimals)
      inputDecimals: 18,
      outputDecimals: 6,
    });

    // 9.95 USDC output / 10 cUSD input = 0.995 rate per unit
    expect(result.ratePerUnit).toBeCloseTo(0.995, 3);
    expect(result.routing).toBe('CLASSIC');
    expect(result.label).toBe('cUSD→USDC (Celo)');
  });

  it('getQuoteRate handles 6-to-6 decimal pairs', async () => {
    const { getQuoteRate } = await import('../../src/modules/arbitrage/client.js');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9980000' } }, // 9.98 USDC
      }),
    });

    const result = await getQuoteRate({
      label: 'USDT→USDC',
      chain: 'celo',
      token: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as `0x${string}`,
      quoteToken: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
      amount: '10000000', // 10 USDT (6 decimals)
      inputDecimals: 6,
      outputDecimals: 6,
    });

    // 9.98 / 10 = 0.998
    expect(result.ratePerUnit).toBeCloseTo(0.998, 3);
  });

  it('getCrossChainPairs generates correct number of pairs with default chains', async () => {
    const { getCrossChainPairs } = await import('../../src/modules/arbitrage/client.js');

    const pairs = getCrossChainPairs();
    // Default 5 chains → C(5,2) = 10 pairs
    expect(pairs).toHaveLength(10);

    for (const pair of pairs) {
      expect(pair.name).toContain('WETH price:');
      expect(pair.sideA.label).toContain('USDC→WETH');
      expect(pair.sideB.label).toContain('USDC→WETH');
      // Each side should be on a different chain
      expect(pair.sideA.chain).not.toBe(pair.sideB.chain);
    }
  });

  it('getCrossChainPairs generates correct pairs for specified chains', async () => {
    const { getCrossChainPairs } = await import('../../src/modules/arbitrage/client.js');

    const pairs = getCrossChainPairs(['ethereum', 'base', 'arbitrum']);
    // 3 chains → C(3,2) = 3 pairs
    expect(pairs).toHaveLength(3);

    const chainPairs = pairs.map(p => [p.sideA.chain, p.sideB.chain].sort());
    expect(chainPairs).toContainEqual(['arbitrum', 'ethereum']);
    expect(chainPairs).toContainEqual(['base', 'ethereum']);
    expect(chainPairs).toContainEqual(['arbitrum', 'base']);
  });

  it('getCrossChainPairs uses correct token addresses per chain', async () => {
    const { getCrossChainPairs } = await import('../../src/modules/arbitrage/client.js');

    const pairs = getCrossChainPairs(['ethereum', 'base']);
    expect(pairs).toHaveLength(1);

    const pair = pairs[0];
    // Ethereum side
    expect(pair.sideA.token).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'); // ETH USDC
    expect(pair.sideA.quoteToken).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'); // ETH WETH
    // Base side
    expect(pair.sideB.token).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // Base USDC
    expect(pair.sideB.quoteToken).toBe('0x4200000000000000000000000000000000000006'); // Base WETH
  });
});

describe('Arbitrage Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('detectArbitrage detects stablecoin spreads', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // Pair 1: cUSD/USDC peg — sideA (cUSD→USDC)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9950000' } }, // 9.95 USDC → rate 0.995
      }),
    });
    // Pair 1: sideB (USDC→cUSD)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '10050000000000000000' } }, // 10.05 cUSD → rate 1.005
      }),
    });
    // Pair 2: USDT/USDC peg — sideA (USDT→USDC)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9980000' } }, // 9.98 USDC → rate 0.998
      }),
    });
    // Pair 2: sideB (USDC→USDT)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '10020000' } }, // 10.02 USDT → rate 1.002
      }),
    });
    // Pair 3: cUSD vs USDT — sideA (cUSD→USDC)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9950000' } }, // rate 0.995
      }),
    });
    // Pair 3: sideB (USDT→USDC)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9980000' } }, // rate 0.998
      }),
    });

    // Venice analysis
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: { content: 'The spreads are typical for stablecoin pools. cUSD/USDC at 1% is worth monitoring.' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
    });

    const result = await detectArbitrage({ minSpreadPercent: 0, mode: 'stablecoin' });

    expect(result.pairsChecked).toBe(3);
    expect(result.timestamp).toBeTruthy();
    expect(result.opportunities.length).toBeGreaterThan(0);

    // All spreads should be reasonable stablecoin spreads (< 5%)
    for (const opp of result.opportunities) {
      expect(opp.spreadPercent).toBeLessThan(5);
      expect(opp.spreadPercent).toBeGreaterThanOrEqual(0);
      expect(opp.sideA.rate).toBeGreaterThan(0.9);
      expect(opp.sideA.rate).toBeLessThan(1.1);
      expect(opp.sideB.rate).toBeGreaterThan(0.9);
      expect(opp.sideB.rate).toBeLessThan(1.1);
      expect(opp.direction).toBeTruthy();
    }

    // Should be sorted by spread descending
    for (let i = 1; i < result.opportunities.length; i++) {
      expect(result.opportunities[i - 1].spreadPercent).toBeGreaterThanOrEqual(result.opportunities[i].spreadPercent);
    }

    // cUSD/USDC peg (1% spread) should be the top opportunity
    expect(result.opportunities[0].pair).toContain('cUSD');
    expect(result.analysis).toBeTruthy();
  });

  it('detectArbitrage filters by pair name', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // Filter to only USDT/USDC peg — 1 pair, 2 quotes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '9990000' } }, // rate 0.999
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '10010000' } }, // rate 1.001
      }),
    });

    // Venice analysis
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'USDT peg is tight.' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      }),
    });

    const result = await detectArbitrage({ pairs: ['USDT/USDC'], minSpreadPercent: 0, mode: 'stablecoin' });
    expect(result.pairsChecked).toBe(1);
    expect(result.opportunities[0]?.pair).toContain('USDT/USDC');
  });

  it('detectArbitrage respects minSpreadPercent filter', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // All pairs return perfect 1:1 rates (zero spread)
    // Pair 1 sideA: 10 cUSD(18dec) → USDC(6dec): output 10 USDC
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 1 sideB: 10 USDC(6dec) → cUSD(18dec): output 10 cUSD
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000000000000000' } } }) });
    // Pair 2 sideA: 10 USDT(6dec) → USDC(6dec): output 10 USDC
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 2 sideB: 10 USDC(6dec) → USDT(6dec): output 10 USDT
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 3 sideA: 10 cUSD(18dec) → USDC(6dec): output 10 USDC
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 3 sideB: 10 USDT(6dec) → USDC(6dec): output 10 USDC
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });

    const result = await detectArbitrage({ minSpreadPercent: 5, mode: 'stablecoin' });
    // With perfect 1:1 rates, no opportunities should exceed 5% spread
    expect(result.opportunities.length).toBe(0);
    expect(result.pairsChecked).toBe(3);
  });

  it('detectArbitrage detects cross-chain WETH price differences', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // Cross-chain: ethereum vs base — USDC→WETH
    // Ethereum: 100 USDC (6 dec) → 0.05 WETH (18 dec)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '50000000000000000' } }, // 0.05 WETH
      }),
    });
    // Base: 100 USDC (6 dec) → 0.052 WETH (18 dec)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '52000000000000000' } }, // 0.052 WETH
      }),
    });

    // Venice analysis
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'WETH is cheaper on Base. 4% spread is significant.' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
      }),
    });

    const result = await detectArbitrage({
      mode: 'cross-chain',
      chains: ['ethereum', 'base'],
      minSpreadPercent: 0,
    });

    expect(result.pairsChecked).toBe(1);
    expect(result.opportunities).toHaveLength(1);

    const opp = result.opportunities[0];
    expect(opp.pair).toContain('Ethereum');
    expect(opp.pair).toContain('Base');
    // Spread: |0.0005 - 0.00052| / 0.0005 * 100 = 4%
    expect(opp.spreadPercent).toBeCloseTo(4, 0);
    expect(opp.direction).toContain('Base');
    expect(opp.analysis).toBeUndefined(); // analysis is on the result, not the opportunity
    expect(result.analysis).toBeTruthy();
  });

  it('detectArbitrage batches quotes with rate limiting', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // 3 chains → 3 pairs → 6 quotes
    // All return same rate (no spread)
    for (let i = 0; i < 6; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          routing: 'CLASSIC',
          quote: { output: { amount: '50000000000000000' } }, // 0.05 WETH
        }),
      });
    }

    const result = await detectArbitrage({
      mode: 'cross-chain',
      chains: ['ethereum', 'base', 'arbitrum'],
      minSpreadPercent: 5,
    });

    expect(result.pairsChecked).toBe(3);
    // All same rate → no opportunities above 5%
    expect(result.opportunities).toHaveLength(0);
    // Verify all 6 quotes were called
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it('detectArbitrage mode=all combines stablecoin and cross-chain pairs', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // mode='all' with chains=['ethereum','base'] → 3 stablecoin + 1 cross-chain = 4 pairs = 8 quotes
    // Stablecoin pairs (3 pairs, 6 quotes) — realistic 6-decimal stablecoin responses
    // Pair 1: cUSD→USDC (18→6 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 1: USDC→cUSD (6→18 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000000000000000' } } }) });
    // Pair 2: USDT→USDC (6→6 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 2: USDC→USDT (6→6 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 3: cUSD→USDC (18→6 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Pair 3: USDT→USDC (6→6 dec)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '10000000' } } }) });
    // Cross-chain pair (1 pair, 2 quotes) — same WETH rate
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '50000000000000000' } } }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '50000000000000000' } } }) });

    const result = await detectArbitrage({
      mode: 'all',
      chains: ['ethereum', 'base'],
      minSpreadPercent: 50,
    });

    // 3 stablecoin pairs + 1 cross-chain pair = 4
    expect(result.pairsChecked).toBe(4);
    expect(result.opportunities).toHaveLength(0);
  });

  it('detectArbitrage uses premium defaults when selfVerified=true', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // selfVerified=true with mode=cross-chain should use all 10 chains → C(10,2)=45 pairs → 90 quotes
    // All return same rate → no opportunities
    for (let i = 0; i < 90; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          routing: 'CLASSIC',
          quote: { output: { amount: '50000000000000000' } },
        }),
      });
    }

    const result = await detectArbitrage({
      mode: 'cross-chain',
      selfVerified: true,
      minSpreadPercent: 50, // high threshold so no opportunities
    });

    // Premium: all 10 chains → 45 pairs
    expect(result.pairsChecked).toBe(45);
  });

  it('detectArbitrage uses standard defaults when selfVerified=false', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // selfVerified=false with mode=cross-chain should use default 5 chains → C(5,2)=10 pairs → 20 quotes
    for (let i = 0; i < 20; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          routing: 'CLASSIC',
          quote: { output: { amount: '50000000000000000' } },
        }),
      });
    }

    const result = await detectArbitrage({
      mode: 'cross-chain',
      selfVerified: false,
      minSpreadPercent: 50,
    });

    // Standard: default 5 chains → 10 pairs
    expect(result.pairsChecked).toBe(10);
  });

  it('detectArbitrage explicit chains override tier defaults', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // Even with selfVerified=true, explicit chains=[eth,base] → 1 pair
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '50000000000000000' } } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ routing: 'CLASSIC', quote: { output: { amount: '50000000000000000' } } }),
    });

    const result = await detectArbitrage({
      mode: 'cross-chain',
      chains: ['ethereum', 'base'],
      selfVerified: true,
      minSpreadPercent: 50,
    });

    expect(result.pairsChecked).toBe(1);
  });

  it('detectArbitrage handles failed quotes gracefully', async () => {
    const { detectArbitrage } = await import('../../src/modules/arbitrage/service.js');

    // 1 cross-chain pair, sideA succeeds, sideB fails
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        routing: 'CLASSIC',
        quote: { output: { amount: '50000000000000000' } },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    const result = await detectArbitrage({
      mode: 'cross-chain',
      chains: ['ethereum', 'base'],
      minSpreadPercent: 0,
    });

    // Failed quote → pair skipped, no opportunities
    expect(result.pairsChecked).toBe(1);
    expect(result.opportunities).toHaveLength(0);
  });
});
