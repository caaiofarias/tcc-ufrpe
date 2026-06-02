# Academic SBT Backend — Project Summary

This document summarizes the architectural decisions, design rationale, and current implementation state of the Academic SBT Backend, the result of a planning session before implementation begins. It is meant to be read by Claude Code (or any developer) picking up the project to ensure consistency with the original design.

## Context: TCC scope

Architecture proposal for digital academic certification combining:

- **Soulbound Token (SBT)** as immutable on-chain anchor
- **Verifiable Credential with SD-JWT (RFC 9901) + Key Binding** as portable off-chain credential format with selective disclosure
- **Visual identity** based on institutional template rendered locally
- Analysis of LGPD compliance and critical discussion of the limits and conditional utility of blockchain anchoring

The smart contract `AcademicSBT` is already implemented in Solidity using Foundry (ERC-721 + ERC-5192 + AccessControl). Theoretical foundation and DSR research methodology are already written. Pending implementation: this backend, a CLI for the university, and mobile apps for holder and verifier.

## Stack

- **Node.js 20+ / TypeScript** (ESM, modern modules)
- **Fastify** as HTTP framework (schema-first, performant)
- **Prisma + PostgreSQL** for persistence
- **ethers.js** for blockchain interaction
- **@sd-jwt/core, @sd-jwt/sd-jwt-vc, @sd-jwt/crypto-nodejs** for SD-JWT
- **argon2** for password hashing
- **zod** for schema validation
- **Vitest** for testing
- **ESLint + Prettier + Husky + lint-staged** for code quality

## Architecture

Three-layer architecture inspired by DDD/hexagonal, without canonical overhead (no aggregates, domain events, DI container, or excessive value objects):

- **`src/core`** — pure domain: entities, value objects, ports (interfaces). No framework, no database, no blockchain.
- **`src/application`** — use cases that orchestrate the domain. Receive ports via injection.
- **`src/infrastructure`** — concrete adapters: HTTP (Fastify), persistence (Prisma), blockchain (ethers), crypto (sd-jwt, argon2).

Within each layer, organization is **by domain context** (credentials, holders, institution, revocation, auth).

Manual DI in `infrastructure/config/container.ts` (no Inversify or similar).

## Core architectural decisions

### Holder identity: did:ethr

A single secp256k1 key handles everything: receives the SBT, identifies the VC subject, signs the Key Binding, and authenticates login. Rationale: cryptographic coherence between on-chain and off-chain holder identity.

Alternatives considered and rejected:

- `did:key` with separate Ethereum address — would create two keys for the holder and break the link between SBT owner and VC subject.
- University generates the key for the student — violates SSI principle of holder sovereignty.

### vcHash (what goes on-chain)

`SHA-256` of the issuer-signed JWT in compact form, **without disclosures**. This allows the verifier to recompute the hash from any partial presentation. It captures "this university issued this exact JWT"; it does not capture the content of claims (that is already covered by `_sd` in the SD-JWT off-chain).

Rationale for the discussion section of the thesis: on-chain anchoring does NOT duplicate the JWT signature guarantee; it adds **timestamp**, **decentralized revocation status**, and **public auditability of existence**. These are orthogonal to JWT signature.

### VC is never persisted server-side

Generated in memory during issuance, returned to the holder once, then discarded. Recovery in case of loss = **revocation + reissuance** (with `reissuanceOfId` link tracking history). Pure SSI principle, aligned with LGPD data minimization.

Operational consequences:

- Failure during transmission = reissuance (new vcHash, new tokenId)
- The CLI may offer "show QR again" while in the same session, but once the issuance flow closes, the VC is gone
- Reissuance is an explicit use case: revokes the original, mints a new credential, links via `reissuanceOfId`
- For the thesis: the institution does not store the credential, transferring all custody responsibility to the holder, fully aligned with SSI sovereignty

### PII separated from cryptographic metadata

`StudentRecord` holds personal data; `Credential` holds only metadata (vcHash, sbtTokenId, txHash, status). LGPD right-to-erasure deletes `StudentRecord` without affecting on-chain integrity or the VC held by the holder.

### Decoy digests

Enabled at issuance (3 by default, configurable via `SD_JWT_DECOY_COUNT`). Mitigates the leakage of claim count via the size of the `_sd` array in the issuer-signed JWT.

### Dual revocation

Flag `revoked` in the SBT (authoritative, decentralized) + Status List 2021 published as a signed VC (fast, spec-compliant). The verifier checks the Status List first (off-chain, fast); on-chain serves as the authoritative source of truth in case of mismatch.

For the thesis: this is the concrete demonstration of "conditional utility of blockchain". The Status List is the industry standard; on-chain anchoring adds an additional guarantee that survives compromise of the institution's infrastructure.

### 100% offline presentation

Bidirectional QR codes between holder and verifier apps. Verifier initiates by displaying a QR with the presentation request (required claims, nonce, audience); holder selects claims and shows a QR with the VP (issuer-signed JWT + chosen disclosures + KB-JWT). The university backend **does not participate** in presentation.

Remote presentation modalities (callback URL, DIDComm mediator, opaque relay) are **future work** documented in the thesis.

### sbtTokenId travels alongside the VP

Not inside the JWT — solves the circularity of "JWT would need tokenId, but tokenId only emerges after mint". The verifier receives the tokenId in the presentation payload to query on-chain.

QR transmission format from holder to verifier:

```
{
  vp: "<issuer-signed-jwt>~<chosen-disclosures>~<kb-jwt>",
  sbtTokenId: "42",
  contractAddress: "0x..."
}
```

### Authentication

- **University**: traditional JWT, argon2id, roles ADMIN/ISSUER
- **Holder**: passwordless challenge-response (SIWE-style — backend generates nonce, holder signs with did:ethr key, backend validates and issues session JWT)
- **Verifier**: none. Standalone app that only talks to blockchain and public JWKS

### Key management

Cryptographic keys abstracted via `Signer` port. Current implementation reads from env (`EnvKeyProvider`); KMS/HSM is the production hook (documented as future work in the thesis).

## Issuance flow (canonical sequence)

1. Student generates `did:ethr` locally in the app, displays QR
2. University staff scans via CLI, calls `POST /credentials` with student claims
3. Backend validates auth/role, upserts the `Holder`, checks for active duplicate
4. Backend builds the SD-JWT in memory (issuer-signed JWT + disclosures + decoys), computes `vcHash`
5. Backend persists `Credential` as `PENDING` **already with vcHash populated** (transaction 1) — allows reconciliation if subsequent steps fail
6. Backend calls `mint(address, vcHash, type)` on the contract, awaits receipt
7. Backend updates `Credential` to `ISSUED` + allocates Status List slot + writes AuditLog (transaction 2)
8. Backend returns `sdJwtCompact` to CLI; CLI generates QR; student scans with app
9. App validates institutional signature (via public JWKS), checks `cnf`, stores encrypted locally
10. Server discards VC from memory

**Important**: two database transactions split by the mint, intentionally. Avoids holding a connection open for seconds waiting for the blockchain, and allows post-failure reconciliation if the server crashes between confirmed mint and final update.

## Reconciliation strategy

For credentials stuck in `PENDING` beyond a threshold (e.g., 5 minutes), a job:

1. Fetches `Credential` records with `status = PENDING` and `createdAt` older than the threshold
2. Calls `BlockchainAnchor.findTokenIdByVcHash(vcHash)` (uses `CredentialIssued` event filter)
3. If found: updates the credential to `ISSUED` with the obtained tokenId
4. If not found and very stale (e.g., >1h): marks as `FAILED`

This works because `vcHash` is already persisted in transaction 1 (before the mint).

For the prototype, this can be a manual endpoint or CLI command. For production, a periodic worker.

## Project layout

```
academic-sbt-backend/
├── src/
│   ├── core/
│   │   ├── credentials/       # Credential, CredentialStatus, CredentialType, VcHash, StudentRecord, repos
│   │   ├── holders/           # DID (did:ethr validation), Holder, HolderRepository
│   │   ├── institution/       # empty, populate
│   │   ├── revocation/        # empty
│   │   ├── auth/              # empty
│   │   ├── audit/             # empty
│   │   ├── ports/             # BlockchainAnchor, SdJwtIssuer, Signer, HashFunction, Clock,
│   │   │                      # UnitOfWork, PasswordHasher, SessionTokenService,
│   │   │                      # ChallengeSignatureVerifier
│   │   └── shared/errors/     # DomainError + subclasses
│   ├── application/
│   │   └── credentials/       # IssueCredentialUseCase with detailed flow docstring
│   ├── infrastructure/
│   │   ├── config/            # env.ts (Zod validation), container.ts (DI stub)
│   │   ├── http/              # server.ts (Fastify + healthcheck)
│   │   ├── persistence/prisma/repositories/   # empty
│   │   ├── blockchain/abi/    # place AcademicSBT.json here
│   │   └── crypto/            # empty
│   └── main.ts                # entrypoint with graceful shutdown
├── prisma/
│   └── schema.prisma          # all models and enums
├── tests/                     # unit, integration, e2e — empty
├── package.json, tsconfig.json, eslint.config.js, .prettierrc
├── docker-compose.yml         # Postgres 16
├── vitest.config.ts
├── .env.example               # all variables documented
├── .husky/                    # pre-commit (lint-staged), pre-push (tests)
└── README.md
```

## Prisma schema (main models)

- `Institution` — university
- `InstitutionUser` — staff (with Role: ADMIN | ISSUER)
- `Holder` — registered by did:ethr on first interaction
- `AuthChallenge` — nonces for challenge-response login
- `HolderSession` — holder refresh tokens
- `Credential` — issuance metadata (no VC), with `reissuanceOfId` for reissuance history
- `StudentRecord` — separated PII (supports LGPD erasure)
- `Revocation` — revocation records
- `StatusList` + `StatusListEntry` — versioned Status List 2021
- `AuditLog` — append-only, records all sensitive operations

Enums: `Role`, `CredentialStatus` (PENDING|ISSUED|REVOKED|FAILED), `CredentialType` (BACHELOR|LICENTIATE|TECHNOLOGIST|POSTGRAD_LATO|POSTGRAD_STRICTO|SEQUENTIAL — mirrors the contract), `AuditAction`.

## Planned endpoints

### Public (no auth)

- `GET /.well-known/jwks.json` — institutional public key
- `GET /.well-known/did.json` — DID Document (if did:web)
- `GET /institution/metadata`
- `GET /institution/templates/:credentialType` — visual template SVG/HTML
- `GET /credentials/:tokenId/metadata` — ERC-721 JSON (no PII)
- `GET /status-list/:listId` — Status List as signed VC
- `GET /health`

### Auth

- `POST /auth/institution/login | refresh | logout`
- `POST /auth/holder/challenge` — request nonce
- `POST /auth/holder/verify` — sign nonce with did:ethr and receive session
- `POST /auth/holder/refresh | logout`

### University management (authenticated)

- `GET|POST|PATCH|DELETE /institution/users` (admin)
- `POST /credentials` (issuer) — issuance
- `GET /credentials` (issuer) — listing
- `POST /credentials/:id/revoke` (issuer)
- `POST /credentials/:id/reissue` (issuer)
- `DELETE /credentials/:id/student-record` (admin) — LGPD erasure

### Holder (authenticated)

- `GET /holder/me`
- `GET /holder/credentials` — own only

### Status List (admin)

- `POST /status-list/publish`

## Implementation status

### Already done

- Full directory structure
- Configuration files: package.json, tsconfig, eslint, prettier, vitest, husky, docker-compose, .env.example
- Complete Prisma schema with all models, enums, indexes, and comments explaining LGPD intent
- Core entities and value objects: `Credential`, `CredentialStatus`, `CredentialType`, `VcHash`, `StudentRecord`, `Holder`, `DID`
- Repository ports (interfaces): `CredentialRepository`, `StudentRecordRepository`, `HolderRepository`
- Infrastructure ports: `BlockchainAnchor`, `SdJwtIssuer`, `Signer`, `HashFunction`, `Clock`, `UnitOfWork`, `PasswordHasher`, `SessionTokenService`, `ChallengeSignatureVerifier`
- Domain errors hierarchy
- `IssueCredentialUseCase` skeleton with detailed flow docstring
- `main.ts` entrypoint with graceful shutdown
- `infrastructure/config/env.ts` with full Zod validation
- `infrastructure/config/container.ts` skeleton
- `infrastructure/http/server.ts` with Fastify + healthcheck

### Pending implementation

1. **`IssueCredentialUseCase` body** — follow the docstring already in the file
2. **Other use cases**:
   - `RevokeCredentialUseCase`
   - `ReissueCredentialUseCase` (composes revoke + issue)
   - `LoginInstitutionUserUseCase`
   - `RequestHolderChallengeUseCase` + `VerifyHolderChallengeUseCase`
   - `EraseStudentRecordUseCase` (LGPD)
   - `PublishStatusListUseCase`
   - `RegisterHolderUseCase`
   - `CreateInstitutionUserUseCase` and other admin operations
3. **Concrete port implementations in `infrastructure/`**:
   - `EthersBlockchainAnchor` — uses ABI in `infrastructure/blockchain/abi/AcademicSBT.json`
   - `SdJwtIssuerImpl` — wraps `@sd-jwt/*` libraries
   - `SdJwtVerifierImpl` — for the eventual verifier (or library used by mobile)
   - `EnvKeyProvider` (implements `Signer`)
   - `Sha256HashFunction`
   - `Argon2PasswordHasher`
   - `JwtSessionService`
   - `DidEthrResolverImpl`
   - Prisma repositories: `PrismaCredentialRepository`, `PrismaHolderRepository`, `PrismaStudentRecordRepository`, etc.
   - `PrismaUnitOfWork`
4. **HTTP routes** in `infrastructure/http/routes/` calling use cases
5. **Middlewares**: `requireInstitutionAuth`, `requireHolderAuth`, `requireRole`
6. **Full DI wiring** in `container.ts`
7. **Initial Prisma migration**
8. **Tests**:
   - Unit on use cases and entities (in-memory port mocks)
   - Integration on adapters (real Prisma + test Postgres)
   - E2E of the issuance flow (real anvil, real Prisma)
9. **University CLI** (decide whether same repo or separate)
10. **Sepolia deploy of the contract** at the end

## Implementation guidelines

### Strict rules

- **Never log `sdJwtCompact`** at any layer. The VC is sensitive and ephemeral.
- **Never persist the VC**. The `Credential` entity holds metadata only. The `vcHash` is the cryptographic identifier of the issuance, not VC content.
- **Two transactions split by the mint** in `IssueCredentialUseCase`. Don't wrap the blockchain call inside a DB transaction.
- **vcHash recorded in the first transaction** (before the mint). This enables reconciliation.
- **Synchronous mint** (waits for the receipt). Instant in local Foundry; ~15-30s in Sepolia.
- **Always validate `did:ethr` format** before extracting Ethereum address. Reject other DID methods explicitly.
- **AuditLog has no delete endpoint**. Append-only at the application level.

### Conventions

- **TS path aliases**: `@core/*`, `@application/*`, `@infrastructure/*` (configured in tsconfig and vitest)
- **Imports use `.js` extension** (modern ESM with TypeScript)
- **Repositories are interfaces in core**, concrete implementations in infrastructure
- **Use cases receive ports via constructor**, never concrete types
- **Errors thrown by domain are `DomainError` subclasses**; HTTP layer translates to status codes
- **Validation in two layers**: Fastify schema (input format) + use case (domain invariants)

### Decision points to revisit during implementation

- **QR size for VC delivery**: VC compact ranges 1-3KB. If it gets tight in QR, use animated QR (UR — Uniform Resources standard) or split into multiple frames. Probably not needed for prototype, document if you do.
- **QR size for VP**: same problem. Mitigate with `gzip` before encoding.
- **Decoy count**: 3 is the default; tune based on observed VC size.
- **Token blacklist for refresh tokens**: not modeled now; add a `RevokedRefreshToken` table if needed.

## Documents to maintain

- **`docs/`** — Architecture Decision Records (ADRs). Whenever a non-trivial decision is made during implementation that changes the original design, register it as an ADR. This material goes directly into the discussion chapter of the thesis.

## Contract context (already implemented externally)

The `AcademicSBT` contract:

- Is ERC-721 + ERC-721Enumerable + ERC-5192 (Soulbound) + AccessControl
- Has an `ISSUER_ROLE` for the institution wallet
- Function `mint(address to, bytes32 vcHash, string credentialType) returns (uint256 tokenId)`
- Function `revoke(uint256 tokenId, string reason)`
- Function `getCredential(uint256 tokenId) returns (bytes32 vcHash, uint256 issuedAt, bool revoked, string vcType)`
- Maintains `_vcHashUsed` mapping that prevents duplicate issuance with the same hash
- Emits events `CredentialIssued`, `CredentialRevoked`, `Locked`, `Unlocked`
- Soulbound enforcement: blocks transfers while not revoked
- `tokenURI` returns `<baseURI>/<tokenId>` — the backend must serve this endpoint with public ERC-721 metadata (no PII)

The ABI must be placed in `src/infrastructure/blockchain/abi/AcademicSBT.json` for the `EthersBlockchainAnchor` to consume.

## For the discussion chapter of the thesis

Concrete points already prepared by the architecture for critical analysis:

1. **Conditional utility of blockchain anchoring**: the JWT signature already proves authorship; on-chain adds timestamp, decentralized revocation, and existence auditability. They are complementary, not redundant.
2. **Holder sovereignty**: server does not retain the VC; loss = explicit reissuance.
3. **LGPD data minimization**: PII separated from metadata; right-to-erasure preserves on-chain integrity.
4. **Privacy limits of SD-JWT**: claim count leakage via `_sd`, mitigated with decoys but not fully eliminated.
5. **Trade-off of `did:ethr` vs `did:key`**: chose `did:ethr` for cryptographic coherence with the SBT, at the cost of losing key rotation (the key IS the identifier).
6. **Mutability of `_baseTokenUri`**: visual representation of the diploma depends on a mutable reference controlled by the institution; immutable data stays on-chain.
7. **Limits of presentation in the prototype**: 100% offline via QR, with remote modalities (callback URL, DIDComm mediator, opaque relay) analyzed conceptually as future work.
8. **Issuer key custody**: the prototype uses env; production requires HSM/KMS — abstracted via `Signer` port.
9. **Single point of failure of the institution as issuer**: even with on-chain anchoring, the JWT is issued by the institution; if its key is compromised, fraudulent credentials are possible (mitigatable with multisig or threshold signing — future work).