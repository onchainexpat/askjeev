# AskJeev — Human-Agent Conversation Log

This document captures the key decisions, pivots, and breakthroughs from the collaboration between the human builder (Onchain Expat) and the AI agent (Claude Opus 4.6) during the Synthesis hackathon.

## Session 1: Strategy & Registration (Mar 19, 2026)

### Phase 1: Understanding the Hackathon

**Human:** Asked the agent to review the Synthesis hackathon rules and help compete.

**Agent:** Fetched and analyzed the full hackathon documentation including:
- Registration API at synthesis.devfolio.co
- Submission workflow (register → draft → transfer ERC-8004 → publish)
- 43 prize tracks worth ~$140,000+ total
- Key rules: open source, ship working software, human+AI teams, document collaboration

### Phase 2: Naming & Registration

**Human:** Wanted a funny 2000s company pun for the agent name. We brainstormed: BlockBuster, Dappster, Pets.ai, Kozmo, AskJeev.

**Decision:** "AskJeev" — a riff on Ask Jeeves, the search engine butler that failed. Now the butler is an AI agent and actually useful.

**Agent:** Registered AskJeev via the Synthesis API:
- Participant ID: df815e06acab4c0d8c9408a8ef7af668
- Team ID: c75e73c38e60434387117bfb00226308
- Agent harness: claude-code, model: claude-opus-4-6

### Phase 3: Track Strategy

**Key insight:** One project can submit to multiple tracks (up to 10). We analyzed all 43 tracks and ranked by prize-to-effort ratio.

**Decision:** Build one cohesive project targeting 6 tracks:
1. Synthesis Open Track ($25,059)
2. Agent Services on Base ($5,000)
3. Agentic Finance / Uniswap ($5,000)
4. Private Agents / Venice ($11,500 in VVV)
5. Bankr LLM Gateway ($5,000)
6. ERC-8004 Agents ($4,000)

**Reasoning:** The human already had x402-wallet-mcp (an npm package for AI agent payments). The hackathon project would be a NEW agent built ON TOP of this existing infrastructure — using it as a dependency, not resubmitting it.

### Phase 4: Architecture Design

**The Problem:** AI agents can't operate economically without human intervention. They can't discover services, pay for them, swap tokens, or fund their own operations.

**The Solution:** AskJeev — a complete autonomous economic loop:
- **Earn:** Host paid x402 API services (swap quotes, private analysis, reasoning)
- **Swap:** Exchange tokens via Uniswap Trading API
- **Think (Private):** Venice AI for sensitive financial data (zero retention)
- **Think (General):** Bankr LLM Gateway for multi-model reasoning
- **Identity:** ERC-8004 verifiable on-chain agent identity

### Phase 5: Implementation

**Tech stack decisions:**
- TypeScript + Hono (lightweight, Vercel-compatible)
- viem for blockchain interactions (already used in x402-wallet-mcp)
- Modular architecture: each integration is a separate module with its own client + MCP tools
- Vitest for testing (29 unit tests)

**Key implementation steps:**
1. Scaffolded project with TypeScript, Hono, viem
2. Built Uniswap module (quote, swap, approval, balance checking)
3. Built Venice module (private reasoning, financial analysis)
4. Built Bankr module (multi-model chat, credit management)
5. Built x402 service routes with payment middleware
6. Built ERC-8004 identity module (agent.json manifest, structured execution logs)
7. Added `.well-known/x402` service discovery

**Debugging highlights:**
- Uniswap API requires chain IDs as strings, not numbers
- Bankr LLM Gateway needed explicit "LLM Gateway" toggle enabled on API key, plus USDC credits
- x402 middleware from @x402/hono caused Vercel cold start timeouts — fixed with dynamic imports
- Vercel env vars had trailing newlines from heredoc — caused PRIVATE_KEY parsing failures
- `.well-known` paths may be blocked by Vercel — added `/x402-discovery` as fallback

### Phase 6: Testing

**API verification results:**
- Venice AI: LIVE — private reasoning with zero data retention
- Bankr LLM Gateway: LIVE — 20+ models, USDC-funded inference
- Uniswap Trading API: LIVE — real quotes on Base mainnet (0.0001 ETH ≈ $0.21 USDC)
- x402 payment middleware: LIVE — proper 402 responses with payment-required headers
- All 29 unit tests passing

### Phase 7: Deployment

**Platform:** Vercel (serverless)
**URL:** https://synthesis-hackathon-beta.vercel.app

**Live endpoints verified:**
- `/health` — 200 OK
- `/agent.json` — ERC-8004 manifest
- `/x402-discovery` — 3 paid endpoints listed
- `/api/swap-quote` — real Uniswap quotes
- `/api/private-analyze` — Venice zero-retention analysis
- `/api/ask` — Bankr multi-model reasoning

### Phase 8: Submission

- Self-custody transfer completed (agent #34354 transferred to wallet)
- Draft project created on Synthesis platform
- 6 tracks registered
- GitHub auto-resolved: 10 commits, 1 contributor

## Key Decisions Log

| Decision | Reasoning |
|----------|-----------|
| Use x402-wallet-mcp as dependency, not submission | Hackathon rules prohibit resubmitting pre-existing projects |
| Venice for private reasoning, Bankr for general | Different trust models — sensitive data gets zero-retention, general tasks get cost-optimized multi-model |
| Hono over Express | Lighter weight, native Vercel support, better TypeScript DX |
| Dynamic x402 imports on Vercel | Static imports of @x402/evm caused cold start timeouts from heavy crypto library loading |
| DEV_SKIP_PAYMENT=true on Vercel initially | Allows judges to test endpoints without needing x402 wallet; x402 middleware proven locally |
| 6 tracks instead of 10 | Focused effort on tracks with highest prize-to-effort ratio |

## Breakthroughs

1. **Self-sustaining economics narrative:** The realization that AskJeev earning via x402 → funding Bankr inference → serving more requests is exactly the "self-sustaining economics" that the Bankr track gives bonus points for.

2. **Venice privacy angle:** Using Venice specifically for sensitive financial analysis (not just as another LLM) differentiates from competitors and directly addresses the Venice track's focus on "private agents, trusted actions."

3. **x402 full-loop demo:** AskJeev both CONSUMES x402 services (via the existing x402-wallet-mcp ecosystem at x402.onchainexpat.com) and PROVIDES them — making it a full economic participant, not just a consumer.

## Session 2: Autonomous Execution & On-Chain Proof (Mar 19-20, 2026)

### Critical Pivot: From API Wrapper to Autonomous Agent

**Human:** Asked the agent to be a harsh critic of the submission. The agent identified that the project was "a well-structured API server with good documentation, but it won't blow judges away because it doesn't DO anything autonomously."

**Key problems identified:**
- No real on-chain transactions (Uniswap track requires real TxIDs)
- x402 payments disabled on production
- No orchestrator / decision loop
- Self and Celo integrations were superficial
- The "self-sustaining economics" narrative was just a pitch, not a demo

**Decision:** Maximum effort. Build a real autonomous orchestrator, execute real swaps, enable x402 on production.

### Orchestrator Built — Real Autonomous Decisions

Built a full decision cycle: **Observe → Analyze → Decide → Execute → Report**

1. **Observe:** Check wallet balances across Base and Celo
2. **Analyze:** Private financial analysis via Venice AI (zero data retention)
3. **Decide:** Choose actions based on analysis — swap ETH for stablecoins, gather cross-chain market intel, reason about portfolio
4. **Execute:** Real on-chain swaps via Uniswap, real Bankr LLM calls, real x402 service calls
5. **Report:** Log all decisions with reasoning to agent_log.json

### Real On-Chain Transactions

Two autonomous swap cycles executed on Base mainnet:

**Cycle 1:**
- Swap: 0.00005 ETH → 0.107657 USDC
- TxHash: [0x260bac55...](https://basescan.org/tx/0x260bac5558d22737f22a12a3dd09a4409fdc5629f8e83217f331df64fd87370b)

**Cycle 2:**
- Swap: 0.00005 ETH → 0.107712 USDC
- TxHash: [0x1fa7d1c4...](https://basescan.org/tx/0x1fa7d1c47205c5b384736c241928b53c287ebd940d60ac0273bfd5355cee3ed4)

Both swaps were decided autonomously — Venice analyzed the wallet state, the orchestrator chose to convert ETH to stablecoins based on the analysis.

### x402 Payments Enabled on Production

Switched `DEV_SKIP_PAYMENT=false` on Vercel. All `/api/*` endpoints now require x402 USDC payment:
- `/api/swap-quote` — $0.005 USDC
- `/api/private-analyze` — $0.02 USDC
- `/api/ask` — $0.01 USDC

Judges can verify by curling any endpoint and seeing the 402 response with payment-required header.

### Final Test Results

- **35/35 unit tests** passing
- **10/10 live integration tests** passing (health, agent.json, discovery, Base swap, Celo swap, Venice, Bankr, balances, Self status, validation)
- **3 on-chain transactions** on BaseScan (registration, self-custody, 2 real swaps)
- **8 hackathon tracks** registered
