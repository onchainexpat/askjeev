import { createWalletClient, createPublicClient, http, type Chain } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Base chain config
export const CHAIN: Chain = base;
export const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Common token addresses on Base
export const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000' as const,   // Native ETH (for Uniswap API)
  WETH: '0x4200000000000000000000000000000000000006' as const,  // Wrapped ETH
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const, // USDC on Base
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

export function getWalletClient() {
  return createWalletClient({
    account: getAccount(),
    chain: CHAIN,
    transport: http(BASE_RPC),
  });
}

export function getPublicClient() {
  return createPublicClient({
    chain: CHAIN,
    transport: http(BASE_RPC),
  });
}
