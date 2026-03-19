import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRoutes } from '../src/modules/x402-service/routes.js';

export const config = {
  maxDuration: 30,
};

const deployedUrl = process.env.DEPLOYED_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network';
const NETWORK = (process.env.X402_NETWORK || 'eip155:8453') as `${string}:${string}`;
const DEV_SKIP_PAYMENT = process.env.DEV_SKIP_PAYMENT?.trim() === 'true';

let appPromise: ReturnType<typeof createRoutes> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createRoutes(deployedUrl, {
      facilitatorUrl: FACILITATOR_URL,
      network: NETWORK,
      skipPayment: DEV_SKIP_PAYMENT,
    });
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();

    // Build a Request object from the Vercel request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    // Read body for non-GET requests
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body,
    });

    const response = await app.fetch(request);

    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);

    const responseBody = await response.text();
    res.send(responseBody);
  } catch (err: any) {
    console.error('Handler error:', err.message, err.stack);
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
}
