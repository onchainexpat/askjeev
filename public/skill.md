---
name: askjeev
version: 6.1.0
description: Autonomous agent butler — cross-chain arbitrage, private analysis, image generation, portfolio rebalancing
homepage: https://synthesis-hackathon-beta.vercel.app
---

# AskJeev — Agent Skill

An autonomous agent butler on Base with verifiable identity on Celo (Self Agent ID #42). Earns USDC via x402 payments, detects arbitrage across 18 chains, generates uncensored images (18+ ZK age-gated), and privately analyzes portfolios.

## Endpoints

All paid endpoints require x402 payment (USDC on Base). Use `@x402/fetch` or `x402-wallet-mcp` to handle payment automatically.

### Arbitrage Detection ($0.01)
```
POST /api/arbitrage
{"mode": "cross-chain", "chains": ["ethereum", "base", "linea"], "minSpreadPercent": 0}
```
Compares WETH prices across up to 18 chains. Self-verified agents get premium access (17 chains + Venice AI analysis).

### Swap Quote ($0.005)
```
POST /api/swap-quote
{"tokenIn": "0x0000000000000000000000000000000000000000", "tokenOut": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "amount": "1000000000000000", "chain": "base"}
```
Uniswap swap quote on any of 18 chains.

### Private Analysis ($0.02)
```
POST /api/private-analyze
{"prompt": "Analyze ETH/USDC position risk"}
```
Venice AI zero-retention analysis. Your data is never stored.

### Ask (Multi-Model) ($0.01)
```
POST /api/ask
{"prompt": "What is cross-chain arbitrage?"}
```
Bankr LLM Gateway — 15 models including Claude, GPT, Gemini.

### Portfolio Rebalance Planner ($0.02)
```
POST /api/rebalance
{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "strategy": "conservative"}
```
Reads full portfolio via Zerion (all chains, all tokens). Venice AI privately analyzes and suggests rebalancing swaps. Strategy: `conservative` (favor stablecoins) or `aggressive` (maximize ETH). Includes Uniswap/Across route suggestions.

### Cross-Chain Bridge ($0.01)
```
POST /api/bridge
{"tokenIn": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "tokenOut": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "amount": "1000000", "chainIn": "base", "chainOut": "arbitrum"}
```
Bridge quote via Across Protocol (ERC-7683).

### Image Generation ($0.03, Self 18+ required)
```
POST /api/generate-image
{"prompt": "a cyberpunk robot butler", "model": "chroma", "width": 512, "height": 512}
```
Uncensored image generation via Venice AI. Requires Self Agent ID with 18+ ZK age verification.

## Free Endpoints

- `GET /health` — Health check
- `GET /agent.json` — ERC-8004 agent manifest
- `GET /x402-discovery` — Service discovery
- `GET /api/self-verify` — Live trust card (Agent #42 on Celo)
- `GET /api/balances` — Live wallet balances

## Payment Setup

```bash
# Claude Code
claude mcp add x402-wallet -- npx x402-wallet-mcp

# Then whitelist AskJeev
"Add synthesis-hackathon-beta.vercel.app to my x402 allowlist"
```

## Identity

- **ERC-8004 Agent ID:** #34354 on Base
- **Self Agent ID:** #42 on Celo (ZK passport proof, 364 days validity)
- **Wallet:** 0x6E5adF9C48203D239704c16268394adf0A21C6D0
