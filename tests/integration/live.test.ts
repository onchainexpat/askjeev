import { describe, it, expect } from 'vitest';

const DEPLOY_URL = process.env.DEPLOY_URL || 'https://synthesis-hackathon-beta.vercel.app';
const SKIP = !process.env.RUN_INTEGRATION;

describe.skipIf(SKIP)('Live Deployment Integration Tests', () => {
  it('health endpoint returns ok', async () => {
    const res = await fetch(`${DEPLOY_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.agent).toBe('AskJeev');
  });

  it('agent.json returns valid ERC-8004 manifest', async () => {
    const res = await fetch(`${DEPLOY_URL}/agent.json`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('AskJeev');
    expect(data.x402Support).toBe(true);
    expect(data.capabilities.chains).toContain('eip155:8453');
    expect(data.capabilities.chains).toContain('eip155:42220');
    expect(data.supportedTrust).toContain('self-agent-id');
  });

  it('x402-discovery lists endpoints with cross-chain support', async () => {
    const res = await fetch(`${DEPLOY_URL}/x402-discovery`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agent).toBe('AskJeev');
    expect(data.supportedChains).toBeDefined();
    expect(data.endpoints.length).toBeGreaterThanOrEqual(3);
    expect(data.payTo).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('swap-quote returns real Uniswap quote on Base', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/swap-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '100000000000000',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routing).toBe('CLASSIC');
    expect(data.output.amount).toBeDefined();
    expect(Number(data.output.amount)).toBeGreaterThan(0);
  }, 20000);

  it('swap-quote returns real Uniswap quote on Celo', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/swap-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        amount: '1000000000000000000',
        chain: 'celo',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routing).toBe('CLASSIC');
    expect(data.output.amount).toBeDefined();
  }, 20000);

  it('private-analyze returns Venice zero-retention response', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/private-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What is 1+1? Answer with just the number.' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.privacy).toBe('venice-zero-retention');
    expect(data.analysis).toBeDefined();
    expect(data.analysis.length).toBeGreaterThan(0);
  }, 30000);

  it('ask endpoint returns Bankr LLM response', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Say hi', model: 'gemini-2.5-flash' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBeDefined();
    expect(data.model).toBeDefined();
    expect(data.usage).toBeDefined();
  }, 20000);

  it('balances endpoint returns cross-chain data', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/balances`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.wallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(data.chains.base.chainId).toBe(8453);
    expect(data.chains.celo.chainId).toBe(42220);
    expect(data.chains.base.ETH).toBeDefined();
    expect(data.chains.celo.CELO).toBeDefined();
  }, 15000);

  it('self-status endpoint responds', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/self-status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.selfEnabled).toBeDefined();
    expect(data.message).toBeDefined();
  });

  it('swap-quote rejects missing fields', async () => {
    const res = await fetch(`${DEPLOY_URL}/api/swap-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn: '0x0' }),
    });
    expect(res.status).toBe(400);
  });
});
