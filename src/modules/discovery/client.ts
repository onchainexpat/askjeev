/**
 * x402 Service Discovery Client
 *
 * Queries x402scan.com and fetches .well-known/x402 manifests to discover
 * paid agent services across the ecosystem. The Google of the agent economy.
 */

export interface X402Service {
  domain: string;
  name?: string;
  description?: string;
  endpoints: X402Endpoint[];
  chains?: string[];
  fetchedAt: string;
}

export interface X402Endpoint {
  path: string;
  method: string;
  price: string;
  currency?: string;
  description?: string;
}

export interface X402ScanResult {
  domain: string;
  name?: string;
  description?: string;
  chains?: string[];
  url?: string;
}

/**
 * Query x402scan.com for services matching a search query.
 * Falls back to a curated list if x402scan.com is unavailable.
 */
export async function queryX402Scan(
  query: string,
  filters?: { chain?: string; category?: string },
): Promise<X402ScanResult[]> {
  try {
    const params = new URLSearchParams({ q: query });
    if (filters?.chain) params.set('chain', filters.chain);
    if (filters?.category) params.set('category', filters.category);

    const res = await fetch(`https://x402scan.com/api/search?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      // x402scan may return { services: [...] } or [...]
      const services = Array.isArray(data) ? data : data.services || data.results || [];
      return services.map((s: any) => ({
        domain: s.domain || s.url || s.endpoint,
        name: s.name,
        description: s.description,
        chains: s.chains || s.supportedChains,
        url: s.url,
      }));
    }
  } catch {
    // x402scan.com unreachable — fall through to curated list
  }

  // Curated directory: known x402-compatible services in the ecosystem
  const curated: X402ScanResult[] = [
    // Verified x402 services
    { domain: 'x402.onchainexpat.com', name: 'OnChainExpat', description: 'Blockchain analysis, transaction insights, and wallet profiling via x402', chains: ['base'] },
    { domain: 'api.bankr.bot', name: 'Bankr LLM Gateway', description: 'Multi-model LLM inference (20+ models) paid with USDC credits', chains: ['base'] },
    { domain: 'synthesis-hackathon-beta.vercel.app', name: 'AskJeev', description: 'Autonomous agent butler — token swaps, private analysis, arbitrage detection, portfolio rebalancing', chains: ['base', 'celo'] },
    // x402 ecosystem infrastructure
    { domain: 'payai.network', name: 'PayAI Network', description: 'x402 facilitator network for agent-to-agent payment settlement', chains: ['base'] },
    { domain: 'rpc.payai.network', name: 'PayAI RPC', description: 'Metered RPC endpoints with x402 billing — pay per request', chains: ['base', 'celo'] },
    { domain: 'mcp.payai.network', name: 'PayAI MCP Hub', description: 'Directory of MCP-compatible agent tools with x402 payment integration', chains: ['base'] },
    // DeFi data services
    { domain: 'api.defined.fi', name: 'Defined.fi', description: 'Real-time token prices, DEX analytics, and chart data API', chains: ['base', 'celo'] },
    { domain: 'api.reservoir.tools', name: 'Reservoir', description: 'NFT market data, trading, and liquidity aggregation API', chains: ['base'] },
    { domain: 'api.covalenthq.com', name: 'Covalent', description: 'Unified blockchain data API — balances, transactions, token holders', chains: ['base', 'celo'] },
    // Cross-chain infrastructure
    { domain: 'api.across.to', name: 'Across Protocol', description: 'Cross-chain bridge quotes and fast transaction relay', chains: ['base', 'celo', 'ethereum'] },
    // Identity & trust
    { domain: 'api.self.xyz', name: 'Self Protocol', description: 'Agent identity verification via Soulbound credentials on Celo', chains: ['celo'] },
    // AI & privacy
    { domain: 'venice.ai', name: 'Venice AI', description: 'Privacy-preserving AI inference with zero data retention', chains: ['base'] },
  ];

  const q = query.toLowerCase();
  return curated.filter(
    (s) =>
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q),
  );
}

/**
 * Fetch the x402 discovery manifest from a domain.
 * Tries .well-known/x402 first, then /x402-discovery as fallback.
 */
export async function fetchX402Manifest(domain: string): Promise<X402Service | null> {
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  const paths = ['/.well-known/x402', '/x402-discovery'];

  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          domain,
          name: data.agent || data.name,
          description: data.description,
          endpoints: (data.endpoints || []).map((e: any) => ({
            path: e.path,
            method: e.method || 'POST',
            price: e.price || 'unknown',
            currency: e.currency,
            description: e.description,
          })),
          chains: data.supportedChains || data.chains,
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Try next path
    }
  }

  return null;
}
