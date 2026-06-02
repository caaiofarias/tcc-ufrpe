/**
 * Manual dependency injection. Wire all adapters and use cases here,
 * then expose them on the container object passed to the HTTP layer.
 *
 * This file intentionally avoids any DI library — explicit wiring keeps
 * the dependency graph readable and trivial to follow.
 */

import type { Env } from './env.js';

export interface Container {
  // Repositories
  // credentials: CredentialRepository;
  // holders: HolderRepository;
  // ...

  // Adapters
  // anchor: BlockchainAnchor;
  // sdJwtIssuer: SdJwtIssuer;
  // ...

  // Use cases
  // issueCredential: IssueCredentialUseCase;
  // revokeCredential: RevokeCredentialUseCase;
  // ...

  dispose(): Promise<void>;
}

export async function buildContainer(_env: Env): Promise<Container> {
  // TODO: instantiate Prisma client, repositories, adapters, use cases.
  return {
    async dispose() {
      // TODO: close Prisma client, blockchain provider, etc.
    },
  };
}
