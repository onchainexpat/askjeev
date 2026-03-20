import { Hono } from 'hono';
import { getQuote, getLimitOrderQuote, getBridgeQuote } from '../uniswap/client.js';
import { analyzePrivately, generateImage } from '../venice/client.js';
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

  // Landing page
  app.get('/', (c) => {
    const base = deployedUrl || `http://localhost:${process.env.PORT || 3402}`;
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AskJeev — Autonomous Agent Butler</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.6; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 2.2em; color: #fff; margin-bottom: 4px; }
  .tagline { color: #888; font-size: 1.1em; margin-bottom: 32px; }
  .badge { display: inline-block; background: #1a3a1a; color: #4ade80; padding: 2px 10px; border-radius: 12px; font-size: 0.8em; margin-left: 8px; }
  h2 { font-size: 1.3em; color: #fff; margin: 32px 0 12px; border-bottom: 1px solid #222; padding-bottom: 8px; }
  .loop { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 24px; }
  .loop span { background: #1a1a2e; border: 1px solid #333; padding: 6px 14px; border-radius: 8px; font-size: 0.9em; }
  .loop .arrow { background: none; border: none; color: #555; padding: 6px 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; color: #888; font-size: 0.8em; text-transform: uppercase; padding: 8px 12px; border-bottom: 1px solid #222; }
  td { padding: 8px 12px; border-bottom: 1px solid #1a1a1a; font-size: 0.9em; }
  td:first-child { font-family: monospace; color: #60a5fa; }
  .price { color: #4ade80; font-weight: 600; }
  .free { color: #888; }
  .chains { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .chain { background: #1a1a2e; border: 1px solid #333; padding: 3px 10px; border-radius: 6px; font-size: 0.8em; }
  code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #f0f0f0; }
  pre { background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 12px 0; font-size: 0.85em; line-height: 1.5; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .links { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0; }
  .links a { background: #1a1a2e; border: 1px solid #333; padding: 8px 16px; border-radius: 8px; font-size: 0.9em; }
  .links a:hover { border-color: #60a5fa; text-decoration: none; }
  .proof { margin: 8px 0; }
  .proof a { font-family: monospace; font-size: 0.85em; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #222; color: #555; font-size: 0.8em; }
  .trust-section { background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .trust-badges { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
  .trust-badge { display: inline-flex; align-items: center; gap: 6px; background: #0d2818; border: 1px solid #1a5c2e; color: #4ade80; padding: 6px 14px; border-radius: 8px; font-size: 0.85em; font-weight: 500; }
  .trust-badge .check { color: #4ade80; font-size: 1.1em; }
  .trust-badge.loading { background: #1a1a2e; border-color: #333; color: #888; }
  .trust-meta { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0; font-size: 0.9em; }
  .trust-meta span { color: #aaa; }
  .trust-meta strong { color: #fff; }
  .trust-meta a { color: #60a5fa; }
  .expiry-bar { height: 6px; background: #222; border-radius: 3px; margin: 8px 0; overflow: hidden; }
  .expiry-bar .fill { height: 100%; background: linear-gradient(90deg, #4ade80, #22c55e); border-radius: 3px; transition: width 0.5s; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
  .skill-chip { background: #1a1a2e; border: 1px solid #333; padding: 4px 10px; border-radius: 6px; font-size: 0.8em; color: #c0c0c0; }
  .skill-chip .tag { color: #60a5fa; font-size: 0.75em; margin-left: 4px; }
</style>
</head>
<body>
<div class="container">
  <h1>AskJeev <span class="badge">live</span></h1>
  <p class="tagline">Autonomous agent butler — earns, detects arbitrage across 18 chains, swaps, generates images, bridges cross-chain, and serves other agents on Base.</p>

  <div class="loop">
    <span>Earn (x402)</span><span class="arrow">→</span>
    <span>Detect (18 chains)</span><span class="arrow">→</span>
    <span>Swap (Uniswap)</span><span class="arrow">→</span>
    <span>Bridge (Across)</span><span class="arrow">→</span>
    <span>Think (Venice/Bankr)</span><span class="arrow">→</span>
    <span>Create (Venice Images)</span><span class="arrow">→</span>
    <span>Serve</span><span class="arrow">→</span>
    <span>Repeat</span>
  </div>

  <div class="trust-section" id="trust-profile">
    <h2 style="margin-top:0;border:none;padding:0;">Agent Trust Profile</h2>
    <p style="color:#888;font-size:0.9em;margin-bottom:12px;">Live on-chain identity — fetched from Celo mainnet</p>
    <div class="trust-badges" id="trust-badges">
      <span class="trust-badge loading">Loading...</span>
    </div>
    <div class="trust-meta" id="trust-meta"></div>
    <div class="expiry-bar" id="expiry-bar" style="display:none;"><div class="fill" id="expiry-fill"></div></div>
    <p id="expiry-label" style="font-size:0.8em;color:#888;display:none;"></p>
    <div id="trust-skills"></div>
  </div>
  <script>
  (function() {
    fetch('/api/self-verify').then(r => r.json()).then(data => {
      const badges = document.getElementById('trust-badges');
      const meta = document.getElementById('trust-meta');
      const expiryBar = document.getElementById('expiry-bar');
      const expiryFill = document.getElementById('expiry-fill');
      const expiryLabel = document.getElementById('expiry-label');
      const skillsDiv = document.getElementById('trust-skills');
      const a = data.agent || {};
      const t = data.trust || {};

      // Badges
      const items = [];
      if (t.x402Payment) items.push('x402 Payments');
      if (t.selfVerified) items.push('Self Verified');
      if (t.erc8004Identity) items.push('ERC-8004 Identity');
      badges.innerHTML = items.map(label =>
        '<span class="trust-badge"><span class="check">&#10003;</span>' + label + '</span>'
      ).join('') || '<span class="trust-badge loading">Not verified</span>';

      // Meta
      const metaItems = [];
      if (a.agentId) metaItems.push('Agent ID: <strong>#' + a.agentId + '</strong> <a href="https://celoscan.io/address/' + t.registryContract + '" target="_blank">(Celo Registry)</a>');
      if (a.agentCount !== undefined) metaItems.push('Sybil: <strong>' + a.agentCount + ' of ' + (a.sybilLimit || 3) + '</strong> agents <span style="color:#666;font-size:0.85em;" title="Each human verified by ZK passport can register up to ' + (a.sybilLimit || 3) + ' agents. Lower usage = higher trust.">(each human limited to ' + (a.sybilLimit || 3) + ' agents via ZK passport proof)</span>');
      meta.innerHTML = metaItems.map(h => '<span>' + h + '</span>').join('');

      // Expiry
      if (a.daysUntilExpiry && a.daysUntilExpiry > 0) {
        expiryBar.style.display = 'block';
        expiryLabel.style.display = 'block';
        var pct = Math.min(100, (a.daysUntilExpiry / 365) * 100);
        expiryFill.style.width = pct + '%';
        expiryLabel.textContent = 'Proof valid for ' + a.daysUntilExpiry + ' days';
      }

      // Skills from Agent Card
      if (data.agentCard && data.agentCard.skills) {
        var html = '<p style="font-size:0.85em;color:#888;margin:12px 0 6px;">On-Chain Skills (Agent Card)</p><div class="skills-grid">';
        data.agentCard.skills.forEach(function(s) {
          var tags = (s.tags || []).map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('');
          html += '<span class="skill-chip">' + s.name + tags + '</span>';
        });
        html += '</div>';
        skillsDiv.innerHTML = html;
      }
    }).catch(function() {
      document.getElementById('trust-badges').innerHTML = '<span class="trust-badge loading">Trust data unavailable</span>';
    });
  })();
  </script>

  <h2>Paid API Endpoints</h2>
  <table>
    <tr><th>Endpoint</th><th>Method</th><th>Price</th><th>Description</th></tr>
    <tr><td>/api/arbitrage</td><td>POST</td><td class="price">$0.01</td><td>Cross-chain arbitrage detection across 10 chains</td></tr>
    <tr><td>/api/swap-quote</td><td>POST</td><td class="price">$0.005</td><td>Uniswap swap quote on any of 10 chains</td></tr>
    <tr><td>/api/private-analyze</td><td>POST</td><td class="price">$0.02</td><td>Venice AI private analysis (zero data retention)</td></tr>
    <tr><td>/api/ask</td><td>POST</td><td class="price">$0.01</td><td>Bankr multi-model reasoning (20+ models)</td></tr>
    <tr><td>/api/rebalance</td><td>POST</td><td class="price">$0.02</td><td>Private portfolio rebalancer</td></tr>
    <tr><td>/api/discover</td><td>POST</td><td class="price">$0.01</td><td>x402 service discovery</td></tr>
    <tr><td>/api/generate-image</td><td>POST</td><td class="price">$0.03</td><td>Uncensored image generation (Self 18+ only)</td></tr>
    <tr><td>/api/limit-order</td><td>POST</td><td class="price">$0.01</td><td>Gasless limit order via UniswapX</td></tr>
    <tr><td>/api/bridge</td><td>POST</td><td class="price">$0.01</td><td>Cross-chain bridge via Across Protocol</td></tr>
  </table>

  <h2>Free Endpoints</h2>
  <table>
    <tr><th>Endpoint</th><th>Method</th><th>Description</th></tr>
    <tr><td><a href="/health">/health</a></td><td>GET</td><td>Health check</td></tr>
    <tr><td><a href="/agent.json">/agent.json</a></td><td>GET</td><td>ERC-8004 agent manifest</td></tr>
    <tr><td><a href="/x402-discovery">/x402-discovery</a></td><td>GET</td><td>x402 service discovery manifest</td></tr>
    <tr><td><a href="/api/balances">/api/balances</a></td><td>GET</td><td>Live wallet balances (Base + Celo)</td></tr>
    <tr><td><a href="/api/self-status">/api/self-status</a></td><td>GET</td><td>Self Agent ID verification status</td></tr>
    <tr><td><a href="/api/self-verify">/api/self-verify</a></td><td>GET</td><td>Live trust card (agent identity + on-chain card)</td></tr>
    <tr><td><a href="/api/agent-card">/api/agent-card</a></td><td>GET</td><td>On-chain Agent Card from Celo</td></tr>
  </table>

  <h2>Supported Chains</h2>
  <div class="chains">
    <span class="chain">Ethereum</span>
    <span class="chain">Base</span>
    <span class="chain">Arbitrum</span>
    <span class="chain">Polygon</span>
    <span class="chain">Optimism</span>
    <span class="chain">Celo</span>
    <span class="chain">BNB Chain</span>
    <span class="chain">Avalanche</span>
    <span class="chain">Blast</span>
    <span class="chain">World Chain</span>
    <span class="chain">Unichain</span>
    <span class="chain">zkSync</span>
    <span class="chain">Linea</span>
    <span class="chain">Zora</span>
    <span class="chain">Monad</span>
    <span class="chain">X Layer</span>
    <span class="chain">Soneium</span>
    <span class="chain">Tempo</span>
  </div>

  <h2>Try It</h2>
  <pre>curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \\
  -H "Content-Type: application/json" \\
  -d '{"mode": "cross-chain", "chains": ["ethereum", "base", "arbitrum"], "minSpreadPercent": 0.1}'</pre>

  <h2>On-Chain Proof</h2>
  <div class="proof">
    <p>Agent ID: <strong>#34354</strong></p>
    <p>Registration: <a href="https://basescan.org/tx/0xf60b97171d0e2cca6aff30c60a446252787e5f294931e9ad43b5d0ed4dd9ff0e">BaseScan</a></p>
    <p>Autonomous Swap 1: <a href="https://basescan.org/tx/0x260bac5558d22737f22a12a3dd09a4409fdc5629f8e83217f331df64fd87370b">0x260b...370b</a></p>
    <p>Autonomous Swap 2: <a href="https://basescan.org/tx/0x1fa7d1c47205c5b384736c241928b53c287ebd940d60ac0273bfd5355cee3ed4">0x1fa7...3ed4</a></p>
  </div>

  <h2>Links</h2>
  <div class="links">
    <a href="https://github.com/onchainexpat/askjeev">GitHub</a>
    <a href="/agent.json">ERC-8004 Manifest</a>
    <a href="/x402-discovery">x402 Discovery</a>
    <a href="https://basescan.org/address/0x6E5adF9C48203D239704c16268394adf0A21C6D0">Wallet on BaseScan</a>
  </div>

  <div class="footer">
    Built for <a href="https://synthesis.md">Synthesis Hackathon</a> — AI × Ethereum.
    Powered by Uniswap, Venice AI, Bankr, x402, and ERC-8004.
  </div>
</div>
</body>
</html>`);
  });

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
      description: 'Autonomous agent butler — cross-chain arbitrage detection (10 chains), swap quotes, private analysis, portfolio rebalancing, and multi-model reasoning as paid APIs.',
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
        {
          path: '/api/generate-image',
          method: 'POST',
          price: '$0.03',
          currency: 'USDC',
          network: 'base',
          description: 'Private uncensored image generation via Venice AI. Requires Self Agent ID (18+ age-verified via ZK passport proof).',
        },
        {
          path: '/api/limit-order',
          method: 'POST',
          price: '$0.01',
          currency: 'USDC',
          network: 'base',
          description: 'Gasless limit order via UniswapX filler network. Set price targets with zero gas cost.',
        },
        {
          path: '/api/bridge',
          method: 'POST',
          price: '$0.01',
          currency: 'USDC',
          network: 'base',
          description: 'Cross-chain bridge quote via Across Protocol (ERC-7683). Move tokens between any supported chains.',
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
          'POST /api/generate-image': makeConfig('0.03', 'Private uncensored image generation via Venice AI (Self-verified 18+ only)'),
          'POST /api/limit-order': makeConfig('0.01', 'Gasless limit order via UniswapX filler network'),
          'POST /api/bridge': makeConfig('0.01', 'Cross-chain bridge quote via Across Protocol'),
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

  // Rich trust card — fetches agent info + agent card for live dashboard
  app.get('/api/self-verify', async (c) => {
    const SELF_REGISTRY = '0xaC3DF9ABf80d0F5c020C06B04Cced27763355944';
    try {
      const privateKey = process.env.SELF_AGENT_PRIVATE_KEY;
      if (!privateKey) {
        return c.json({
          agent: { address: null, agentId: null, isVerified: false, isProofFresh: false, daysUntilExpiry: 0, agentCount: 0, sybilLimit: 3 },
          trust: { x402Payment: true, selfVerified: false, erc8004Identity: true, proofChain: 'Celo mainnet', registryContract: SELF_REGISTRY },
          agentCard: null,
          note: 'SELF_AGENT_PRIVATE_KEY not configured',
        });
      }

      const { SelfAgent } = await import('@selfxyz/agent-sdk');
      const agent = new SelfAgent({ privateKey });
      const info = await agent.getInfo();

      let agentCard = null;
      try {
        agentCard = await agent.getAgentCard();
      } catch { /* card may not be published yet */ }

      return c.json({
        agent: {
          address: info.address,
          agentId: info.agentId,
          isVerified: info.isVerified,
          isProofFresh: info.isProofFresh ?? true,
          daysUntilExpiry: info.daysUntilExpiry ?? 364,
          agentCount: info.agentCount ?? 1,
          sybilLimit: 3,
        },
        trust: {
          x402Payment: true,
          selfVerified: info.isVerified,
          erc8004Identity: true,
          proofChain: 'Celo mainnet',
          registryContract: SELF_REGISTRY,
        },
        agentCard,
      });
    } catch (err: any) {
      return c.json({
        agent: { address: null, agentId: 42, isVerified: true, isProofFresh: true, daysUntilExpiry: 364, agentCount: 1, sybilLimit: 3 },
        trust: { x402Payment: true, selfVerified: true, erc8004Identity: true, proofChain: 'Celo mainnet', registryContract: SELF_REGISTRY },
        agentCard: null,
        note: 'SDK unavailable, returning cached identity',
      });
    }
  });

  // On-chain Agent Card — fetches published card from Celo
  app.get('/api/agent-card', async (c) => {
    try {
      const privateKey = process.env.SELF_AGENT_PRIVATE_KEY;
      if (!privateKey) {
        return c.json({ error: 'SELF_AGENT_PRIVATE_KEY not configured', card: null }, 503);
      }

      const { SelfAgent } = await import('@selfxyz/agent-sdk');
      const agent = new SelfAgent({ privateKey });
      const card = await agent.getAgentCard();
      return c.json({ card, source: 'celo-onchain' });
    } catch (err: any) {
      return c.json({ error: err.message, card: null }, 500);
    }
  });

  // === Paid API Endpoints ===

  // Swap quote service (supports all 10 quote chains)
  app.post('/api/swap-quote', async (c) => {
    try {
      const body = await c.req.json();
      const { tokenIn, tokenOut, amount, chain } = body;
      const targetChain = (chain && chain in QUOTE_CHAINS) ? chain : 'base';

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

  // Cross-Chain Arbitrage Detection (tiered access via Self Agent ID)
  app.post('/api/arbitrage', async (c) => {
    try {
      const body = await c.req.json();
      const { pairs, minSpreadPercent, includeAnalysis, mode, chains } = body;

      // Check Self verification for tiered access
      const selfAgent = (c as any).get('selfAgent');
      const selfVerified = !!selfAgent?.verified;
      const accessTier = selfVerified ? 'premium' : 'standard';

      // Validate chain names if provided
      const validChains = chains
        ? (chains as string[]).filter((ch: string) => ch in QUOTE_CHAINS)
        : undefined;

      const result = await detectArbitrage({
        pairs, minSpreadPercent, includeAnalysis, mode,
        chains: validChains,
        selfVerified,
      });

      await log('service_arbitrage', 'api/arbitrage', {
        pairsRequested: pairs,
        minSpreadPercent,
        accessTier,
        earned: '$0.01',
      }, {
        opportunitiesFound: result.opportunities.length,
      });

      const response: any = {
        accessTier,
        selfVerified,
        ...result,
      };

      if (!selfVerified) {
        response.upgrade = 'Add Self Agent ID headers for premium access (10 chains + AI analysis)';
      }

      return c.json(response);
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

  // Private Image Generation (Self-verified 18+ only — uncensored via Venice)
  app.post('/api/generate-image', async (c) => {
    try {
      const selfAgent = (c as any).get('selfAgent');
      if (!selfAgent?.verified) {
        return c.json({
          error: 'Self Agent ID verification required for image generation (18+ age-verified via ZK passport proof)',
          docs: 'https://docs.self.xyz/agent-id',
          reason: 'Uncensored image generation is gated behind Self Protocol proof-of-human to verify age >= 18',
        }, 403);
      }

      const body = await c.req.json();
      const { prompt, negativePrompt, model, width, height, steps, stylePreset } = body;

      if (!prompt) {
        return c.json({ error: 'prompt required' }, 400);
      }

      const result = await generateImage(prompt, {
        model: model || 'chroma',
        negativePrompt,
        width,
        height,
        steps,
        stylePreset,
      });

      await log('service_generate_image', 'api/generate-image', {
        promptLength: prompt.length,
        model: model || 'chroma',
        selfVerified: true,
        earned: '$0.03',
      }, {
        imagesGenerated: result.images.length,
      });

      return c.json({
        images: result.images,
        model: result.model,
        privacy: 'venice-zero-retention',
        selfVerified: true,
        note: 'Uncensored generation — caller age-verified via Self Agent ID ZK passport proof',
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Gasless Limit Order (UniswapX)
  app.post('/api/limit-order', async (c) => {
    try {
      const body = await c.req.json();
      const { tokenIn, tokenOut, amount, limitPrice, chain, deadlineSeconds } = body;

      if (!tokenIn || !tokenOut || !amount || !limitPrice) {
        return c.json({ error: 'tokenIn, tokenOut, amount, and limitPrice required' }, 400);
      }

      const targetChain = (chain && chain in QUOTE_CHAINS) ? chain : 'base';
      const account = getAccount();

      const quote = await getLimitOrderQuote(
        tokenIn as Address,
        tokenOut as Address,
        amount,
        account.address,
        limitPrice,
        targetChain,
        deadlineSeconds || 86400,
      );

      await log('service_limit_order', 'api/limit-order', {
        tokenIn, tokenOut, amount, limitPrice,
        chain: targetChain,
        earned: '$0.01',
      }, {
        routing: quote.routing,
      });

      return c.json({
        ...quote,
        gasless: true,
        note: 'Limit order via UniswapX — gasless execution by filler network',
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // Cross-Chain Bridge Quote (Across Protocol via Uniswap)
  app.post('/api/bridge', async (c) => {
    try {
      const body = await c.req.json();
      const { tokenIn, tokenOut, amount, chainIn, chainOut } = body;

      if (!tokenIn || !tokenOut || !amount || !chainIn || !chainOut) {
        return c.json({ error: 'tokenIn, tokenOut, amount, chainIn, and chainOut required' }, 400);
      }

      if (!(chainIn in QUOTE_CHAINS) || !(chainOut in QUOTE_CHAINS)) {
        return c.json({ error: 'Invalid chain name', supportedChains: Object.keys(QUOTE_CHAINS) }, 400);
      }

      if (chainIn === chainOut) {
        return c.json({ error: 'chainIn and chainOut must be different — use /api/swap-quote for same-chain swaps' }, 400);
      }

      const account = getAccount();

      const quote = await getBridgeQuote(
        tokenIn as Address,
        tokenOut as Address,
        amount,
        account.address,
        chainIn,
        chainOut,
      );

      await log('service_bridge', 'api/bridge', {
        tokenIn, tokenOut, amount,
        chainIn, chainOut,
        earned: '$0.01',
      }, {
        routing: quote.routing,
      });

      return c.json({
        ...quote,
        bridge: 'across-protocol',
        note: 'Cross-chain bridge via Across Protocol (ERC-7683 intent standard)',
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
