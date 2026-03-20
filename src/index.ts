/**
 * AskJeev — Autonomous Agent Butler
 *
 * An AI agent that operates as a full economic participant on Base:
 * - Discovers and pays for x402 APIs autonomously
 * - Swaps tokens via Uniswap Trading API
 * - Reasons privately via Venice AI (zero data retention)
 * - Funds its own inference via Bankr LLM Gateway
 * - Hosts paid x402 services for other agents
 * - Operates with ERC-8004 verified identity
 *
 * The economic loop: Earn (x402 services) → Swap (Uniswap) → Think (Bankr/Venice) → Serve → Repeat
 */

export { uniswapTools } from './modules/uniswap/tools.js';
export { bankrTools } from './modules/bankr/tools.js';
export { veniceTools } from './modules/venice/tools.js';
export { generateAgentJson } from './modules/identity/agent-json.js';
export { log, readLogs, getLogSummary } from './modules/identity/logger.js';
export { createRoutes } from './modules/x402-service/routes.js';

// Re-export clients for direct usage
export { getQuote, executeSwap, checkApproval, getTokenBalance } from './modules/uniswap/client.js';
export { chat as bankrChat, listModels as bankrModels } from './modules/bankr/client.js';
export { analyzePrivately, privateReason, listModels as veniceModels } from './modules/venice/client.js';

// New feature modules
export { queryX402Scan, fetchX402Manifest } from './modules/discovery/client.js';
export { discoverServices } from './modules/discovery/service.js';
export { getQuoteRate, getComparablePairs, getCrossChainPairs } from './modules/arbitrage/client.js';
export { detectArbitrage } from './modules/arbitrage/service.js';
export { getCurrentAllocations, computeRebalanceSwaps, fetchLivePrices } from './modules/rebalance/client.js';
export { rebalancePortfolio } from './modules/rebalance/service.js';
