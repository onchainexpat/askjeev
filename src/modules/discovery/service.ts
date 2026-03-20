/**
 * x402 Service Discovery — Venice-Ranked Search
 *
 * Aggregates results from x402scan.com and direct manifest fetches,
 * then uses Venice AI to rank and assess relevance.
 */

import { queryX402Scan, fetchX402Manifest } from './client.js';
import type { X402Service, X402ScanResult } from './client.js';
import { analyzePrivately } from '../venice/client.js';
import { log } from '../identity/logger.js';

export interface DiscoverParams {
  query: string;
  chain?: string;
  priceMax?: string;
  category?: string;
  limit?: number;
}

export interface DiscoverResult {
  services: RankedService[];
  totalFound: number;
  query: string;
  rankedBy: string;
}

export interface RankedService {
  domain: string;
  name?: string;
  description?: string;
  endpoints: Array<{
    path: string;
    method: string;
    price: string;
    currency?: string;
    description?: string;
  }>;
  chains?: string[];
  relevanceScore?: number;
  assessment?: string;
}

/**
 * Discover x402 services: search, fetch manifests, rank with Venice.
 */
export async function discoverServices(params: DiscoverParams): Promise<DiscoverResult> {
  const { query, chain, priceMax, category, limit = 10 } = params;

  // Step 1: Search x402scan.com
  const scanResults = await queryX402Scan(query, { chain, category });

  // Step 2: Fetch manifests for discovered domains (parallel, with timeout)
  const manifestPromises = scanResults.slice(0, 15).map(async (result: X402ScanResult) => {
    const manifest = await fetchX402Manifest(result.domain);
    if (manifest) return manifest;
    // Return a stub if manifest fetch fails
    return {
      domain: result.domain,
      name: result.name,
      description: result.description,
      endpoints: [],
      chains: result.chains,
      fetchedAt: new Date().toISOString(),
    } as X402Service;
  });

  const services = await Promise.all(manifestPromises);

  // Step 3: Filter by price if specified
  let filtered = services;
  if (priceMax) {
    const maxPrice = parseFloat(priceMax.replace('$', ''));
    filtered = services.filter((s) =>
      s.endpoints.length === 0 ||
      s.endpoints.some((e) => {
        const price = parseFloat(e.price.replace('$', ''));
        return isNaN(price) || price <= maxPrice;
      }),
    );
  }

  // Step 4: Rank with Venice AI
  let ranked: RankedService[];
  try {
    const servicesSummary = filtered.map((s) => ({
      domain: s.domain,
      name: s.name,
      description: s.description,
      endpointCount: s.endpoints.length,
      endpoints: s.endpoints.slice(0, 3).map((e) => `${e.method} ${e.path} (${e.price})`),
      chains: s.chains,
    }));

    const ranking = await analyzePrivately(
      `Rank these x402 services by relevance to the query "${query}". ` +
      `Return a JSON array of objects with fields: domain, relevanceScore (0-100), assessment (one sentence). ` +
      `Only return the JSON array, no other text.\n\nServices:\n${JSON.stringify(servicesSummary, null, 2)}`,
    );

    // Parse Venice's ranking
    const jsonMatch = ranking.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const rankings = JSON.parse(jsonMatch[0]) as Array<{ domain: string; relevanceScore: number; assessment: string }>;
      const rankMap = new Map(rankings.map((r) => [r.domain, r]));

      ranked = filtered
        .map((s) => {
          const rank = rankMap.get(s.domain);
          return {
            domain: s.domain,
            name: s.name,
            description: s.description,
            endpoints: s.endpoints,
            chains: s.chains,
            relevanceScore: rank?.relevanceScore ?? 50,
            assessment: rank?.assessment,
          };
        })
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } else {
      ranked = filtered.map((s) => ({ ...s, relevanceScore: 50 }));
    }
  } catch {
    // Venice unavailable — return unranked
    ranked = filtered.map((s) => ({ ...s, relevanceScore: 50 }));
  }

  const result: DiscoverResult = {
    services: ranked.slice(0, limit),
    totalFound: scanResults.length,
    query,
    rankedBy: 'venice-ai',
  };

  await log('discover_services', 'discovery', {
    query,
    chain,
    priceMax,
    category,
  }, {
    totalFound: result.totalFound,
    returned: result.services.length,
  });

  return result;
}
