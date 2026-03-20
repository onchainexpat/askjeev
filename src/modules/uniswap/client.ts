import { UNISWAP_API_BASE, UNISWAP_API_KEY, CHAINS, QUOTE_CHAINS, getWalletClient, getAccount } from '../../config.js';
import type { ChainName, WalletChainName } from '../../config.js';
import type { Address } from 'viem';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': UNISWAP_API_KEY,
  'x-universal-router-version': '2.0',
};

export interface SwapQuote {
  routing: 'CLASSIC' | 'DUTCH_V2' | 'PRIORITY';
  quote: Record<string, any>;
  permitData?: {
    domain: Record<string, any>;
    types: Record<string, any>;
    values: Record<string, any>;
  };
  [key: string]: any;
}

export interface SwapResult {
  txHash: string;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  routing: string;
}

/**
 * Check if a token approval is needed for Permit2.
 */
export async function checkApproval(
  token: Address,
  amount: string,
  walletAddress: Address,
  chain: WalletChainName = 'base',
): Promise<{ approvalNeeded: boolean; tx?: Record<string, any> }> {
  const res = await fetch(`${UNISWAP_API_BASE}/check_approval`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      walletAddress,
      token,
      amount,
      chainId: Number(CHAINS[chain].chainId),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`check_approval failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    approvalNeeded: data.approval !== null,
    tx: data.approval ?? undefined,
  };
}

/**
 * Get a swap quote from Uniswap Trading API.
 */
export async function getQuote(
  tokenIn: Address,
  tokenOut: Address,
  amount: string,
  swapper: Address,
  chain: ChainName = 'base',
): Promise<SwapQuote> {
  const chainId = QUOTE_CHAINS[chain].chainId;
  const res = await fetch(`${UNISWAP_API_BASE}/quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      swapper,
      tokenIn,
      tokenOut,
      tokenInChainId: chainId,
      tokenOutChainId: chainId,
      amount,
      type: 'EXACT_INPUT',
      slippageTolerance: 0.5,
      routingPreference: 'BEST_PRICE',
      urgency: 'normal',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`quote failed (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Execute a swap: sign the Permit2 message, submit to /swap, broadcast tx.
 */
export async function executeSwap(quoteResponse: SwapQuote): Promise<SwapResult> {
  const wallet = getWalletClient();
  const account = getAccount();

  // Sign the Permit2 typed data if present
  let signature: string | undefined;
  if (quoteResponse.permitData) {
    const { domain, types, values } = quoteResponse.permitData;
    // Find the primary type (not EIP712Domain)
    const primaryType = Object.keys(types).find((k) => k !== 'EIP712Domain')!;
    signature = await wallet.signTypedData({
      account,
      domain,
      types,
      primaryType,
      message: values,
    });
  }

  // Build the /swap request
  const { permitData, ...cleanQuote } = quoteResponse;
  const swapRequest: Record<string, any> = { ...cleanQuote };

  if (quoteResponse.routing === 'CLASSIC') {
    // Classic: include both signature and permitData
    if (signature && permitData) {
      swapRequest.signature = signature;
      swapRequest.permitData = permitData;
    }
  } else {
    // UniswapX (DUTCH_V2/PRIORITY): only signature, NO permitData
    if (signature) {
      swapRequest.signature = signature;
    }
  }

  const res = await fetch(`${UNISWAP_API_BASE}/swap`, {
    method: 'POST',
    headers,
    body: JSON.stringify(swapRequest),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`swap failed (${res.status}): ${err}`);
  }

  const swapData = await res.json();

  if (quoteResponse.routing === 'CLASSIC') {
    // Broadcast the transaction
    const txHash = await wallet.sendTransaction({
      account,
      to: swapData.swap.to as Address,
      data: swapData.swap.data as `0x${string}`,
      value: BigInt(swapData.swap.value || '0'),
      chain: undefined,
    });

    return {
      txHash,
      amountIn: quoteResponse.quote.input?.amount || 'unknown',
      amountOut: quoteResponse.quote.output?.amount || 'unknown',
      tokenIn: quoteResponse.quote.input?.token || 'unknown',
      tokenOut: quoteResponse.quote.output?.token || 'unknown',
      routing: quoteResponse.routing,
    };
  } else {
    // UniswapX order submitted to filler network
    return {
      txHash: swapData.orderId || 'pending-uniswapx',
      amountIn: quoteResponse.quote.orderInfo?.input?.startAmount || 'unknown',
      amountOut: quoteResponse.quote.orderInfo?.outputs?.[0]?.startAmount || 'unknown',
      tokenIn: quoteResponse.quote.orderInfo?.input?.token || 'unknown',
      tokenOut: quoteResponse.quote.orderInfo?.outputs?.[0]?.token || 'unknown',
      routing: quoteResponse.routing,
    };
  }
}

/**
 * Check ERC20 token balance.
 */
export async function getTokenBalance(token: Address, wallet: Address, chain: WalletChainName = 'base'): Promise<string> {
  const { getPublicClient } = await import('../../config.js');
  const client = getPublicClient(chain);

  if (token === '0x0000000000000000000000000000000000000000') {
    const balance = await client.getBalance({ address: wallet });
    return balance.toString();
  }

  const balance = await client.readContract({
    address: token,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [wallet],
  });

  return (balance as bigint).toString();
}
