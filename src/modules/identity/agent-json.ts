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
      chains: [
        'eip155:1',      // Ethereum
        'eip155:8453',   // Base
        'eip155:42161',  // Arbitrum
        'eip155:137',    // Polygon
        'eip155:10',     // Optimism
        'eip155:42220',  // Celo
        'eip155:56',     // BNB Chain
        'eip155:43114',  // Avalanche
        'eip155:81457',  // Blast
        'eip155:480',    // World Chain
      ],
      tokens: ['USDC'],
      llm: {
        general: 'bankr-gateway',
        private: 'venice-ai',
      },
      swaps: 'uniswap-trading-api',
      discovery: 'x402-service-discovery',
      arbitrage: 'cross-chain-arbitrage-detection',
      rebalancing: 'private-portfolio-rebalancer',
    },
  };
}
