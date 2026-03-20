/**
 * Cross-Chain Arbitrage Service
 *
 * Detects stablecoin peg deviations, cross-stablecoin spreads on Celo,
 * and cross-chain WETH pricing discrepancies across up to 10 chains.
 * Ranks opportunities by spread size and uses Venice AI for analysis.
 */

import { getQuoteRate, getComparablePairs, getCrossChainPairs } from './client.js';
import type { ArbitrageOpportunity, ComparablePair, QuoteRateResult } from './client.js';
import { QUOTE_CHAINS, ALL_CROSS_CHAIN_CHAINS } from '../../config.js';
import type { ChainName } from '../../config.js';
import { analyzePrivately } from '../venice/client.js';
import { log } from '../identity/logger.js';

export interface DetectArbitrageParams {
  pairs?: string[];
  minSpreadPercent?: number;
  includeAnalysis?: boolean;
  mode?: 'stablecoin' | 'cross-chain' | 'all';
  chains?: string[];
  selfVerified?: boolean;
}

export interface DetectArbitrageResult {
  opportunities: ArbitrageOpportunity[];
  pairsChecked: number;
  analysis?: string;
  timestamp: string;
}

/**
 * Process async tasks in batches with delay between batches to avoid rate limits.
 */
async function batchQuotes<T>(
  tasks: (() => Promise<T>)[],
  batchSize = 4,
  delayMs = 250,
): Promise<(T | null)[]> {
  const results: (T | null)[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    for (const r of batchResults) {
      results.push(r.status === 'fulfilled' ? r.value : null);
    }
    if (i + batchSize < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

/**
 * Detect arbitrage opportunities by comparing exchange rates.
 *
 * Modes:
 * - 'stablecoin': Celo stablecoin peg pairs only (existing behavior)
 * - 'cross-chain': USDC→WETH rate comparison across chains
 * - 'all' (default): Both stablecoin and cross-chain pairs
 */
export async function detectArbitrage(params: DetectArbitrageParams = {}): Promise<DetectArbitrageResult> {
  // Tiered access: Self-verified agents get premium defaults (only when selfVerified is explicitly set)
  const tierApplied = params.selfVerified !== undefined;
  const isPremium = !!params.selfVerified;
  const {
    pairs: pairFilter,
    minSpreadPercent = (tierApplied && isPremium) ? 0.01 : 0.1,
    includeAnalysis = tierApplied ? isPremium : true,
    mode = 'all',
    chains,
  } = params;

  // When tier is applied: premium gets all 10 chains, standard gets default 5
  // When no tier (direct call): use provided chains or default 5
  const effectiveChains = chains
    ? chains.filter((c): c is ChainName => c in QUOTE_CHAINS)
    : (tierApplied && isPremium ? [...ALL_CROSS_CHAIN_CHAINS] : undefined);

  // Validate chain names if provided
  const validChainNames = effectiveChains;

  // Collect pairs based on mode
  let allPairs: ComparablePair[] = [];
  if (mode === 'stablecoin' || mode === 'all') {
    allPairs.push(...getComparablePairs());
  }
  if (mode === 'cross-chain' || mode === 'all') {
    allPairs.push(...getCrossChainPairs(validChainNames));
  }

  const pairsToCheck = pairFilter
    ? allPairs.filter((p) => pairFilter.some((f) => p.name.toLowerCase().includes(f.toLowerCase())))
    : allPairs;

  // Create all quote tasks (2 per pair, interleaved)
  const quoteTasks = pairsToCheck.flatMap(pair => [
    () => getQuoteRate(pair.sideA),
    () => getQuoteRate(pair.sideB),
  ]);

  // Execute with rate limiting
  const allResults = await batchQuotes(quoteTasks);

  const opportunities: ArbitrageOpportunity[] = [];

  // Process results in pairs
  for (let i = 0; i < pairsToCheck.length; i++) {
    const pair = pairsToCheck[i];
    const sideAResult = allResults[i * 2];
    const sideBResult = allResults[i * 2 + 1];

    if (!sideAResult || !sideBResult) {
      await log('arbitrage_quote_failed', 'arbitrage', { pair: pair.name }, { error: 'Quote returned null' }, { success: false });
      continue;
    }

    const rateA = sideAResult.ratePerUnit;
    const rateB = sideBResult.ratePerUnit;

    if (rateA > 0 && rateB > 0) {
      const spread = Math.abs(rateA - rateB) / Math.min(rateA, rateB) * 100;

      let direction: string;
      if (rateA < rateB) {
        direction = `${pair.sideB.label} gives better rate (${rateB.toFixed(4)}) — ${pair.sideA.label} is underpriced`;
      } else {
        direction = `${pair.sideA.label} gives better rate (${rateA.toFixed(4)}) — ${pair.sideB.label} is underpriced`;
      }

      const estimatedProfitUSD = Math.round((spread / 100) * 100 * 100) / 100;

      if (spread >= minSpreadPercent) {
        opportunities.push({
          pair: pair.name,
          sideA: { label: sideAResult.label, rate: Math.round(rateA * 10000) / 10000 },
          sideB: { label: sideBResult.label, rate: Math.round(rateB * 10000) / 10000 },
          spreadPercent: Math.round(spread * 100) / 100,
          direction,
          estimatedProfitUSD,
        });
      }
    }
  }

  // Sort by spread (highest first)
  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);

  // Optional Venice analysis
  let analysis: string | undefined;
  if (includeAnalysis && opportunities.length > 0) {
    try {
      const analysisContext = mode === 'stablecoin'
        ? `Analyze these stablecoin arbitrage opportunities on Celo. Consider gas costs (~$0.001 on Celo), pool fees, and execution risk.`
        : `Analyze these cross-chain arbitrage opportunities. Consider bridge costs, gas costs per chain, pool fees, and execution risk.`;
      analysis = await analyzePrivately(
        `${analysisContext} Are any spreads actionable after costs? Be concise (3-4 sentences).\n\n` +
        `Opportunities:\n${JSON.stringify(opportunities, null, 2)}`,
      );
    } catch {
      analysis = 'Venice analysis unavailable';
    }
  }

  const result: DetectArbitrageResult = {
    opportunities,
    pairsChecked: pairsToCheck.length,
    analysis,
    timestamp: new Date().toISOString(),
  };

  await log('detect_arbitrage', 'arbitrage', {
    pairsChecked: pairsToCheck.length,
    minSpreadPercent,
    mode,
    chains: validChainNames,
  }, {
    opportunitiesFound: opportunities.length,
    topSpread: opportunities[0]?.spreadPercent ?? 0,
  });

  return result;
}
