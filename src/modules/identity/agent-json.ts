import { getAccount } from '../../config.js';

/**
 * Generate ERC-8004 compliant agent.json manifest.
 */
export function generateAgentJson(options: {
  deployedUrl?: string;
  agentId?: string;
  agentRegistry?: string;
} = {}) {
  const account = getAccount();

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'AskJeev',
    description:
      'Autonomous agent butler that discovers x402 services, swaps tokens via Uniswap, ' +
      'reasons privately via Venice AI, funds its own inference via Bankr LLM Gateway, ' +
      'and serves paid APIs to other agents — all on Base with ERC-8004 verified identity.',
    image: options.deployedUrl ? `${options.deployedUrl}/logo.png` : undefined,
    services: [
      ...(options.deployedUrl
        ? [
            { name: 'web', endpoint: options.deployedUrl },
            { name: 'x402', endpoint: `${options.deployedUrl}/.well-known/x402` },
          ]
        : []),
      { name: 'MCP', endpoint: 'npx askjeev', version: '2025-06-18' },
    ],
    x402Support: true,
    active: true,
    registrations: options.agentId
      ? [{ agentId: parseInt(options.agentId), agentRegistry: options.agentRegistry }]
      : [],
    supportedTrust: ['reputation', 'erc-8004', 'self-agent-id'],
    capabilities: {
      payments: ['x402-exact', 'x402-escrow'],
      chains: ['eip155:8453'], // Base
      tokens: ['USDC'],
      llm: {
        general: 'bankr-gateway',
        private: 'venice-ai',
      },
      swaps: 'uniswap-trading-api',
    },
  };
}
