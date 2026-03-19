# Synthesis Hackathon - Sponsor Track Research

Researched: 2026-03-19

---

## 1. VENICE AI — "Private Agents, Trusted Actions"

**UUID:** ea3b366947c54689bd82ae80bf9f3310
**Prize:** 1st: 1,000 VVV (~$5,750) | 2nd: 600 VVV (~$3,450) | 3rd: 400 VVV (~$2,300)
**Track:** Build agents that reason over sensitive data without exposure, producing trustworthy outputs for private coordination.

### What Venice Offers

Venice AI is a privacy-first AI inference platform — no data retention, permissionless access. They run an OpenAI-compatible API at `https://api.venice.ai/api/v1` with uncensored models, function calling, vision, image generation, TTS, and web search built in.

**Key models:**
- `zai-org-glm-4.7` — 128k context, reasoning, function calling (best for agents)
- `venice-uncensored` — 32k context, unfiltered generation
- `mistral-31-24b` — 131k context, vision + tool use
- `qwen3-4b` — 40k context, fast/cheap

### Integration in Code

**You already use Venice at x402.onchainexpat.com** — so this is essentially free work.

```typescript
import OpenAI from "openai";

const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});

// Standard chat completion
const response = await venice.chat.completions.create({
  model: "zai-org-glm-4.7",
  messages: [{ role: "user", content: "Analyze this swap..." }],
  // Venice-specific: disable their system prompt for agent use
  extra_body: {
    venice_parameters: {
      include_venice_system_prompt: false,
      enable_web_search: "auto",
    }
  }
});

// Function calling (tool use) — same as OpenAI
const agentResponse = await venice.chat.completions.create({
  model: "zai-org-glm-4.7",
  messages: [...],
  tools: [{
    type: "function",
    function: {
      name: "execute_swap",
      description: "Execute a token swap on Uniswap",
      parameters: { type: "object", properties: { ... } }
    }
  }],
  tool_choice: "auto"
});
```

### Venice-Specific Parameters (`venice_parameters`)

| Parameter | Values | Use Case |
|-----------|--------|----------|
| `include_venice_system_prompt` | true/false | Disable for agent control |
| `enable_web_search` | off/on/auto | Real-time data for agents |
| `enable_web_citations` | true/false | Source attribution |
| `enable_web_scraping` | true/false | Parse URLs in messages |
| `strip_thinking_response` | true/false | Hide reasoning chains |
| `disable_thinking` | true/false | Skip reasoning mode |

### npm Packages

- `openai` (standard OpenAI SDK — just change baseURL)
- No Venice-specific npm package needed

### Effort Estimate: MINIMAL (~1-2 hours)

Since you already use Venice, the "integration" is already done. To win this track:
1. Make sure Venice is the AI backbone (not just a fallback)
2. Demonstrate the privacy angle: agent reasons over sensitive financial data (wallet balances, swap strategies) without data retention
3. Use function calling to connect Venice reasoning to on-chain actions
4. Use `include_venice_system_prompt: false` to show you control the agent

### Fit with Existing Stack

**Perfect fit.** Venice replaces OpenAI as the LLM layer. x402 handles payments, Uniswap handles swaps, Bankr handles wallet ops, ERC-8004 handles agent identity. Venice is the "brain" that reasons privately.

### Testing

- Get API key from https://venice.ai/settings/api
- Test with any OpenAI client — if it works with OpenAI, it works with Venice
- Monitor rate limits via response headers (`x-ratelimit-remaining-requests`)
- Check balance: `GET /billing/balance`

---

## 2. SELF PROTOCOL — "Best Self Agent ID Integration"

**UUID:** 437781b864994698b2a304227e277b56
**Prize:** $1,000
**Track:** ZK-powered identity primitive for agents. Build agents with verifiable human-backed identity.

### What Self Protocol Is

Self Protocol provides zero-knowledge proof-of-human verification for AI agents. Users scan their passport via the Self mobile app, which generates a ZK proof. Agents receive a soulbound NFT (on-chain identity) proving they're human-backed — without revealing personal data. Built as an **extension to ERC-8004**.

Key properties:
- 1 agent = 1 human (Sybil resistance)
- ZK proofs from real passports (129 countries supported)
- Selective disclosure: prove age > 18, OFAC compliance, nationality — without revealing actual data
- Deploys on **Celo** (chain ID 11142220 for testnet)
- Proofs expire (max 365 days or passport expiry)

### Integration in Code

**npm package:** `@selfxyz/agent-sdk` (v0.2.1, published 1 week ago)

```bash
npm install @selfxyz/agent-sdk
```

**Agent side — sign requests:**
```typescript
import { SelfAgent } from "@selfxyz/agent-sdk";

// Agent has its own keypair
const agent = new SelfAgent({ privateKey: process.env.AGENT_PRIVATE_KEY });

// Auto-sign requests to other services
const response = await agent.fetch("https://api.example.com/data", {
  method: "POST",
  body: JSON.stringify({ query: "swap ETH for USDC" }),
});

// Check on-chain registration status
console.log(await agent.isRegistered()); // true/false
console.log(await agent.getInfo()); // { agentId, isVerified, proofExpiresAt, ... }

// Get ZK-attested credentials
const creds = await agent.getCredentials();
// { issuingState, nationality, dateOfBirth, olderThan, ofac, ... }

// Verification strength: 0=unverified, 1=basic, 2=standard, 3=enhanced
const strength = await agent.getVerificationStrength();
```

**Service side — verify incoming agent requests:**
```typescript
import { SelfAgentVerifier, VerifierBuilder } from "@selfxyz/agent-sdk";

// Build verifier with requirements
const verifier = VerifierBuilder.create()
  .network("mainnet")
  .requireAge(18)
  .requireOFAC()         // sanctions screening
  .sybilLimit(1)          // one agent per human
  .replayProtection()
  .includeCredentials()
  .maxAge(300_000)        // 5 min timestamp window
  .build();

// Express middleware
app.post("/api/swap", verifier.auth(), (req, res) => {
  const agent = req.verifiedAgent;
  console.log(`Verified agent: ${agent.agentId}`);
  // proceed with swap...
});

// Manual verification
const result = await verifier.verify({
  signature: req.headers["x-self-agent-signature"],
  timestamp: req.headers["x-self-agent-timestamp"],
  method: req.method,
  url: req.path,
  body: req.body,
});
```

**Agent Card (A2A discovery):**
```typescript
// Set machine-readable agent metadata on-chain
const txHash = await agent.setAgentCard({
  name: "OnchainExpat Trading Agent",
  description: "AI agent for DeFi operations with verified human identity",
  url: "https://x402.onchainexpat.com",
  skills: [
    { name: "swap", description: "Execute token swaps via Uniswap" },
    { name: "analyze", description: "Analyze DeFi positions" }
  ],
});
```

### npm Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@selfxyz/agent-sdk` | Agent signing + service verification | v0.2.1 (active) |
| `@selfxyz/qrcode` | React QR code component for passport scan | v1.0.22 |
| `@selfxyz/core` | Core ZK utilities | v1.2.0-beta.1 |
| `ethers` | Dependency (v6) | Required |
| `@noble/ed25519` | Dependency | Required |

### Effort Estimate: MODERATE (~4-6 hours)

1. Install `@selfxyz/agent-sdk` (~5 min)
2. Generate agent keypair and register via https://app.ai.self.xyz (~15 min)
3. Add `SelfAgent` signing to outbound requests (~1 hour)
4. Add `SelfAgentVerifier` middleware to your API endpoints (~1 hour)
5. Display verification status in UI (~1-2 hours)
6. Test registration flow with passport scan (~1 hour)
7. Connect Agent Card to ERC-8004 registry (~1-2 hours)

### Fit with Existing Stack

**Excellent fit.** Self is literally built on ERC-8004 — the same standard you're already using. The integration:
- ERC-8004 agent registry = Self Agent ID soulbound NFT
- Your agent signs x402 payment requests WITH Self identity headers
- Services verify the agent is human-backed before executing Uniswap swaps
- Bankr wallet operations get an identity layer
- Deployed on Celo (same chain as the Celo track)

### Testing

- Register at https://app.ai.self.xyz (wizard or SDK)
- Testnet: Celo Sepolia (chain ID 11142220)
- Need a real passport + Self mobile app for registration
- CLI tool included: `self-agent` / `self-agent-cli` (bundled with SDK)
- Test verification with the VerifierBuilder in unit tests

---

## 3. CELO — "Best Agent on Celo"

**UUID:** ff26ab4933c84eea856a5c6bf513370b
**Prize:** 1st: $3,000 | 2nd: $2,000
**Track:** Stablecoin infrastructure, mobile accessibility, and global payments. Build the best AI agent on Celo.

### What Makes Celo Unique

Celo is an Ethereum L2 (launched March 2025) optimized for payments and agent activity:
- **1-second block finality** — agents can act fast
- **Sub-cent gas fees** — agents can transact cheaply
- **Fee abstraction** — pay gas in USDC/USDT/cUSD instead of CELO
- **EVM compatible** — standard Solidity, viem, ethers all work
- **8M+ real-world users** — especially in emerging markets
- **ERC-8004 deployed** on Celo (Feb 2026)
- **25+ stablecoins** including local currency options

### Network Configuration

| Property | Mainnet | Testnet (Sepolia) |
|----------|---------|-------------------|
| Chain ID | 42220 | 11142220 |
| RPC | https://forno.celo.org | https://forno.celo-sepolia.celo-testnet.org |
| Explorer | https://celoscan.io | https://celo-sepolia.blockscout.com |
| Faucet | N/A | https://faucet.celo.org/celo-sepolia |

### Key Contract Addresses (Mainnet)

| Token | Address |
|-------|---------|
| cUSD | `0x765de816845861e75a25fca122bb6898b8b1282a` |
| USDC | `0xceba9300f2b948710d2653dd7b07f33a8b32118c` |
| USDC Fee Adapter | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` |
| USDT Fee Adapter | `0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72` |

### Integration in Code

**viem setup (recommended for agents):**
```typescript
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi } from "viem";

// Create clients
const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http("https://forno.celo.org"),
});

// Send stablecoin with fee abstraction (pay gas in USDC!)
const hash = await walletClient.writeContract({
  address: "0xceba9300f2b948710d2653dd7b07f33a8b32118c", // USDC
  abi: erc20Abi,
  functionName: "transfer",
  args: [recipientAddress, parseUnits("10", 6)], // 10 USDC
  feeCurrency: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B", // USDC adapter
});
```

**wagmi config (if you have a frontend):**
```typescript
import { createConfig, http } from "wagmi";
import { celo } from "wagmi/chains";

export const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});
```

### Fee Abstraction (Critical Feature)

The killer feature for agents: **no need to hold CELO at all**. Your agent can hold only USDC and pay gas in USDC. This is massive for agent UX:

```typescript
// IMPORTANT: Use adapter address for 6-decimal tokens (USDC, USDT)
// Use token address directly for 18-decimal tokens (cUSD, USDm)
const USDC_FEE_ADAPTER = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B";

const hash = await walletClient.sendTransaction({
  to: recipient,
  value: 0n,
  feeCurrency: USDC_FEE_ADAPTER, // gas paid in USDC
});
```

### npm Packages

- `viem` — first-class Celo support with `feeCurrency` parameter
- `wagmi` — Celo chain config built-in
- `ethers` — works but viem recommended for fee abstraction
- No Celo-specific SDK needed

### Effort Estimate: MODERATE (~4-8 hours)

1. Add Celo chain config to your viem/wagmi setup (~30 min)
2. Deploy your contracts to Celo (if applicable) or use existing Celo DEXes (~1-2 hours)
3. Implement fee abstraction for agent transactions (~1 hour)
4. Add Celo stablecoin support (cUSD, USDC) (~1-2 hours)
5. Connect to Uniswap V3 on Celo (it's deployed there) (~1-2 hours)
6. Test on Celo Sepolia testnet (~1-2 hours)

### Fit with Existing Stack

**Strong fit with some adaptation:**
- **x402:** Works on any EVM chain — just point to Celo RPC
- **Uniswap:** Uniswap V3 is deployed on Celo — same contracts, different chain
- **Bankr:** If it supports custom chains, add Celo; if not, may need a wrapper
- **ERC-8004:** Already deployed on Celo (Feb 2026) — perfect alignment
- **Self Protocol:** Self deploys on Celo — all three tracks converge here

### Testing

- Faucet: https://faucet.celo.org/celo-sepolia (gives CELO, cUSD, cEUR, cREAL)
- Testnet chain ID: 11142220
- RPC: https://forno.celo-sepolia.celo-testnet.org
- Explorer: https://celo-sepolia.blockscout.com
- Note: Celo Sepolia replaced Alfajores as the primary testnet

---

## STRATEGIC ANALYSIS: Targeting All Three Tracks

### The Convergence Play

All three tracks are synergistic. You can build ONE project that qualifies for ALL THREE:

```
Venice (brain) → reasons over private financial data
   ↓
Self Protocol (identity) → proves agent is human-backed via ZK
   ↓
Celo (infrastructure) → executes stablecoin payments with fee abstraction
   ↓
ERC-8004 (registry) → on-chain agent identity (shared by Self + Celo)
   ↓
x402 (payments) → agent-to-agent payments
   ↓
Uniswap on Celo → token swaps
```

### Architecture

```
┌──────────────────────────────────────────────┐
│           Venice AI (Private Brain)           │
│  - Uncensored reasoning over financial data   │
│  - Function calling → on-chain actions        │
│  - No data retention = privacy compliance     │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│         Self Agent ID (ZK Identity)           │
│  - Agent keypair + soulbound NFT              │
│  - Proof-of-human via passport ZK proof       │
│  - OFAC + age verification                    │
│  - Signs all outbound requests                │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│        Celo L2 (Execution Layer)              │
│  - Sub-cent fees, 1s finality                 │
│  - Fee abstraction (gas in USDC)              │
│  - Uniswap V3 swaps                           │
│  - x402 payment channels                      │
│  - ERC-8004 agent registry                    │
│  - Bankr wallet operations                    │
└──────────────────────────────────────────────┘
```

### Total Effort Estimate

| Track | New Work | Existing Work |
|-------|----------|---------------|
| Venice | ~1-2 hours | Already using it |
| Self | ~4-6 hours | ERC-8004 overlap |
| Celo | ~4-8 hours | Uniswap/viem overlap |
| **Total** | **~9-16 hours** | |

### Maximum Prize Potential

| Track | Prize | Probability |
|-------|-------|-------------|
| Venice 1st | ~$5,750 | HIGH (you already use it) |
| Self | $1,000 | MEDIUM (clean integration) |
| Celo 1st | $3,000 | MEDIUM (requires chain migration) |
| **Total possible** | **$9,750** | |

### Key Insight

Self Protocol is deployed on Celo and built on ERC-8004. Your project ALREADY uses ERC-8004. If you run your agent on Celo and add Self verification, you hit all three sponsor tracks with one coherent project. Venice is already your AI layer — just make sure to showcase the privacy angle.

### Recommended Narrative

"A privacy-preserving AI trading agent that:
- Reasons over sensitive financial data using Venice AI (no data retention)
- Proves it's human-backed via Self Protocol ZK proofs (no personal data exposed)
- Executes stablecoin swaps on Celo with sub-cent fees (real-world accessible)
- Registered on-chain via ERC-8004 with verifiable reputation
- Pays for API access via x402 protocol
- Trades on Uniswap V3 deployed on Celo"
