---
name: base-chain-config
description: >
  USDC contract addresses, RPC endpoints, and gas config for Base L2.
  Referenced by any skill that constructs on-chain transactions.
---

# Base Chain Configuration

PayToll operates on Base L2 using USDC for all payments.

## Contract Addresses

| Contract | Base Mainnet | Base Sepolia |
|----------|-------------|--------------|
| USDC     | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| x402 Facilitator | TBD — check PayToll docs | TBD |

## RPC Endpoints

```
Base Mainnet:  https://mainnet.base.org
Base Sepolia:  https://sepolia.base.org
```

## Gas Considerations

Base L2 has minimal gas costs (typically <$0.01 per tx). The x402 payment
itself is the primary cost, not gas. However, the TEE wallet needs a small
ETH balance on Base for gas:

- **Funding path**: Bridge ETH from Ethereum mainnet → Base via the
  official Base Bridge, or receive from a faucet (Sepolia)
- **Minimum balance**: ~0.001 ETH recommended for operational buffer
- **Monitoring**: The [[session-spending]] tracker should alert if
  gas balance drops below threshold

## USDC Approval

Before the first x402 payment, the wallet must approve the x402 Facilitator
contract to spend USDC. This is a one-time transaction:

```solidity
USDC.approve(x402Facilitator, type(uint256).max)
```

The [[tee-wallet-bridge]] should handle this automatically on first use.

## Network Selection

The agent determines mainnet vs sepolia from the `ENVIRONMENT` env var
already used by the EigenSkills deploy flow:

- `ENVIRONMENT=production` → Base Mainnet
- `ENVIRONMENT=development` → Base Sepolia

## See Also

- [[tee-wallet-bridge]] for how transactions are signed
- [[x402-protocol]] for how these addresses appear in 402 challenges
