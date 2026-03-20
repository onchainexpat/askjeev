# AskJeev — Autonomous Agent Butler

## What This Agent Does

AskJeev is an autonomous economic agent on Base that demonstrates a complete self-sustaining loop:

**Earn** → **Detect** → **Swap** → **Think** → **Serve** → **Repeat**

1. **Earns USDC** by hosting paid x402 API services (swap quotes, arbitrage detection, private analysis, multi-model reasoning)
2. **Detects cross-chain arbitrage** across 10 chains by comparing USDC→WETH rates via Uniswap Trading API (Ethereum, Base, Arbitrum, Polygon, Optimism, Celo, BNB, Avalanche, Blast, World Chain)
3. **Swaps tokens** via Uniswap Trading API when it needs a different asset
4. **Thinks privately** using Venice AI for sensitive financial data (zero data retention)
5. **Thinks generally** using Bankr LLM Gateway (20+ models, paid with USDC)
6. **Serves other agents** through discoverable x402 endpoints

## How to Interact

### As an Agent (x402)
```bash
# Discover AskJeev's services
curl https://[DEPLOYED_URL]/.well-known/x402

# Get a swap quote (pay $0.005 USDC via x402)
curl -X POST https://[DEPLOYED_URL]/api/swap-quote \
  -H "Content-Type: application/json" \
  -d '{"tokenIn": "0x0000000000000000000000000000000000000000", "tokenOut": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "amount": "1000000000000000"}'

# Private financial analysis (pay $0.02 USDC via x402)
curl -X POST https://[DEPLOYED_URL]/api/private-analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Analyze this DeFi position for risk"}'

# General reasoning (pay $0.01 USDC via x402)
curl -X POST https://[DEPLOYED_URL]/api/ask \
  -d '{"prompt": "What is the current gas price trend on Base?"}'

# Cross-chain arbitrage detection (pay $0.01 USDC via x402)
curl -X POST https://[DEPLOYED_URL]/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"mode": "cross-chain", "chains": ["ethereum", "base", "arbitrum"], "minSpreadPercent": 0.1}'

# Full arbitrage scan — stablecoins + cross-chain (pay $0.01 USDC via x402)
curl -X POST https://[DEPLOYED_URL]/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"mode": "all"}'
```

### As a Judge
- **Health check:** `GET /health`
- **ERC-8004 manifest:** `GET /agent.json`
- **Service discovery:** `GET /.well-known/x402`
- All `/api/*` endpoints accept x402 payments in USDC on Base

## Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js + TypeScript | Core execution |
| Blockchain | Base + 9 chains via viem | On-chain operations (quotes on 10 chains, txns on Base/Celo) |
| Payments | x402 protocol (x402-wallet-mcp) | Autonomous service payments |
| Swaps | Uniswap Trading API | Token exchange with real TxIDs |
| Private AI | Venice AI | Zero-retention financial reasoning |
| General AI | Bankr LLM Gateway | 20+ models, USDC-funded inference |
| Identity | ERC-8004 | Verifiable on-chain agent identity |
| Server | Hono | x402 service endpoints |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   AskJeev Agent                      │
│            (autonomous economic loop)                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  EARN           SWAP            THINK                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ x402     │   │ Uniswap  │   │ Venice   │         │
│  │ Service  │   │ Trading  │   │ (private)│         │
│  │ Endpoints│   │ API      │   │          │         │
│  └──────────┘   └──────────┘   │ Bankr    │         │
│                                │ (general)│         │
│  DETECT          IDENTITY      └──────────┘         │
│  ┌──────────┐   ┌──────────┐                        │
│  │ Arbitrage│   │ ERC-8004 │                        │
│  │ 10 chains│   │ agent.json│                       │
│  │ WETH/USDC│   │ logs     │                        │
│  └──────────┘   └──────────┘                        │
└──────────────────────────────────────────────────────┘
```

## Self-Sustaining Economics

AskJeev demonstrates autonomous economic viability:
- Revenue: x402 service fees ($0.005-$0.02 per call)
- Costs: Bankr LLM inference (~$0.01/call), Uniswap gas (<$0.01/swap)
- Privacy: Sensitive reasoning routed through Venice (zero retention)
- The agent can fund its own operations from service revenue

## Security

- Private keys managed via Privy HSM (never on disk)
- Spending controls: per-call max and daily cap
- All transactions logged to agent_log.json
- ERC-8004 provides verifiable identity
