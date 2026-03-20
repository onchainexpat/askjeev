/**
 * Portfolio Rebalance Client
 *
 * Computes current allocations, calculates gaps vs targets,
 * and determines the minimal set of swaps needed to rebalance.
 */

import { getTokenBalance, getQuote } from '../uniswap/client.js';
import { getAccount, TOKENS } from '../../config.js';
import type { Address } from 'viem';
import { formatEther, formatUnits, parseEther } from 'viem';

export interface TokenAllocation {
  symbol: string;
  token: Address;
  chain: 'base' | 'celo';
  balance: string;
  balanceFormatted: string;
  decimals: number;
  valueUSD: number;
  percentOfTotal: number;
}

export interface RebalanceTarget {
  symbol: string;
  targetPercent: number;
}

export interface RebalanceSwap {
  from: string;
  to: string;
  amountUSD: number;
  chain: 'base' | 'celo';
  reason: string;
}

export interface PortfolioState {
  wallet: Address;
  allocations: TokenAllocation[];
  totalValueUSD: number;
}

// Fallback prices used when live quotes are unavailable
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 2100,
  USDC: 1,
  CELO: 0.08,
  cUSD: 1,
  USDT: 1,
  WETH: 2100,
};

/**
 * Fetch live token prices via Uniswap quotes.
 * Quotes non-stablecoin tokens against USDC to get current prices.
 * Falls back to estimates if quotes fail.
 */
export async function fetchLivePrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { ...FALLBACK_PRICES };

  try {
    const account = getAccount();

    const [ethQuote, celoQuote] = await Promise.allSettled([
      getQuote(
        TOKENS.base.ETH as Address,
        TOKENS.base.USDC as Address,
        parseEther('0.001').toString(),
        account.address,
        'base',
      ),
      getQuote(
        '0x0000000000000000000000000000000000000000' as Address,
        TOKENS.celo.USDC as Address,
        parseEther('1').toString(),
        account.address,
        'celo',
      ),
    ]);

    if (ethQuote.status === 'fulfilled') {
      const output = Number(ethQuote.value?.quote?.output?.amount || 0) / 1e6;
      if (output > 0) {
        prices.ETH = output / 0.001;
        prices.WETH = prices.ETH;
      }
    }

    if (celoQuote.status === 'fulfilled') {
      const output = Number(celoQuote.value?.quote?.output?.amount || 0) / 1e6;
      if (output > 0) {
        prices.CELO = output;
      }
    }
  } catch {
    // Fall back to estimates
  }

  return prices;
}

/**
 * Get current portfolio allocations with USD values and percentages.
 * Uses live Uniswap quotes for pricing, falling back to estimates.
 */
export async function getCurrentAllocations(wallet?: Address): Promise<PortfolioState> {
  const account = getAccount();
  const addr = wallet || account.address;

  // Fetch live prices and all balances in parallel
  const [prices, baseEth, baseUsdc, celoCelo, celoCusd, celoUsdc] = await Promise.all([
    fetchLivePrices(),
    getTokenBalance('0x0000000000000000000000000000000000000000' as Address, addr, 'base'),
    getTokenBalance(TOKENS.base.USDC as Address, addr, 'base'),
    getTokenBalance('0x0000000000000000000000000000000000000000' as Address, addr, 'celo'),
    getTokenBalance(TOKENS.celo.cUSD as Address, addr, 'celo'),
    getTokenBalance(TOKENS.celo.USDC as Address, addr, 'celo'),
  ]);

  const allocations: TokenAllocation[] = [
    {
      symbol: 'ETH',
      token: TOKENS.base.ETH as Address,
      chain: 'base',
      balance: baseEth,
      balanceFormatted: formatEther(BigInt(baseEth)),
      decimals: 18,
      valueUSD: Number(formatEther(BigInt(baseEth))) * prices.ETH,
      percentOfTotal: 0,
    },
    {
      symbol: 'USDC (Base)',
      token: TOKENS.base.USDC as Address,
      chain: 'base',
      balance: baseUsdc,
      balanceFormatted: formatUnits(BigInt(baseUsdc), 6),
      decimals: 6,
      valueUSD: Number(formatUnits(BigInt(baseUsdc), 6)) * prices.USDC,
      percentOfTotal: 0,
    },
    {
      symbol: 'CELO',
      token: '0x0000000000000000000000000000000000000000' as Address,
      chain: 'celo',
      balance: celoCelo,
      balanceFormatted: formatEther(BigInt(celoCelo)),
      decimals: 18,
      valueUSD: Number(formatEther(BigInt(celoCelo))) * prices.CELO,
      percentOfTotal: 0,
    },
    {
      symbol: 'cUSD',
      token: TOKENS.celo.cUSD as Address,
      chain: 'celo',
      balance: celoCusd,
      balanceFormatted: formatUnits(BigInt(celoCusd), 18),
      decimals: 18,
      valueUSD: Number(formatUnits(BigInt(celoCusd), 18)) * prices.cUSD,
      percentOfTotal: 0,
    },
    {
      symbol: 'USDC (Celo)',
      token: TOKENS.celo.USDC as Address,
      chain: 'celo',
      balance: celoUsdc,
      balanceFormatted: formatUnits(BigInt(celoUsdc), 6),
      decimals: 6,
      valueUSD: Number(formatUnits(BigInt(celoUsdc), 6)) * prices.USDC,
      percentOfTotal: 0,
    },
  ];

  const totalValueUSD = allocations.reduce((sum, a) => sum + a.valueUSD, 0);

  // Compute percentages
  for (const alloc of allocations) {
    alloc.percentOfTotal = totalValueUSD > 0 ? Math.round((alloc.valueUSD / totalValueUSD) * 10000) / 100 : 0;
  }

  return { wallet: addr, allocations, totalValueUSD };
}

/**
 * Compute the minimal set of swaps to move from current allocations to targets.
 * Targets are { symbol: 'ETH', targetPercent: 50 } style objects.
 */
export function computeRebalanceSwaps(
  allocations: TokenAllocation[],
  targets: RebalanceTarget[],
  totalUSD: number,
): RebalanceSwap[] {
  if (totalUSD <= 0) return [];

  const swaps: RebalanceSwap[] = [];

  // Map current allocations by symbol
  const currentMap = new Map(allocations.map((a) => [a.symbol, a]));

  // Compute gaps: positive = over-allocated, negative = under-allocated
  const gaps: Array<{ symbol: string; chain: 'base' | 'celo'; gapUSD: number; currentPercent: number; targetPercent: number }> = [];

  for (const target of targets) {
    const current = currentMap.get(target.symbol);
    const currentPercent = current?.percentOfTotal ?? 0;
    const currentValueUSD = current?.valueUSD ?? 0;
    const targetValueUSD = (target.targetPercent / 100) * totalUSD;
    const gapUSD = currentValueUSD - targetValueUSD;

    gaps.push({
      symbol: target.symbol,
      chain: current?.chain ?? 'base',
      gapUSD,
      currentPercent,
      targetPercent: target.targetPercent,
    });
  }

  // Sort: over-allocated first (sources), under-allocated last (destinations)
  gaps.sort((a, b) => b.gapUSD - a.gapUSD);

  const overAllocated = gaps.filter((g) => g.gapUSD > 0.01);
  const underAllocated = gaps.filter((g) => g.gapUSD < -0.01);

  // Match sources to destinations
  let srcIdx = 0;
  let dstIdx = 0;
  let srcRemaining = overAllocated[srcIdx]?.gapUSD ?? 0;
  let dstRemaining = Math.abs(underAllocated[dstIdx]?.gapUSD ?? 0);

  while (srcIdx < overAllocated.length && dstIdx < underAllocated.length) {
    const transferUSD = Math.min(srcRemaining, dstRemaining);
    if (transferUSD > 0.01) {
      const src = overAllocated[srcIdx];
      const dst = underAllocated[dstIdx];
      swaps.push({
        from: src.symbol,
        to: dst.symbol,
        amountUSD: Math.round(transferUSD * 100) / 100,
        chain: src.chain === dst.chain ? src.chain : 'base', // same-chain preferred
        reason: `${src.symbol} is ${src.currentPercent.toFixed(1)}% (target ${src.targetPercent}%), ${dst.symbol} is ${dst.currentPercent.toFixed(1)}% (target ${dst.targetPercent}%)`,
      });
    }

    srcRemaining -= transferUSD;
    dstRemaining -= transferUSD;

    if (srcRemaining <= 0.01) {
      srcIdx++;
      srcRemaining = overAllocated[srcIdx]?.gapUSD ?? 0;
    }
    if (dstRemaining <= 0.01) {
      dstIdx++;
      dstRemaining = Math.abs(underAllocated[dstIdx]?.gapUSD ?? 0);
    }
  }

  return swaps;
}
