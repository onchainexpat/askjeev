/**
 * One-time script: Publish AskJeev's Agent Card to Celo via Self Agent SDK.
 *
 * Machine-readable agent discovery — other agents can find AskJeev
 * and know its capabilities without a human directory.
 *
 * Usage: npx tsx scripts/publish-agent-card.ts
 * Requires: SELF_AGENT_PRIVATE_KEY in .env
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually (no dotenv dependency)
try {
  const envPath = resolve(import.meta.dirname || '.', '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch { /* .env not found, rely on existing env vars */ }

async function main() {
  const privateKey = process.env.SELF_AGENT_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: SELF_AGENT_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  console.log('Loading Self Agent SDK...');
  const { SelfAgent } = await import('@selfxyz/agent-sdk');

  const agent = new SelfAgent({ privateKey });

  console.log('Publishing Agent Card to Celo...');
  await agent.setAgentCard({
    name: 'AskJeev',
    description: 'Autonomous agent butler — cross-chain arbitrage, swap quotes, private analysis',
    url: 'https://synthesis-hackathon-beta.vercel.app',
    skills: [
      { id: 'arbitrage', name: 'Cross-Chain Arbitrage', description: 'WETH price comparison across 10 chains', tags: ['defi', 'arbitrage'] },
      { id: 'swap-quote', name: 'Swap Quote', description: 'Uniswap quotes on 10 chains', tags: ['defi', 'trading'] },
      { id: 'private-analyze', name: 'Private Analysis', description: 'Venice AI zero-retention analysis', tags: ['ai', 'privacy'] },
      { id: 'ask', name: 'Multi-Model Reasoning', description: 'Bankr LLM Gateway 20+ models', tags: ['ai', 'reasoning'] },
      { id: 'rebalance', name: 'Portfolio Rebalancer', description: 'Venice-analyzed rebalancing', tags: ['defi', 'portfolio'] },
      { id: 'discover', name: 'Service Discovery', description: 'x402 ecosystem search', tags: ['discovery'] },
    ],
  });

  console.log('Agent Card published successfully!');
  console.log('Verify at: GET /api/agent-card');
}

main().catch((err) => {
  console.error('Failed to publish Agent Card:', err);
  process.exit(1);
});
