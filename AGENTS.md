# AskJeev — Autonomous Agent Butler

## What This Agent Does

AskJeev is an autonomous economic agent on Base that demonstrates a complete self-sustaining loop:

**Earn** → **Detect** → **Swap** → **Think** → **Serve** → **Repeat**

1. **Earns USDC** by hosting paid x402 API services (swap quotes, arbitrage detection, private analysis, multi-model reasoning)
2. **Detects cross-chain arbitrage** across 18 chains by comparing USDC→WETH rates via Uniswap Trading API (Ethereum, Base, Arbitrum, Polygon, Optimism, Celo, BNB, Avalanche, Blast, World Chain)
3. **Swaps tokens** via Uniswap Trading API when it needs a different asset
4. **Thinks privately** using Venice AI for sensitive financial data (zero data retention)
5. **Thinks generally** using Bankr LLM Gateway (20+ models, paid with USDC)
6. **Serves other agents** through discoverable x402 endpoints

## How to Interact

### As an Agent (x402)
```bash
# Discover AskJeev's services
curl https://synthesis-hackathon-beta.vercel.app/.well-known/x402

# Get a swap quote (pay $0.005 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/swap-quote \
  -H "Content-Type: application/json" \
  -d '{"tokenIn": "0x0000000000000000000000000000000000000000", "tokenOut": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "amount": "1000000000000000"}'

# Private financial analysis (pay $0.02 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/private-analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Analyze this DeFi position for risk"}'

# General reasoning (pay $0.01 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/ask \
  -d '{"prompt": "What is the current gas price trend on Base?"}'

# Cross-chain arbitrage detection (pay $0.01 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"mode": "cross-chain", "chains": ["ethereum", "base", "arbitrum"], "minSpreadPercent": 0.1}'

# Full arbitrage scan — stablecoins + cross-chain (pay $0.01 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"mode": "all"}'

# Gasless limit order (pay $0.01 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/limit-order \
  -H "Content-Type: application/json" \
  -d '{"tokenIn": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "tokenOut": "0x4200000000000000000000000000000000000006", "amount": "1000000", "limitPrice": "0.0004", "chain": "base"}'

# Cross-chain bridge quote (pay $0.01 USDC via x402)
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/bridge \
  -H "Content-Type: application/json" \
  -d '{"tokenIn": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "tokenOut": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "amount": "1000000", "chainIn": "base", "chainOut": "arbitrum"}'

# Uncensored image generation (pay $0.03, requires Self Agent ID 18+)
# Returns 403 without Self verification — ZK age-gated
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cyberpunk cityscape at sunset"}'
```

### As a Judge
- **Landing page:** `GET /` — live trust dashboard with identity badges
- **Health check:** `GET /health`
- **ERC-8004 manifest:** `GET /agent.json`
- **Service discovery:** `GET /.well-known/x402`
- **Trust card:** `GET /api/self-verify` — live agent identity from Celo
- **Agent Card:** `GET /api/agent-card` — on-chain skills published to Celo
- All `/api/*` endpoints accept x402 payments in USDC on Base
- Arbitrage endpoint shows tiered access (`accessTier` field in response)

## Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js + TypeScript | Core execution |
| Blockchain | Base + 17 chains via viem | On-chain operations (quotes on 18 chains, txns on Base/Celo) |
| Payments | x402 protocol | Autonomous agent-to-agent payments (USDC) |
| Swaps | Uniswap Trading API | Token exchange, gasless limit orders (UniswapX) |
| Bridging | Across Protocol (ERC-7683) | Cross-chain asset transfers |
| Private AI | Venice AI | Zero-retention reasoning + uncensored image gen |
| General AI | Bankr LLM Gateway | 15 models (Claude, GPT, Gemini, Kimi, Qwen) |
| Identity | ERC-8004 | Verifiable on-chain agent identity |
| Trust | Self Agent ID | ZK proof-of-human on Celo (sybil + age gating) |
| Server | Hono | x402 service endpoints |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      AskJeev Agent                           │
│               (autonomous economic loop)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  EARN           SWAP/BRIDGE       THINK          CREATE      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ x402     │   │ Uniswap  │   │ Venice   │   │ Venice   │ │
│  │ 9 paid   │   │ 18 chains│   │ (private)│   │ Images   │ │
│  │ endpoints│   │ UniswapX │   │ Bankr    │   │ (18+ ZK) │ │
│  └──────────┘   │ Across   │   │ (general)│   └──────────┘ │
│                 └──────────┘   └──────────┘                 │
│  DETECT          IDENTITY       TRUST                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ Arbitrage│   │ ERC-8004 │   │ Self #42 │                │
│  │ 18 chains│   │ agent.json│  │ ZK proof │                │
│  │ WETH/USDC│   │ logs     │   │ Tiered   │                │
│  └──────────┘   └──────────┘   └──────────┘                │
└──────────────────────────────────────────────────────────────┘
```

## Self-Sustaining Economics

AskJeev demonstrates autonomous economic viability:
- Revenue: x402 service fees ($0.005-$0.02 per call)
- Costs: Bankr LLM inference (~$0.01/call), Uniswap gas (<$0.01/swap)
- Privacy: Sensitive reasoning routed through Venice (zero retention)
- The agent can fund its own operations from service revenue

## Self Agent ID (Proof-of-Human)

AskJeev is **Self Agent ID #42** on Celo — a ZK-powered identity primitive that proves the agent is human-backed without revealing personal data (verified via passport ZK proof, valid for 364 days).

### Live Trust Dashboard

The landing page displays a live **Agent Trust Profile** fetched from `/api/self-verify`:
- **3 green badges:** x402 Payments, Self Verified, ERC-8004 Identity
- **Agent ID #42** linked to Celo registry contract
- **Sybil resistance:** 1 of 3 agents (each human limited to 3 agents via ZK passport proof)
- **Proof validity countdown:** 364 days remaining

### Tiered Access (Why Self Matters)

Self-verified agents get **premium access** — a real economic incentive for identity verification:

| Feature | Standard (no Self) | Premium (Self verified) |
|---------|-------------------|------------------------|
| Chains scanned | 5 | All 17 |
| Venice AI analysis | No | Yes |
| Min spread threshold | 0.1% | 0.01% |

```bash
# Standard access (no Self headers) → 5 chains, no AI analysis
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{"mode": "cross-chain"}'
# → {"accessTier":"standard","selfVerified":false,"chains":5,"upgrade":"Add Self Agent ID headers..."}

# Premium access (with Self headers) → 10 chains + Venice analysis
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \
  -H "x-self-agent-signature: <your-sig>" \
  -H "x-self-agent-timestamp: <unix-ms>" \
  -H "x-self-agent-key: <your-key>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "cross-chain"}'
# → {"accessTier":"premium","selfVerified":true,"chains":10,"analysis":"Venice AI: ..."}
```

### Trust Endpoints

```bash
# Live trust card (agent identity + verification status)
curl https://synthesis-hackathon-beta.vercel.app/api/self-verify
# → {"agent":{"agentId":42,"isVerified":true,"daysUntilExpiry":364},"trust":{"x402Payment":true,"selfVerified":true,"erc8004Identity":true}}

# On-chain Agent Card (skills published to Celo)
curl https://synthesis-hackathon-beta.vercel.app/api/agent-card

# Basic Self status
curl https://synthesis-hackathon-beta.vercel.app/api/self-status
```

## Security

- Private keys managed via Privy HSM (never on disk)
- Spending controls: per-call max and daily cap
- All transactions logged to agent_log.json
- ERC-8004 provides verifiable identity
- Self Agent ID adds optional proof-of-human layer (ZK on Celo)
