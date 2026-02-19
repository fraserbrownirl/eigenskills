# EigenSkills — Agent Context

This file provides AI agents with a complete map of the codebase. Read this before exploring.

## Architecture Overview

EigenSkills is a verifiable agent platform on EigenLayer's EigenCompute. Users connect an Ethereum wallet, configure API keys, and deploy a personal AI agent into a Trusted Execution Environment (TEE). The agent routes tasks to skills from a curated GitHub registry using EigenAI, and every action is cryptographically signed.

**Three components:**
1. **Agent** (`agent/`) — Docker container deployed per-user into TEE
2. **Backend** (`backend/`) — Express server orchestrating deploys + SIWE auth
3. **Frontend** (`frontend/`) — Next.js web app for wallet connect, setup, dashboard

**No smart contracts** — the curated GitHub registry is the trust model.

## File Map

### Agent (`agent/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/index.ts` | Express HTTP server, 5 endpoints | App startup, route handlers |
| `src/wallet.ts` | TEE wallet via viem `mnemonicToAccount` | `getAgentAddress()`, `signMessage()` |
| `src/router.ts` | EigenAI skill routing with tool calling | `routeTask()`, `checkGrantStatus()` |
| `src/registry.ts` | Fetches/caches registry.json from GitHub | `listSkills()`, `getSkill()`, `fetchRegistry()` |
| `src/executor.ts` | Sandboxed skill execution | `executeSkill()` |
| `src/logger.ts` | Signed execution log (in-memory, 1000 cap) | `log()`, `getHistory()` |
| `Dockerfile` | TEE-compatible image (linux/amd64, root, Python) | — |

### Backend (`backend/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/index.ts` | Express server + all API routes | App startup, 8 route handlers |
| `src/auth.ts` | SIWE verification + HMAC session tokens | `verifySiweMessage()`, `createToken()`, `requireAuth` middleware |
| `src/db.ts` | SQLite database (users + agents tables) | `createUser()`, `createAgent()`, `getAgentByUser()`, `updateAgent()` |
| `src/eigencompute.ts` | Deploy strategy router (SDK / GitHub Actions / CLI) | `deployAgent()`, `upgradeAgent()`, `stopAgent()`, `startAgent()`, `terminateAgent()`, `getAppInfo()` |
| `src/eigencompute-sdk.ts` | Direct `@layr-labs/ecloud-sdk` integration (no Docker, no CLI) | `deployAgent()`, `upgradeAgent()`, `stopAgent()`, `startAgent()`, `terminateAgent()` |

### Frontend (`frontend/src/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/page.tsx` | Main page — landing/setup/dashboard flow | — |
| `app/layout.tsx` | Root layout, dark theme, Geist fonts | — |
| `components/ConnectWallet.tsx` | MetaMask connect + SIWE sign-in | — |
| `components/AgentSetup.tsx` | 4-step wizard (name, grant, env vars, deploy) | — |
| `components/Dashboard.tsx` | Agent status, controls, task submission | — |
| `lib/wallet.ts` | MetaMask helpers, SIWE message creation | `connectWallet()`, `signSiweMessage()`, `signGrantMessage()` |
| `lib/api.ts` | Backend API client | `verifyAuth()`, `deployAgent()`, `submitTask()`, etc. |

### Registry (`registry/`)

| File | Purpose |
|------|---------|
| `registry.json` | Auto-generated skill index (id, name, contentHash, requiresEnv) |
| `scripts/generate-registry.py` | Validates SKILL.md, computes hashes, writes registry.json |
| `skills/*/SKILL.md` | Skill manifest (YAML frontmatter: name, description, requires_env, execution) |
| `.github/workflows/update-registry.yml` | GitHub Action to regenerate registry.json on push |

## API Contracts

### Backend Routes (all require Bearer token except `/api/auth/verify`)

| Method | Path | Request Body | Response | Description |
|--------|------|--------------|----------|-------------|
| POST | `/api/auth/verify` | `{ message, signature }` | `{ token, address, agent? }` | Verify SIWE, issue session token |
| POST | `/api/agents/deploy` | `{ name, envVars: [{key, value, isPublic}] }` | `{ agent }` | Deploy new agent to EigenCompute |
| POST | `/api/agents/upgrade` | `{ envVars }` | `{ success }` | Update agent env vars |
| POST | `/api/agents/stop` | — | `{ success }` | Pause agent |
| POST | `/api/agents/start` | — | `{ success }` | Resume agent |
| POST | `/api/agents/terminate` | — | `{ success }` | Destroy agent (irreversible) |
| GET | `/api/agents/info` | — | `{ agent }` | Get agent status + metadata |
| POST | `/api/agents/task` | `{ task }` | `{ result, skills, routingSignature, agentSignature }` | Proxy task to agent |

### Agent Routes (no auth — relies on TEE network isolation)

| Method | Path | Request Body | Response | Description |
|--------|------|--------------|----------|-------------|
| POST | `/task` | `{ task, userAddress }` | `{ result, skills, routingSignature, agentSignature }` | Execute task via skill routing |
| GET | `/skills` | — | `{ skills: [...] }` | List available skills (filtered by env vars) |
| GET | `/history` | — | `{ history: [...] }` | Signed execution log |
| GET | `/whoami` | — | `{ address, network, registryUrl, tee }` | Agent identity |
| GET | `/health` | — | `{ status: 'ok' }` | Liveness check |

## Data Flow: Task Execution

```
Frontend                    Backend                     Agent (TEE)
   |                           |                            |
   |-- POST /api/agents/task ->|                            |
   |                           |-- POST /task ------------->|
   |                           |                            |-- listSkills()
   |                           |                            |-- routeTask() [EigenAI tool call]
   |                           |                            |-- executeSkill() [sandboxed]
   |                           |                            |-- signMessage(result)
   |                           |<-- { result, signatures } -|
   |<-- { result, signatures } |                            |
```

## Implementation Status

### Complete
- TEE wallet derivation (viem)
- EigenAI routing with tool calling + grant auth
- Sandboxed skill execution (restricted env vars)
- Signed execution logging
- SIWE authentication (frontend + backend)
- EigenCompute SDK integration — direct TypeScript deploys via `@layr-labs/ecloud-sdk` (no Docker daemon, no CLI)
- Legacy CLI and GitHub Actions deploy paths preserved as fallbacks
- 4-step agent setup wizard
- Dashboard with status, controls, task submission
- Skill registry with 3 skills + GitHub Action CI

### Missing / Incomplete
- No tests (zero coverage)
- Client-generated SIWE nonce (should be server-issued)
- No session persistence (state lost on page refresh)
- No "Update Env Vars" UI (API exists, no frontend)
- No skills list or execution history views in Dashboard
- SQLite database (not production-ready)
- Content hash verification not implemented (registry has hashes, executor doesn't verify)
- WalletConnect installed but unused (MetaMask only)

### Deferred to V2
- EigenLayer AVS integration
- Agent-to-agent communication
- Skill marketplace with payments
- Multi-agent orchestration

## Common Tasks

| Task | Where to Edit |
|------|---------------|
| Add a new backend API route | `backend/src/index.ts` — add route handler, update `requireAuth` if needed |
| Add a new agent endpoint | `agent/src/index.ts` — add Express route |
| Change auth logic | `backend/src/auth.ts` (SIWE verify, token create/verify) |
| Add a new skill | `registry/skills/{name}/SKILL.md` + scripts, push to trigger GitHub Action |
| Change skill execution | `agent/src/executor.ts` — `executeSkill()` function |
| Change EigenAI routing | `agent/src/router.ts` — tool definitions, prompt, response parsing |
| Add frontend component | `frontend/src/components/`, import in `page.tsx` |
| Add API client method | `frontend/src/lib/api.ts` |
| Change database schema | `backend/src/db.ts` — add migration in `initDb()` |

## Known Gotchas

### Deploy Strategy (`DEPLOY_STRATEGY` env var)
The backend supports three deployment strategies, controlled by `DEPLOY_STRATEGY`:

| Strategy | Env Value | Docker Needed? | Description |
|----------|-----------|----------------|-------------|
| **SDK** (default) | `sdk` | No | Uses `@layr-labs/ecloud-sdk` TypeScript package directly. Handles KMS encryption, on-chain transactions, and UserAPI calls internally. Works on any host (Fly.io, Render, Railway, local). |
| **GitHub Actions** | `github-actions` | No (on host) | Triggers a GitHub Actions workflow that runs the `ecloud` CLI. Async — results delivered via webhook. Legacy fallback. |
| **CLI** | `cli` | Yes | Shells out to `ecloud` CLI directly. Only works where Docker daemon is available (local dev). |

The legacy `USE_GITHUB_ACTIONS=true` env var maps to `github-actions` strategy for backward compatibility.

The SDK path uses `prepareDeployFromVerifiableBuild()` which explicitly skips Docker checks and image layering. It fetches the image digest from Docker Hub API, encrypts env vars via the SDK's built-in KMS encryption, and submits the on-chain transaction directly.

### Wallet: viem, not ethers
Agent wallet uses `viem` (`mnemonicToAccount`). The `ethers` package is in dependencies but unused.

### Two Different "EigenAI" Endpoints
- **Grant API:** `https://determinal-api.eigenarcade.com/api/chat/completions` — what the agent actually calls
- **Direct EigenAI:** `https://eigenai-sepolia.eigencloud.xyz/v1/chat/completions` — documented but not used

The router uses the Grant API with wallet signature authentication, not direct EigenAI.

### `_PUBLIC` Suffix Convention
Env vars ending in `_PUBLIC` are visible on-chain in EigenCompute. All others are KMS-encrypted and only decrypted inside the TEE.

### Skill `requires_env` Filtering
`registry.ts` filters skills by whether their `requires_env` vars are present. If a skill requires `OPENAI_API_KEY` and the agent doesn't have it, that skill won't appear in `listSkills()`.

### Dev Mode Behavior
- No `MNEMONIC` env var → `wallet.ts` returns zero-address and dummy signatures
- `SKILL_REGISTRY_LOCAL` env var → `executor.ts` copies from local path instead of git sparse-checkout

### Docker Image Updates via Upgrade
EigenCompute supports in-place image updates that **preserve the wallet**. To deploy new agent code:
1. Rebuild + push Docker image to Docker Hub
2. Call `upgradeAgent()` (Dashboard "Update" or API `POST /api/agents/upgrade`)
3. Wallet address, grants, and instance IP remain unchanged

What stays the same across upgrades:
- App ID
- TEE wallet address (same MNEMONIC)
- Instance IP (usually)
- EigenAI grant activation

What changes:
- Docker image (new attestation generated)
- Environment variables (if updated)

### When to Terminate (Rare)
Only terminate when you want to **permanently destroy** the agent:
- Wallet is destroyed and funds are irrecoverable
- Requires fresh deploy with new wallet address
- New wallet requires new EigenAI grant activation at https://eigenarcade.com

### TEE Constraints (Critical for Architecture)

**No Persistent Storage**
- EigenCompute has no volumes, no disk mounts, no persistent filesystem
- Container filesystem is wiped on every `stop`/`start`/`upgrade`
- All persistence must go through external storage (Supabase, backend API, IPFS)
- Use signed-state pattern: sign state before saving, verify signature when loading

**Trust Anchors**
- **Wallet** = identity anchor (persists across upgrades, destroyed on terminate)
- **Docker image** = trust anchor (attestation proves this exact image runs)
- **TEE attestation** = binding (proves only this image can access the wallet)

**Attestation is Docker-Digest-Specific**
- On-chain record proves the SHA-256 digest of the deployed image
- If agent modifies its own files at runtime, modified code runs **unattested**
- This breaks verifiability — never self-modify source files

**Evolution Strategies**
- **Config-driven** (recommended): same image, behavior changes through external config/data
- **Upgrade-mediated**: new image via `upgrade`, new attestation, wallet preserved

See `docs/eigencompute-reference.md` for detailed documentation.

## Reference Docs

For deeper details, read these in `docs/`:
- `eigenskills-build-plan.md` — Full architecture, component design, build phases
- `eigenai-reference.md` — EigenAI API, grant auth flow, signature verification
- `eigencompute-reference.md` — Dockerfile requirements, CLI commands, env vars
- `README.md` — Setup instructions, troubleshooting
