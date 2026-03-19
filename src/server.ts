import { serve } from '@hono/node-server';
import { createRoutes } from './modules/x402-service/routes.js';
import { SERVER_PORT } from './config.js';

const deployedUrl = process.env.DEPLOYED_URL;
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network';
const NETWORK = (process.env.X402_NETWORK || 'eip155:8453') as `${string}:${string}`;
const DEV_SKIP_PAYMENT = process.env.DEV_SKIP_PAYMENT === 'true';

const app = createRoutes(deployedUrl, {
  facilitatorUrl: FACILITATOR_URL,
  network: NETWORK,
  skipPayment: DEV_SKIP_PAYMENT,
});

serve({
  fetch: app.fetch,
  port: SERVER_PORT,
}, (info) => {
  console.log(`AskJeev service running on port ${info.port}`);
  console.log(`  Mode:       ${DEV_SKIP_PAYMENT ? 'DEV (no payment)' : 'LIVE (x402 payments)'}`);
  console.log(`  Facilitator: ${FACILITATOR_URL}`);
  console.log(`  Network:    ${NETWORK}`);
  console.log(`  Health:     http://localhost:${info.port}/health`);
  console.log(`  Discovery:  http://localhost:${info.port}/.well-known/x402`);
  console.log(`  Agent JSON: http://localhost:${info.port}/agent.json`);
});
