import { createWalletClient, createPublicClient, http, type Chain } from 'viem';
import { base, celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Supported chains
export const CHAINS: Record<string, { chain: Chain; rpc: string; chainId: string }> = {
  base: {
    chain: base,
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    chainId: '8453',
  },
  celo: {
    chain: celo,
    rpc: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    chainId: '42220',
  },
};

// Default chain
export const CHAIN: Chain = base;
export const BASE_RPC = CHAINS.base.rpc;

// Common token addresses per chain
export const TOKENS = {
  base: {
    ETH: '0x0000000000000000000000000000000000000000' as const,
    WETH: '0x4200000000000000000000000000000000000006' as const,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  },
  celo: {
    CELO: '0x0000000000000000000000000000000000000000' as const,
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const,
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const,
    USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as const,
  },
} as const;

// Quote-only chain configuration (no RPC needed — just Uniswap API quotes)
export const QUOTE_CHAINS = {
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
  unichain: { chainId: 130, name: 'Unichain' },
  zksync: { chainId: 324, name: 'zkSync' },
  linea: { chainId: 59144, name: 'Linea' },
  zora: { chainId: 7777777, name: 'Zora' },
  monad: { chainId: 143, name: 'Monad' },
  xlayer: { chainId: 196, name: 'X Layer' },
  soneium: { chainId: 1868, name: 'Soneium' },
  tempo: { chainId: 4217, name: 'Tempo' },
} as const;

export type ChainName = keyof typeof QUOTE_CHAINS;
export type WalletChainName = 'base' | 'celo';

export const DEFAULT_CROSS_CHAIN_CHAINS: ChainName[] = ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'];
export const ALL_CROSS_CHAIN_CHAINS: ChainName[] = (Object.keys(QUOTE_CHAINS) as ChainName[]).filter(c => c in QUOTE_TOKENS);

// USDC and WETH addresses per quote chain (for cross-chain arbitrage)
// Not all chains have WETH (e.g., Tempo is stablecoin-only)
export const QUOTE_TOKENS: Partial<Record<ChainName, {
  USDC: { address: `0x${string}`; decimals: number };
  WETH: { address: `0x${string}`; decimals: number };
}>> = {
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
    USDC: { address: '0x4300000000000000000000000000000000000003', decimals: 18 }, // USDB on Blast
    WETH: { address: '0x4300000000000000000000000000000000000004', decimals: 18 },
  },
  worldchain: {
    USDC: { address: '0x79A02482A880bCE3B13e09Da970dC34db4CD24d1', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  unichain: {
    USDC: { address: '0x078D782b760474a361dDA0AF3839290b0EF57AD6', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  zksync: {
    USDC: { address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', decimals: 6 },
    WETH: { address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', decimals: 18 },
  },
  linea: {
    USDC: { address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6 },
    WETH: { address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', decimals: 18 },
  },
  zora: {
    USDC: { address: '0xCccCcccc7021b32EBb4e8C08314bD62F7c653EC4', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  monad: {
    USDC: { address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603', decimals: 6 },
    WETH: { address: '0xee8c0e9f1bffb4eb878d8f15f368a02a35481242', decimals: 18 },
  },
  xlayer: {
    USDC: { address: '0x74b7F16337b8972027F6196A17a631aC6dE26d22', decimals: 6 },
    WETH: { address: '0x5A77f1443D16ee5761d310e38b62f77f726bC71c', decimals: 18 },
  },
  soneium: {
    USDC: { address: '0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  // Tempo (4217) omitted — stablecoin-only L1, no WETH
};

// Uniswap
export const UNISWAP_API_BASE = 'https://trade-api.gateway.uniswap.org/v1';
export const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY || '';
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

// Bankr
export const BANKR_LLM_BASE = 'https://llm.bankr.bot';
export const BANKR_API_KEY = process.env.BANKR_API_KEY || '';

// Venice
export const VENICE_API_BASE = 'https://api.venice.ai/api/v1';
export const VENICE_API_KEY = process.env.VENICE_API_KEY || '';

// x402 service
export const X402_ONCHAIN_EXPAT = 'https://x402.onchainexpat.com';
export const SERVER_PORT = parseInt(process.env.PORT || '3402', 10);

// Wallet setup
export function getAccount() {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY env var required');
  return privateKeyToAccount(key as `0x${string}`);
}

export function getWalletClient(chainName: 'base' | 'celo' = 'base') {
  const { chain, rpc } = CHAINS[chainName];
  return createWalletClient({
    account: getAccount(),
    chain,
    transport: http(rpc),
  });
}

export function getPublicClient(chainName: 'base' | 'celo' = 'base') {
  const { chain, rpc } = CHAINS[chainName];
  return createPublicClient({
    chain,
    transport: http(rpc),
  });
}
