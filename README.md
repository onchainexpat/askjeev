# AskJeev

> An autonomous AI agent that earns money, trades across 18 chains, generates uncensored images, bridges cross-chain, and proves it's human-backed — all without a human in the loop.

**Live:** [synthesis-hackathon-beta.vercel.app](https://synthesis-hackathon-beta.vercel.app)

![AskJeev Live Demo](docs/screenshots/askjeev-live-demo.gif)

## What It Does

AskJeev is a self-sustaining AI agent on Base that combines **x402** (agent-to-agent payments), **Self Protocol** (ZK proof-of-human identity on Celo), and **ERC-8004** (on-chain agent registry) into a complete autonomous economic loop:

**Earn** → **Detect** → **Swap** → **Bridge** → **Think** → **Create** → **Serve** → **Repeat**

1. **Earns USDC** by hosting 9 paid x402 API services
2. **Detects arbitrage** across 18 chains — compares WETH pricing via Uniswap Trading API
3. **Swaps tokens** via Uniswap with gasless limit orders via UniswapX
4. **Bridges cross-chain** via Across Protocol (ERC-7683 intent standard)
5. **Generates images** via Venice AI — uncensored, gated behind Self ZK age verification (18+)
6. **Thinks privately** using Venice AI for sensitive financial data (zero data retention)
7. **Thinks generally** using Bankr LLM Gateway (15 models, USDC-funded)
8. **Serves other agents** through discoverable x402 endpoints
9. **Proves identity** via ERC-8004 + Self Agent ID #42 on Celo

## The Problem

AI agents need to transact autonomously, but there's no trust infrastructure:

- How does one agent know another is real?
- How do you gate sensitive content by age without KYC?
- How does an agent earn, spend, and trade without human intervention?

**AskJeev solves this** by combining payment rails (x402), verifiable identity (Self + ERC-8004), and autonomous DeFi tooling (Uniswap + Across) into a single self-sustaining agent.

## Live Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/arbitrage` | POST | $0.01 | Cross-chain arbitrage detection (18 chains, tiered access) |
| `/api/swap-quote` | POST | $0.005 | Uniswap swap quote on any of 18 chains |
| `/api/generate-image` | POST | $0.03 | Uncensored image generation (Self 18+ only) |
| `/api/limit-order` | POST | $0.01 | Gasless limit order via UniswapX |
| `/api/bridge` | POST | $0.01 | Cross-chain bridge via Across Protocol |
| `/api/private-analyze` | POST | $0.02 | Venice AI private analysis (zero retention) |
| `/api/ask` | POST | $0.01 | Bankr multi-model reasoning (15 models) |
| `/api/rebalance` | POST | $0.02 | Private portfolio rebalancer (Venice-analyzed) |
| `/api/discover` | POST | $0.01 | x402 service discovery |
| `/health` | GET | Free | Health check |
| `/agent.json` | GET | Free | ERC-8004 manifest |
| `/x402-discovery` | GET | Free | Service discovery |
| `/api/self-verify` | GET | Free | Live trust card (agent identity from Celo) |
| `/api/agent-card` | GET | Free | On-chain Agent Card from Celo |
| `/api/self-status` | GET | Free | Self Agent ID verification status |
| `/api/balances` | GET | Free | Live wallet balances (Base + Celo) |

### Example: Get a Swap Quote

```bash
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/swap-quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x0000000000000000000000000000000000000000",
    "tokenOut": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "1000000000000000"
  }'
```

### Example: Private Financial Analysis

```bash
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/private-analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Analyze ETH/USDC position risk for a 70/30 portfolio"}'
```

### Example: Cross-Chain Arbitrage Detection

```bash
curl -X POST https://synthesis-hackathon-beta.vercel.app/api/arbitrage \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "cross-chain",
    "chains": ["ethereum", "base", "arbitrum", "polygon", "optimism"],
    "minSpreadPercent": 0.1
  }'
```

Returns WETH pricing discrepancies across chains — buy where it's cheap, sell where it's expensive. Supports 18 chains via the Uniswap Trading API with rate-limited batched quotes. Self-verified agents get premium access (17 chains + Venice AI analysis).

### Live Arbitrage Results (real data)

```json
{
  "pairsChecked": 10,
  "opportunities": [
    {
      "pair": "WETH price: Base vs Polygon",
      "spreadPercent": 0.04,
      "direction": "USDC→WETH (Base) gives better rate — Polygon is underpriced"
    },
    {
      "pair": "WETH price: Base vs Optimism",
      "spreadPercent": 0.04,
      "direction": "USDC→WETH (Base) gives better rate — Optimism is underpriced"
    },
    {
      "pair": "WETH price: Arbitrum vs Optimism",
      "spreadPercent": 0.03,
      "direction": "USDC→WETH (Arbitrum) gives better rate — Optimism is underpriced"
    }
  ]
}
```

Real-time WETH prices detected across Ethereum, Base, Arbitrum, Polygon, and Optimism. Spreads are small (0.03-0.04%) because major chains have efficient markets — the system would catch larger dislocations during volatility events.

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

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js + TypeScript | Core execution |
| Blockchain | Base + 17 chains via viem | On-chain operations + quotes on 18 chains |
| Payments | x402 protocol | Autonomous agent-to-agent payments (USDC) |
| Swaps | Uniswap Trading API | Token exchange, gasless limit orders (UniswapX) |
| Bridging | Across Protocol (ERC-7683) | Cross-chain asset transfers |
| Private AI | Venice AI | Zero-retention reasoning + uncensored image gen |
| General AI | Bankr LLM Gateway | 15 models (Claude, GPT, Gemini, Kimi, Qwen) |
| Identity | ERC-8004 | Verifiable on-chain agent identity |
| Trust | Self Agent ID | ZK proof-of-human on Celo (sybil + age gating) |
| Server | Hono | Lightweight x402 service endpoints |
| Hosting | Vercel | Serverless deployment |

## Self-Sustaining Economics

AskJeev demonstrates autonomous economic viability:

- **Revenue:** x402 service fees ($0.005-$0.02 per call)
- **Costs:** Bankr LLM inference (~$0.01/call), Uniswap gas (<$0.01/swap)
- **Privacy:** Sensitive reasoning routed through Venice (zero retention)
- **Identity:** ERC-8004 provides verifiable on-chain trust

The agent can fund its own operations from service revenue — no human intervention needed.

## Quick Start

```bash
# Clone
git clone https://github.com/onchainexpat/askjeev.git
cd askjeev

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run locally
npm run dev:server

# Run tests
npm test
```

## Hackathon Tracks

Built for the [Synthesis Hackathon](https://synthesis.md) — competing across:

- **Synthesis Open Track** — community-funded
- **Agent Services on Base** — discoverable x402 agent services
- **Agentic Finance (Uniswap)** — real swaps with TxIDs
- **Private Agents (Venice)** — zero-retention AI reasoning
- **Best Bankr LLM Gateway Use** — self-sustaining inference economics
- **Agents With Receipts (ERC-8004)** — verifiable agent identity
- **Self Agent ID** — ZK-powered proof-of-human verification on Celo

## On-Chain Artifacts

- **ERC-8004 Agent ID:** #34354 — [Registration TX (Base)](https://basescan.org/tx/0xf60b97171d0e2cca6aff30c60a446252787e5f294931e9ad43b5d0ed4dd9ff0e)
- **Self Agent ID:** #42 — [Registry (Celo)](https://celoscan.io/address/0xaC3DF9ABf80d0F5c020C06B04Cced27763355944)
- **Autonomous Swap 1:** [0x260b...370b](https://basescan.org/tx/0x260bac5558d22737f22a12a3dd09a4409fdc5629f8e83217f331df64fd87370b)
- **Autonomous Swap 2:** [0x1fa7...3ed4](https://basescan.org/tx/0x1fa7d1c47205c5b384736c241928b53c287ebd940d60ac0273bfd5355cee3ed4)
- **Wallet:** [BaseScan](https://basescan.org/address/0x6E5adF9C48203D239704c16268394adf0A21C6D0)

## License

MIT
