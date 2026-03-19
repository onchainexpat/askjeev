import { handle } from 'hono/vercel';
import { createRoutes } from '../src/modules/x402-service/routes.js';

export const config = {
  runtime: 'nodejs',
};

const deployedUrl = process.env.DEPLOYED_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network';
const NETWORK = (process.env.X402_NETWORK || 'eip155:8453') as `${string}:${string}`;
const DEV_SKIP_PAYMENT = process.env.DEV_SKIP_PAYMENT === 'true';

const app = createRoutes(deployedUrl, {
  facilitatorUrl: FACILITATOR_URL,
  network: NETWORK,
  skipPayment: DEV_SKIP_PAYMENT,
});

export default handle(app);
