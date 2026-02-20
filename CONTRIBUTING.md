# Contributing to SkillsSeal

Thank you for your interest in contributing to SkillsSeal! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Be respectful and inclusive. We welcome contributors of all experience levels.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Docker (for agent development)
- MetaMask browser extension
- [ecloud CLI](https://docs.eigencloud.io/) (for deployment testing)

### Local Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/eigenskills-v2.git
   cd eigenskills-v2
   ```

2. **Install dependencies**

   ```bash
   cd agent && npm install && cd ..
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Configure environment**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run development servers**

   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend  
   cd frontend && npm run dev

   # Terminal 3: Agent (optional, for local testing)
   cd agent && npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation updates
- `refactor/description` — Code refactoring

Examples:
- `feature/add-skill-search`
- `fix/auth-token-expiry`
- `docs/update-deployment-guide`

### Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]
```

Types:
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Formatting (no code change)
- `refactor` — Code refactoring
- `test` — Adding tests
- `chore` — Maintenance tasks

Examples:
```
feat(agent): add skill content hash verification
fix(backend): handle expired SIWE nonce
docs(readme): add troubleshooting section
```

## Code Style

### TypeScript

- Use TypeScript strict mode (already configured)
- Prefer `const` over `let`
- Use explicit return types for exported functions
- Avoid `any` — use proper types or `unknown`

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for React components
- **Variables/Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **React Components**: `PascalCase`

### Project-Specific Patterns

- Use `viem` for wallet operations (not ethers)
- EigenAI model: `gpt-oss-120b-f16`
- Environment variables ending in `_PUBLIC` are visible on-chain
- Skills declare `requires_env` for sandboxed execution

### Linting

Run linting before committing:

```bash
# Frontend
cd frontend && npm run lint

# Backend (coming soon)
cd backend && npm run lint

# Agent (coming soon)
cd agent && npm run lint
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes** with clear, focused commits

3. **Test your changes**
   - Run the app locally
   - Test affected functionality
   - Add tests if applicable

4. **Push and create a PR**

   ```bash
   git push origin feature/your-feature
   ```

5. **Fill out the PR template**
   - Describe what changes you made
   - Explain why the changes are needed
   - List any breaking changes
   - Include screenshots for UI changes

### PR Requirements

- [ ] Code follows the style guidelines
- [ ] Self-reviewed the changes
- [ ] Added/updated tests if applicable
- [ ] Updated documentation if needed
- [ ] No linting errors
- [ ] Builds successfully

### Review Process

- PRs require at least one approval
- Address review feedback promptly
- Keep PRs focused — split large changes into smaller PRs

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Relevant logs or screenshots

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)

## Questions?

Open a GitHub issue or discussion for any questions about contributing.
