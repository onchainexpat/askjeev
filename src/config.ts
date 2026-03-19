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
