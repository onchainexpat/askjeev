import { z } from 'zod';
import { checkApproval, getQuote, executeSwap, getTokenBalance } from './client.js';
import { getAccount, TOKENS } from '../../config.js';
import { log } from '../identity/logger.js';
import type { Address } from 'viem';

export const uniswapTools = {
  get_swap_quote: {
    description: 'Get a swap quote from Uniswap on Base without executing. Returns pricing, route, and gas estimate.',
    schema: z.object({
      tokenIn: z.string().describe('Input token address (use 0x0000...0000 for native ETH)'),
      tokenOut: z.string().describe('Output token address'),
      amount: z.string().describe('Amount in smallest unit (wei for ETH, 6 decimals for USDC)'),
    }),
    handler: async ({ tokenIn, tokenOut, amount }: { tokenIn: string; tokenOut: string; amount: string }) => {
      const account = getAccount();
      const quote = await getQuote(tokenIn as Address, tokenOut as Address, amount, account.address);

      const result = {
        routing: quote.routing,
        amountIn: quote.quote.input?.amount || quote.quote.orderInfo?.input?.startAmount,
        amountOut: quote.quote.output?.amount || quote.quote.orderInfo?.outputs?.[0]?.startAmount,
        gasFeeUSD: quote.quote.gasFeeUSD || 'gasless (UniswapX)',
        priceImpact: quote.quote.priceImpact,
        hasPermit2: !!quote.permitData,
      };

      await log('swap_quoted', 'get_swap_quote', { tokenIn, tokenOut, amount }, result);
      return result;
    },
  },

  execute_swap: {
    description: 'Execute a token swap on Uniswap (Base). Returns transaction hash on BaseScan.',
    schema: z.object({
      tokenIn: z.string().describe('Input token address'),
      tokenOut: z.string().describe('Output token address'),
      amount: z.string().describe('Amount in smallest unit'),
    }),
    handler: async ({ tokenIn, tokenOut, amount }: { tokenIn: string; tokenOut: string; amount: string }) => {
      const account = getAccount();

      // Check approval first
      if (tokenIn !== TOKENS.ETH) {
        const approval = await checkApproval(tokenIn as Address, amount, account.address);
        if (approval.approvalNeeded && approval.tx) {
          const { getWalletClient } = await import('../../config.js');
          const wallet = getWalletClient();
          await wallet.sendTransaction({
            account,
            to: approval.tx.to as Address,
            data: approval.tx.data as `0x${string}`,
            value: BigInt(approval.tx.value || '0'),
            chain: undefined,
          });
        }
      }

      // Get quote and execute
      const quote = await getQuote(tokenIn as Address, tokenOut as Address, amount, account.address);
      const result = await executeSwap(quote);

      await log('swap_executed', 'execute_swap', { tokenIn, tokenOut, amount }, {
        txHash: result.txHash,
        amountOut: result.amountOut,
        routing: result.routing,
        basescanUrl: `https://basescan.org/tx/${result.txHash}`,
      });

      return result;
    },
  },

  check_token_balance: {
    description: 'Check token balance for the agent wallet on Base.',
    schema: z.object({
      token: z.string().optional().describe('Token address (defaults to ETH)'),
    }),
    handler: async ({ token }: { token?: string }) => {
      const account = getAccount();
      const tokenAddr = (token || TOKENS.ETH) as Address;
      const balance = await getTokenBalance(tokenAddr, account.address);

      await log('balance_checked', 'check_token_balance', { token: tokenAddr }, { balance });
      return { token: tokenAddr, balance, wallet: account.address };
    },
  },
};
