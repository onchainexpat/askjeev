export const config = { runtime: 'nodejs' };

export default function handler(req: any, res: any) {
  res.status(200).json({
    ok: true,
    env: {
      hasPrivateKey: !!process.env.PRIVATE_KEY,
      hasVeniceKey: !!process.env.VENICE_API_KEY,
      hasUniswapKey: !!process.env.UNISWAP_API_KEY,
      devSkipPayment: process.env.DEV_SKIP_PAYMENT,
      nodeVersion: process.version,
    },
  });
}
