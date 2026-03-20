/**
 * Portfolio Rebalance Service
 *
 * Venice-analyzed portfolio rebalancing with optional swap execution.
 * dryRun=true (default) returns plan only. dryRun=false executes real swaps.
 */

import { getCurrentAllocations, computeRebalanceSwaps, fetchLivePrices } from './client.js';
import type { RebalanceTarget, RebalanceSwap, PortfolioState } from './client.js';
import { analyzePrivately } from '../venice/client.js';
import { getQuote, executeSwap, checkApproval } from '../uniswap/client.js';
import { getAccount, getWalletClient, TOKENS } from '../../config.js';
import { log } from '../identity/logger.js';
import type { Address } from 'viem';
import { parseUnits, parseEther } from 'viem';

export interface RebalanceParams {
  targets: RebalanceTarget[];
  dryRun?: boolean;
  maxSlippage?: number;
}

export interface RebalanceResult {
  portfolio: PortfolioState;
  swaps: RebalanceSwap[];
  analysis: string;
  executed: boolean;
  transactions: string[];
}

// Map symbols to token addresses and chains for swap execution
const TOKEN_MAP: Record<string, { address: Address; chain: 'base' | 'celo'; decimals: number }> = {
  'ETH': { address: TOKENS.base.ETH as Address, chain: 'base', decimals: 18 },
  'USDC (Base)': { address: TOKENS.base.USDC as Address, chain: 'base', decimals: 6 },
  'CELO': { address: '0x0000000000000000000000000000000000000000' as Address, chain: 'celo', decimals: 18 },
  'cUSD': { address: TOKENS.celo.cUSD as Address, chain: 'celo', decimals: 18 },
  'USDC (Celo)': { address: TOKENS.celo.USDC as Address, chain: 'celo', decimals: 6 },
};

/**
 * Full portfolio rebalance: analyze, plan, and optionally execute.
 */
export async function rebalancePortfolio(params: RebalanceParams): Promise<RebalanceResult> {
  const { targets, dryRun = true, maxSlippage = 0.5 } = params;

  // Step 1: Get current allocations
  const portfolio = await getCurrentAllocations();

  // Step 2: Compute required swaps
  const swaps = computeRebalanceSwaps(portfolio.allocations, targets, portfolio.totalValueUSD);

  // Step 3: Venice analysis (private — zero retention)
  let analysis: string;
  try {
    analysis = await analyzePrivately(
      `Analyze this portfolio rebalance plan. Consider gas costs, slippage, and whether the trades make sense. ` +
      `Be concise (3-4 sentences).\n\n` +
      `Current portfolio ($${portfolio.totalValueUSD.toFixed(2)} total):\n` +
      portfolio.allocations.map((a) => `  ${a.symbol}: ${a.balanceFormatted} ($${a.valueUSD.toFixed(2)}, ${a.percentOfTotal}%)`).join('\n') +
      `\n\nTargets:\n` +
      targets.map((t) => `  ${t.symbol}: ${t.targetPercent}%`).join('\n') +
      `\n\nPlanned swaps:\n` +
      (swaps.length > 0 ? swaps.map((s) => `  ${s.from} → ${s.to}: $${s.amountUSD}`).join('\n') : '  No swaps needed'),
    );
  } catch {
    analysis = 'Venice analysis unavailable — proceed with caution';
  }

  // Step 4: Execute swaps if dryRun=false
  const transactions: string[] = [];
  if (!dryRun && swaps.length > 0) {
    const account = getAccount();

    for (const swap of swaps) {
      try {
        const fromToken = TOKEN_MAP[swap.from];
        const toToken = TOKEN_MAP[swap.to];

        if (!fromToken || !toToken) {
          await log('rebalance_swap_skipped', 'rebalance', { from: swap.from, to: swap.to }, { reason: 'Unknown token' });
          continue;
        }

        // Can only swap on same chain
        if (fromToken.chain !== toToken.chain) {
          await log('rebalance_swap_skipped', 'rebalance', { from: swap.from, to: swap.to }, { reason: 'Cross-chain swap not yet supported' });
          continue;
        }

        // Convert USD amount to token amount using live prices
        const prices = await fetchLivePrices();
        const fromSymbol = swap.from.replace(' (Base)', '').replace(' (Celo)', '');
        const priceEstimate = prices[fromSymbol] || 1;
        const tokenAmount = swap.amountUSD / priceEstimate;

        let amount: string;
        if (fromToken.decimals === 18) {
          amount = parseEther(tokenAmount.toFixed(18)).toString();
        } else {
          amount = parseUnits(tokenAmount.toFixed(fromToken.decimals), fromToken.decimals).toString();
        }

        // Check approval if not native token
        if (fromToken.address !== '0x0000000000000000000000000000000000000000') {
          const approval = await checkApproval(fromToken.address, amount, account.address);
          if (approval.approvalNeeded && approval.tx) {
            const wallet = getWalletClient(fromToken.chain);
            const approveTx = await wallet.sendTransaction({
              account,
              to: approval.tx.to as Address,
              data: approval.tx.data as `0x${string}`,
              value: BigInt(approval.tx.value || '0'),
              chain: undefined,
            });
            transactions.push(approveTx);
          }
        }

        // Get quote and execute
        const quote = await getQuote(fromToken.address, toToken.address, amount, account.address, fromToken.chain);
        const result = await executeSwap(quote);
        transactions.push(result.txHash);

        await log('rebalance_swap_executed', 'rebalance', {
          from: swap.from,
          to: swap.to,
          amountUSD: swap.amountUSD,
        }, {
          txHash: result.txHash,
          routing: result.routing,
        });
      } catch (err: any) {
        await log('rebalance_swap_failed', 'rebalance', {
          from: swap.from,
          to: swap.to,
        }, { error: err.message }, { success: false });
      }
    }
  }

  const result: RebalanceResult = {
    portfolio,
    swaps,
    analysis,
    executed: !dryRun,
    transactions,
  };

  await log('rebalance_complete', 'rebalance', {
    targetCount: targets.length,
    dryRun,
    swapCount: swaps.length,
  }, {
    totalValueUSD: portfolio.totalValueUSD,
    transactionCount: transactions.length,
    executed: !dryRun,
  });

  return result;
}
