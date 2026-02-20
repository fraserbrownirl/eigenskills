# SkillsSeal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![EigenCompute](https://img.shields.io/badge/EigenCompute-TEE-green.svg)](https://docs.eigencloud.io/)

A verifiable agent platform built on EigenCompute. Deploy your own AI agent into a Trusted Execution Environment with a sovereign wallet, encrypted API keys, and cryptographic proof of every action.

## Features

- **Sovereign Wallet** — Each agent gets a unique wallet generated inside the TEE. Only your agent can access its keys.
- **Verifiable Execution** — Every response is signed by your agent and verified by EigenAI. Full audit trail.
- **Encrypted Config** — API keys are encrypted with KMS and only decrypted inside the TEE.
- **Curated Skills** — Modular skill registry with content hash verification for tamper detection.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│   Frontend  │────▶│   Backend   │────▶│     Agent (TEE)             │
│   Next.js   │     │   Express   │     │  ┌─────────────────────────┐│
│             │     │             │     │  │ Sovereign Wallet (viem) ││
│  • SIWE     │     │  • Auth     │     │  │ EigenAI Router          ││
│  • Deploy   │     │  • Deploy   │     │  │ Skill Executor          ││
│  • Tasks    │     │  • Proxy    │     │  │ Signed Logger           ││
└─────────────┘     └─────────────┘     │  └─────────────────────────┘│
                                        └─────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- [ecloud CLI](https://docs.eigencloud.io/) with billing enabled
- Docker (for building agent image)
- MetaMask browser extension

### 1. Clone and Install

```bash
git clone https://github.com/38d3b7/eigenskills-v2.git
cd eigenskills-v2

# Install all components
cd agent && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
EIGENCOMPUTE_PRIVATE_KEY=your_ecloud_wallet_private_key
AGENT_IMAGE_REF=your_dockerhub_username/skillsseal-agent:latest
EIGENCOMPUTE_ENVIRONMENT=sepolia
```

### 3. Build and Push Agent Image

```bash
cd agent
docker build --platform linux/amd64 -t YOUR_USERNAME/skillsseal-agent:latest .
docker push YOUR_USERNAME/skillsseal-agent:latest
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open http://localhost:3000 and connect your wallet to deploy an agent.

## Project Structure

```
skillsseal/
├── agent/          # Agent container (deployed to TEE)
├── backend/        # Orchestration API (Express)
├── frontend/       # Web dashboard (Next.js)
├── registry/       # Skill registry (GitHub-hosted)
└── docs/           # Architecture and reference docs
```

## Documentation

- [Development Guide](docs/README.md) — Full setup instructions, troubleshooting
- [Architecture](docs/eigenskills-build-plan.md) — System design, API contracts, build plan
- [EigenAI Reference](docs/eigenai-reference.md) — LLM API, tool calling, grant auth
- [EigenCompute Reference](docs/eigencompute-reference.md) — CLI, Dockerfile, deployment

## How It Works

1. **Connect** — Sign in with Ethereum (SIWE) using MetaMask
2. **Configure** — Set API keys (encrypted in TEE, never visible to platform)
3. **Deploy** — Launch your agent on EigenCompute's Trusted Execution Environment
4. **Interact** — Submit tasks; agent routes to skills via EigenAI and signs results

## Skill Registry

Skills are curated in a [separate repository](https://github.com/38d3b7/eigenskills). Each skill:

- Has a `SKILL.md` manifest with metadata and execution steps
- Declares required environment variables
- Is content-hashed for integrity verification

## License

[MIT](LICENSE)
