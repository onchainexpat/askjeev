import type { MiddlewareHandler, Context } from 'hono';

/**
 * Self Agent ID verification middleware for Hono.
 *
 * Verifies that incoming requests are from human-backed agents
 * using Self Protocol's ZK-powered identity primitive on Celo.
 *
 * When enabled, x402 endpoints require both:
 * 1. x402 payment (USDC on Base)
 * 2. Self Agent ID verification (proof-of-human on Celo)
 *
 * Headers required from callers:
 * - x-self-agent-address: Agent's Ethereum address
 * - x-self-agent-signature: Signed request hash
 * - x-self-agent-timestamp: Unix timestamp (ms)
 */
export function selfAgentAuth(options: {
  network?: 'mainnet' | 'testnet';
  required?: boolean;
} = {}): MiddlewareHandler {
  const { network = 'mainnet', required = false } = options;
  let verifier: any = null;

  return async (c: Context, next) => {
    const signature = c.req.header('x-self-agent-signature');
    const timestamp = c.req.header('x-self-agent-timestamp');

    // If no Self headers and not required, skip (let x402 handle auth)
    if (!signature || !timestamp) {
      if (required) {
        return c.json({
          error: 'Self Agent ID verification required. Include x-self-agent-* headers.',
          docs: 'https://docs.self.xyz/agent-id',
        }, 401);
      }
      await next();
      return;
    }

    // Lazy-load verifier to avoid import overhead when not needed
    if (!verifier) {
      try {
        const { SelfAgentVerifier } = await import('@selfxyz/agent-sdk');
        verifier = SelfAgentVerifier.create()
          .network(network)
          .sybilLimit(3)
          .rateLimit({ perMinute: 30 })
          .build();
      } catch (err: any) {
        console.error('Self SDK init error:', err.message);
        // If SDK fails to load, skip verification gracefully
        await next();
        return;
      }
    }

    // Read raw body for signature verification
    const rawBody = await c.req.text();
    c.set('rawBody', rawBody);

    try {
      const url = new URL(c.req.url);
      const result = await verifier.verify({
        signature,
        timestamp,
        method: c.req.method,
        url: url.pathname + url.search,
        body: rawBody || undefined,
        keytype: c.req.header('x-self-agent-keytype'),
        agentKey: c.req.header('x-self-agent-key'),
      });

      if (!result.valid) {
        const status = result.retryAfterMs ? 429 : 401;
        return c.json({
          error: result.error || 'Self Agent ID verification failed',
          ...(result.retryAfterMs && { retryAfterMs: result.retryAfterMs }),
        }, status);
      }

      // Attach verified agent info to context (enriched)
      c.set('selfAgent', {
        address: result.agentAddress,
        agentId: result.agentId,
        agentCount: result.agentCount,
        verified: true,
        isProofFresh: result.isProofFresh ?? true,
        proofExpiresAt: result.proofExpiresAt ?? null,
        daysUntilExpiry: result.daysUntilExpiry ?? null,
      });
    } catch (err: any) {
      console.error('Self verification error:', err.message);
      if (required) {
        return c.json({ error: 'Self verification failed: ' + err.message }, 401);
      }
    }

    await next();
  };
}
