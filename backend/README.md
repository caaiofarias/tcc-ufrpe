# Academic SBT Backend

Backend for academic credential issuance using:

- **Soulbound Tokens (SBT)** as immutable on-chain anchor
- **Verifiable Credentials with SD-JWT (RFC 9901) + Key Binding** as portable, off-chain credential format with selective disclosure

## Architecture

Three-layer architecture inspired by DDD and hexagonal:

- **`src/core`** — Domain entities, value objects, and ports (interfaces). No framework, no database, no blockchain. Pure business rules.
- **`src/application`** — Use cases. Orchestrates the domain to fulfill operations. Depends on ports, not implementations.
- **`src/infrastructure`** — Concrete adapters: HTTP (Fastify), persistence (Prisma), blockchain (ethers), crypto (sd-jwt, argon2), config.

## Key design decisions

1. **VC is never persisted server-side.** Generated in memory, delivered to the holder, discarded. Recovery happens via revocation + reissuance.
2. **PII is separated** from credential metadata (`StudentRecord` vs `Credential`) to support LGPD right-to-erasure without compromising audit integrity.
3. **Holder identity** uses `did:ethr` so a single secp256k1 key handles SBT ownership, VC subject identification, and Key Binding.
4. **Revocation is dual:** flag in the SBT (authoritative, decentralized) + Status List 2021 (fast, spec-compliant).
5. **Presentation is fully offline** via bidirectional QR codes between holder and verifier apps. Backend is not in the loop after issuance.

## Getting started

### Prerequisites

- Node.js >= 20
- Docker (for local Postgres)
- A running EVM node (Foundry's `anvil` for local dev)
- The `AcademicSBT` contract deployed and the issuer wallet holding `ISSUER_ROLE`

### Setup

```bash
# Install dependencies
npm install

# Start Postgres
docker compose up -d

# Configure environment
cp .env.example .env
# fill in the values, especially:
#   - DATABASE_URL
#   - SBT_CONTRACT_ADDRESS
#   - ISSUER_WALLET_PRIVATE_KEY
#   - INSTITUTION_SIGNING_KEY_BASE64
#   - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Start in dev mode
npm run dev
```

### Useful commands

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # Vitest (all)
npm run test:unit      # Unit tests only
npm run prisma:studio  # Open Prisma Studio
```

## Project layout

```
.
├── src/
│   ├── core/                    # Domain (pure)
│   ├── application/             # Use cases
│   ├── infrastructure/          # Adapters
│   └── main.ts                  # Entrypoint
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                        # Architecture notes, ADRs
└── scripts/                     # Operational scripts
```

## Status

Early scaffolding. See `docs/` for architecture decisions.
