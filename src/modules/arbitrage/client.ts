/**
 * Cross-Chain Arbitrage Detection Client
 *
 * Compares stablecoin exchange rates on Celo via Uniswap quotes
 * to detect peg deviations and cross-stablecoin spread opportunities.
 *
 * All pairs compare the SAME class of asset (stablecoins) so the
 * spread calculation is mathematically meaningful and actionable.
 */

import { getQuote } from '../uniswap/client.js';
import { getAccount, TOKENS, QUOTE_CHAINS, QUOTE_TOKENS, DEFAULT_CROSS_CHAIN_CHAINS } from '../../config.js';
import type { ChainName } from '../../config.js';
import type { Address } from 'viem';
import { parseUnits } from 'viem';

export interface QuoteSide {
  label: string;
  chain: ChainName;
  token: Address;
  quoteToken: Address;
  amount: string;
  inputDecimals: number;
  outputDecimals: number;
}

export interface ComparablePair {
  name: string;
  description: string;
  sideA: QuoteSide;
  sideB: QuoteSide;
}

export interface QuoteRateResult {
  label: string;
  chain: ChainName;
  ratePerUnit: number;
  routing: string;
}

export interface ArbitrageOpportunity {
  pair: string;
  sideA: { label: string; rate: number };
  sideB: { label: string; rate: number };
  spreadPercent: number;
  direction: string;
  estimatedProfitUSD: number;
}

/**
 * Get the exchange rate per unit for a quote side.
 * Returns how many output tokens you get per 1 input token.
 */
export async function getQuoteRate(side: QuoteSide): Promise<QuoteRateResult> {
  const account = getAccount();

  const quote = await getQuote(side.token, side.quoteToken, side.amount, account.address, side.chain);

  const outputAmount = quote.quote.output?.amount || quote.quote.orderInfo?.outputs?.[0]?.startAmount || '0';

  const outputValue = Number(outputAmount) / Math.pow(10, side.outputDecimals);
  const inputValue = Number(side.amount) / Math.pow(10, side.inputDecimals);
  const ratePerUnit = inputValue > 0 ? outputValue / inputValue : 0;

  return {
    label: side.label,
    chain: side.chain,
    ratePerUnit,
    routing: quote.routing,
  };
}

/**
 * Get comparable stablecoin pairs for arbitrage detection.
 *
 * Each pair compares two rates that SHOULD be equal (or near-equal).
 * Deviations represent real, actionable spread opportunities.
 */
export function getComparablePairs(): ComparablePair[] {
  return [
    {
      name: 'cUSD/USDC peg (Celo)',
      description: 'cUSD should trade 1:1 with USDC. Compares forward and reverse rates to detect peg deviation.',
      sideA: {
        label: 'cUSD→USDC',
        chain: 'celo',
        token: TOKENS.celo.cUSD as Address,
        quoteToken: TOKENS.celo.USDC as Address,
        amount: parseUnits('10', 18).toString(), // 10 cUSD
        inputDecimals: 18,
        outputDecimals: 6,
      },
      sideB: {
        label: 'USDC→cUSD',
        chain: 'celo',
        token: TOKENS.celo.USDC as Address,
        quoteToken: TOKENS.celo.cUSD as Address,
        amount: parseUnits('10', 6).toString(), // 10 USDC
        inputDecimals: 6,
        outputDecimals: 18,
      },
    },
    {
      name: 'USDT/USDC peg (Celo)',
      description: 'USDT should trade 1:1 with USDC. Monitors Tether peg health on Celo DEXes.',
      sideA: {
        label: 'USDT→USDC',
        chain: 'celo',
        token: TOKENS.celo.USDT as Address,
        quoteToken: TOKENS.celo.USDC as Address,
        amount: parseUnits('10', 6).toString(), // 10 USDT
        inputDecimals: 6,
        outputDecimals: 6,
      },
      sideB: {
        label: 'USDC→USDT',
        chain: 'celo',
        token: TOKENS.celo.USDC as Address,
        quoteToken: TOKENS.celo.USDT as Address,
        amount: parseUnits('10', 6).toString(), // 10 USDC
        inputDecimals: 6,
        outputDecimals: 6,
      },
    },
    {
      name: 'cUSD vs USDT (Celo)',
      description: 'Compares cUSD and USDT effective rates against USDC. If one is cheaper, buy it and sell the other via USDC.',
      sideA: {
        label: 'cUSD→USDC',
        chain: 'celo',
        token: TOKENS.celo.cUSD as Address,
        quoteToken: TOKENS.celo.USDC as Address,
        amount: parseUnits('10', 18).toString(), // 10 cUSD
        inputDecimals: 18,
        outputDecimals: 6,
      },
      sideB: {
        label: 'USDT→USDC',
        chain: 'celo',
        token: TOKENS.celo.USDT as Address,
        quoteToken: TOKENS.celo.USDC as Address,
        amount: parseUnits('10', 6).toString(), // 10 USDT
        inputDecimals: 6,
        outputDecimals: 6,
      },
    },
  ];
}

/**
 * Generate cross-chain USDC→WETH pairs for arbitrage detection.
 * Compares effective WETH price across chains — rate difference = arbitrage signal.
 */
export function getCrossChainPairs(chains?: ChainName[]): ComparablePair[] {
  const selectedChains = chains || DEFAULT_CROSS_CHAIN_CHAINS;
  const pairs: ComparablePair[] = [];

  for (let i = 0; i < selectedChains.length; i++) {
    for (let j = i + 1; j < selectedChains.length; j++) {
      const chainA = selectedChains[i];
      const chainB = selectedChains[j];
      const tokensA = QUOTE_TOKENS[chainA];
      const tokensB = QUOTE_TOKENS[chainB];

      pairs.push({
        name: `WETH price: ${QUOTE_CHAINS[chainA].name} vs ${QUOTE_CHAINS[chainB].name}`,
        description: `Compare USDC→WETH rate on ${QUOTE_CHAINS[chainA].name} vs ${QUOTE_CHAINS[chainB].name}. Rate difference = cross-chain arbitrage signal.`,
        sideA: {
          label: `USDC→WETH (${QUOTE_CHAINS[chainA].name})`,
          chain: chainA,
          token: tokensA.USDC.address as Address,
          quoteToken: tokensA.WETH.address as Address,
          amount: parseUnits('100', tokensA.USDC.decimals).toString(),
          inputDecimals: tokensA.USDC.decimals,
          outputDecimals: tokensA.WETH.decimals,
        },
        sideB: {
          label: `USDC→WETH (${QUOTE_CHAINS[chainB].name})`,
          chain: chainB,
          token: tokensB.USDC.address as Address,
          quoteToken: tokensB.WETH.address as Address,
          amount: parseUnits('100', tokensB.USDC.decimals).toString(),
          inputDecimals: tokensB.USDC.decimals,
          outputDecimals: tokensB.WETH.decimals,
        },
      });
    }
  }

  return pairs;
}
