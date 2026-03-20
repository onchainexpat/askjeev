import { Hono } from 'hono';
import { getQuote } from '../uniswap/client.js';
import { analyzePrivately } from '../venice/client.js';
import { chat } from '../bankr/client.js';
import { getAccount } from '../../config.js';
import { log } from '../identity/logger.js';
import { generateAgentJson } from '../identity/agent-json.js';
import { discoverServices } from '../discovery/service.js';
import { detectArbitrage } from '../arbitrage/service.js';
import { rebalancePortfolio } from '../rebalance/service.js';
import { QUOTE_CHAINS } from '../../config.js';
import type { Address } from 'viem';

export interface X402Config {
  facilitatorUrl: string;
  network: `${string}:${string}`;
  skipPayment: boolean;
}

export async function createRoutes(deployedUrl?: string, x402Config?: X402Config): Promise<Hono> {
  const app = new Hono();

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', agent: 'AskJeev', version: '0.1.0' }));

  // ERC-8004 agent manifest
  app.get('/agent.json', (c) => {
    return c.json(generateAgentJson({ deployedUrl }));
  });

  // x402 service discovery — both paths for compatibility
  // (.well-known may be blocked by some hosting providers)
  const x402Discovery = (c: any) => {
    const base = deployedUrl || `http://localhost:${process.env.PORT || 3402}`;
    return c.json({
      version: 2,
      agent: 'AskJeev',
      description: 'Autonomous agent butler — cross-chain swap quotes, private analysis, and multi-model reasoning as paid APIs.',
      supportedChains: [
        'ethereum (1)', 'base (8453)', 'arbitrum (42161)', 'polygon (137)', 'optimism (10)',
        'celo (42220)', 'bnb (56)', 'avalanche (43114)', 'blast (81457)', 'worldchain (480)',
      ],
      endpoints: [
        {
          path: '/api/swap-quote',
          method: 'POST',
          price: '$0.005',
          currency: 'USDC',
          network: 'base, celo',
          description: 'Get a Uniswap swap quote for any token pair on Base or Celo. Pass {"chain":"celo"} for Celo.',
        },
        {
          path: '/api/balances',
          method: 'GET',
          price: 'free',
          description: 'Check wallet balances across Base and Celo.',
        },
        {
          path: '/api/private-analyze',
          method: 'POST',
          price: '$0.02',
          currency: 'USDC',
          network: 'base',
          description: 'Private financial analysis via Venice AI (zero data retention).',
        },
        {
          path: '/api/ask',
          method: 'POST',
          price: '$0.01',
          currency: 'USDC',
          network: 'base',
          description: 'General reasoning via Bankr LLM Gateway (20+ models).',
        },
        {
          path: '/api/discover',
          method: 'POST',
          price: '$0.01',
          currency: 'USDC',
          network: 'base',
          description: 'Discover x402 services across the agent economy — Venice-ranked search with live manifest fetching.',
        },
        {
          path: '/api/arbitrage',
          method: 'POST',
          price: '$0.01',
          currency: 'USDC',
          network: 'base',
          description: 'Detect cross-chain arbitrage opportunities across 10 chains via Uniswap quotes. Supports stablecoin pegs and USDC→WETH cross-chain pricing.',
        },
        {
          path: '/api/rebalance',
          method: 'POST',
          price: '$0.02',
          currency: 'USDC',
          network: 'base',
          description: 'Private portfolio rebalancer — Venice-analyzed with optional auto-execution.',
        },
      ],
      payTo: getAccount().address,
      selfAgentIdSupported: process.env.SELF_ENABLED === 'true',
      selfAgentIdDocs: 'https://docs.self.xyz/agent-id',
    });
  };
  app.get('/.well-known/x402', x402Discovery);
  app.get('/x402-discovery', x402Discovery);

  // === x402 Payment Middleware ===
  // Applied BEFORE route handlers so unpaid requests get 402
  // Dynamic import to avoid loading heavy crypto libs when payment is skipped
  if (x402Config && !x402Config.skipPayment) {
    const { paymentMiddleware, x402ResourceServer } = await import('@x402/hono');
    const { HTTPFacilitatorClient } = await import('@x402/core/server');
    const { ExactEvmScheme } = await import('@x402/evm/exact/server');

    const walletAddress = getAccount().address;
    const facilitatorClient = new HTTPFacilitatorClient({ url: x402Config.facilitatorUrl });
    const resourceServer = new x402ResourceServer(facilitatorClient).register(
      x402Config.network,
      new ExactEvmScheme(),
    );

    const makeConfig = (price: string, description: string) => ({
      accepts: {
        scheme: 'exact' as const,
        network: x402Config.network,
        payTo: walletAddress,
        price: `$${price}`,
      },
      description,
      mimeType: 'application/json',
    });

    app.use(
      paymentMiddleware(
        {
          'POST /api/swap-quote': makeConfig('0.005', 'Uniswap swap quote for any token pair on Base'),
          'POST /api/private-analyze': makeConfig('0.02', 'Private financial analysis via Venice AI'),
          'POST /api/ask': makeConfig('0.01', 'General reasoning via Bankr LLM Gateway'),
          'POST /api/discover': makeConfig('0.01', 'x402 service discovery — Venice-ranked search'),
          'POST /api/arbitrage': makeConfig('0.01', 'Cross-chain arbitrage detection between Base and Celo'),
          'POST /api/rebalance': makeConfig('0.02', 'Private portfolio rebalancer with optional auto-execution'),
        },
        resourceServer,
      ),
    );
  }

  // === Self Agent ID Verification (optional layer) ===
  // When Self headers are present, verifies the caller is human-backed.
  // Non-required by default — agents without Self can still use x402 payment.
  if (process.env.SELF_ENABLED === 'true') {
    const { selfAgentAuth } = await import('../self/middleware.js');
    const selfNetwork = (process.env.SELF_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
    app.use('/api/*', selfAgentAuth({ network: selfNetwork, required: false }));
  }

  // Self verification status endpoint
  app.get('/api/self-status', (c) => {
    const selfAgent = (c as any).get('selfAgent');
    return c.json({
      selfEnabled: process.env.SELF_ENABLED === 'true',
      verified: !!selfAgent?.verified,
      agentAddress: selfAgent?.address || null,
      agentId: selfAgent?.agentId?.toString() || null,
      message: selfAgent?.verified
        ? 'This agent is human-backed (Self Agent ID verified on Celo)'
        : 'Self Agent ID headers not provided or verification not enabled',
    });
  });

  // === Paid API Endpoints ===

  // Swap quote service (supports Base + Celo)
  app.post('/api/swap-quote', async (c) => {
    try {
      const body = await c.req.json();
      const { tokenIn, tokenOut, amount, chain } = body;
      const targetChain = (chain === 'celo' ? 'celo' : 'base') as 'base' | 'celo';

      if (!tokenIn || !tokenOut || !amount) {
        return c.json({ error: 'tokenIn, tokenOut, and amount required' }, 400);
      }

      const account = getAccount();
      const quote = await getQuote(tokenIn as Address, tokenOut as Address, amount, account.address, targetChain);

      await log('service_swap_quote', 'api/swap-quote', { tokenIn, tokenOut, amount, chain: targetChain }, {
        routing: quote.routing,
        chain: targetChain,
        earned: '$0.005',
      });

      return c.json({
        routing: quote.routing,
        input: quote.quote.input || quote.quote.orderInfo?.input,
        output: quote.quote.output || { amount: quote.quote.orderInfo?.outputs?.[0]?.startAmount },
        gasFeeUSD: quote.quote.gasFeeUSD || 'gasless',
        priceImpact: quote.quote.priceImpact,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Cross-chain balance check (Base + Celo)
  app.get('/api/balances', async (c) => {
    try {
      const account = getAccount();
      const { getTokenBalance } = await import('../uniswap/client.js');
      const { getPublicClient, TOKENS: T } = await import('../../config.js');

      // Base balances
      const baseEth = await getTokenBalance('0x0000000000000000000000000000000000000000', account.address, 'base');
      const baseUsdc = await getTokenBalance(T.base.USDC, account.address, 'base');

      // Celo balances
      const celoCelo = await getTokenBalance('0x0000000000000000000000000000000000000000', account.address, 'celo');
      const celoUsdc = await getTokenBalance(T.celo.USDC, account.address, 'celo');
      const celoCusd = await getTokenBalance(T.celo.cUSD, account.address, 'celo');

      await log('balances_checked', 'api/balances', { wallet: account.address }, { chains: ['base', 'celo'] });

      return c.json({
        wallet: account.address,
        chains: {
          base: {
            chainId: 8453,
            ETH: baseEth,
            USDC: baseUsdc,
          },
          celo: {
            chainId: 42220,
            CELO: celoCelo,
            USDC: celoUsdc,
            cUSD: celoCusd,
          },
        },
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Private analysis service (Venice)
  app.post('/api/private-analyze', async (c) => {
    const body = await c.req.json();
    const { prompt, context } = body;

    if (!prompt) {
      return c.json({ error: 'prompt required' }, 400);
    }

    const analysis = await analyzePrivately(prompt, context);

    await log('service_private_analyze', 'api/private-analyze', {
      promptLength: prompt.length,
      hasContext: !!context,
      earned: '$0.02',
    }, { responseLength: analysis.length });

    return c.json({ analysis, privacy: 'venice-zero-retention' });
  });

  // General reasoning service (Bankr)
  app.post('/api/ask', async (c) => {
    const body = await c.req.json();
    const { prompt, model } = body;

    if (!prompt) {
      return c.json({ error: 'prompt required' }, 400);
    }

    const response = await chat(
      [
        { role: 'system', content: 'Be concise and helpful.' },
        { role: 'user', content: prompt },
      ],
      { model },
    );

    await log('service_ask', 'api/ask', {
      promptLength: prompt.length,
      model: model || 'gemini-2.5-flash',
      earned: '$0.01',
    }, { tokensUsed: response.usage.total_tokens });

    return c.json({
      answer: response.choices[0].message.content,
      model: response.model,
      usage: response.usage,
    });
  });

  // x402 Service Discovery
  app.post('/api/discover', async (c) => {
    try {
      const body = await c.req.json();
      const { query, chain, priceMax, category, limit } = body;

      if (!query) {
        return c.json({ error: 'query required' }, 400);
      }

      const result = await discoverServices({ query, chain, priceMax, category, limit });

      await log('service_discover', 'api/discover', {
        query,
        chain,
        earned: '$0.01',
      }, {
        totalFound: result.totalFound,
        returned: result.services.length,
      });

      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Cross-Chain Arbitrage Detection
  app.post('/api/arbitrage', async (c) => {
    try {
      const body = await c.req.json();
      const { pairs, minSpreadPercent, includeAnalysis, mode, chains } = body;

      // Validate chain names if provided
      const validChains = chains
        ? (chains as string[]).filter(c => c in QUOTE_CHAINS)
        : undefined;

      const result = await detectArbitrage({ pairs, minSpreadPercent, includeAnalysis, mode, chains: validChains });

      await log('service_arbitrage', 'api/arbitrage', {
        pairsRequested: pairs,
        minSpreadPercent,
        earned: '$0.01',
      }, {
        opportunitiesFound: result.opportunities.length,
      });

      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Private Portfolio Rebalancer
  app.post('/api/rebalance', async (c) => {
    try {
      const body = await c.req.json();
      const { targets, dryRun, maxSlippage } = body;

      if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return c.json({ error: 'targets array required (e.g., [{"symbol":"ETH","targetPercent":50}])' }, 400);
      }

      const result = await rebalancePortfolio({ targets, dryRun, maxSlippage });

      await log('service_rebalance', 'api/rebalance', {
        targetCount: targets.length,
        dryRun: dryRun !== false,
        earned: '$0.02',
      }, {
        swapCount: result.swaps.length,
        executed: result.executed,
        transactions: result.transactions.length,
      });

      return c.json({
        portfolio: {
          wallet: result.portfolio.wallet,
          totalValueUSD: result.portfolio.totalValueUSD,
          allocations: result.portfolio.allocations.map(a => ({
            symbol: a.symbol,
            balance: a.balanceFormatted,
            valueUSD: Math.round(a.valueUSD * 100) / 100,
            percent: a.percentOfTotal,
          })),
        },
        swaps: result.swaps,
        analysis: result.analysis,
        executed: result.executed,
        transactions: result.transactions,
        privacy: 'venice-zero-retention',
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
