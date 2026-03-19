import { Hono } from 'hono';
import { getQuote } from '../uniswap/client.js';
import { analyzePrivately } from '../venice/client.js';
import { chat } from '../bankr/client.js';
import { getAccount, TOKENS } from '../../config.js';
import { log } from '../identity/logger.js';
import { generateAgentJson } from '../identity/agent-json.js';
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

  // .well-known/x402 — service discovery for other agents
  app.get('/.well-known/x402', (c) => {
    const base = deployedUrl || `http://localhost:${process.env.PORT || 3402}`;
    return c.json({
      version: 2,
      agent: 'AskJeev',
      description: 'Autonomous agent butler — swap quotes, private analysis, and multi-model reasoning as paid APIs.',
      endpoints: [
        {
          path: '/api/swap-quote',
          method: 'POST',
          price: '$0.005',
          currency: 'USDC',
          network: 'base',
          description: 'Get a Uniswap swap quote for any token pair on Base.',
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
      ],
      payTo: getAccount().address,
    });
  });

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
        },
        resourceServer,
      ),
    );
  }

  // === Paid API Endpoints ===

  // Swap quote service
  app.post('/api/swap-quote', async (c) => {
    const body = await c.req.json();
    const { tokenIn, tokenOut, amount } = body;

    if (!tokenIn || !tokenOut || !amount) {
      return c.json({ error: 'tokenIn, tokenOut, and amount required' }, 400);
    }

    const account = getAccount();
    const quote = await getQuote(tokenIn as Address, tokenOut as Address, amount, account.address);

    await log('service_swap_quote', 'api/swap-quote', { tokenIn, tokenOut, amount }, {
      routing: quote.routing,
      earned: '$0.005',
    });

    return c.json({
      routing: quote.routing,
      input: quote.quote.input || quote.quote.orderInfo?.input,
      output: quote.quote.output || { amount: quote.quote.orderInfo?.outputs?.[0]?.startAmount },
      gasFeeUSD: quote.quote.gasFeeUSD || 'gasless',
      priceImpact: quote.quote.priceImpact,
    });
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

  return app;
}
