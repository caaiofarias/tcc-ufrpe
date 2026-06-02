import type { Credential } from './Credential.js';
import type { CredentialType } from './CredentialType.js';

/**
 * Port for persisting Credential records. Implementation lives in
 * infrastructure/persistence/prisma/repositories.
 */
export interface CredentialRepository {
  create(credential: Credential): Promise<Credential>;
  findById(id: string): Promise<Credential | null>;
  findByVcHash(vcHash: string): Promise<Credential | null>;
  findBySbtTokenId(tokenId: bigint): Promise<Credential | null>;
  findActiveByHolderAndType(holderId: string, type: CredentialType): Promise<Credential | null>;
  findPendingOlderThan(date: Date): Promise<Credential[]>;
  update(credential: Credential): Promise<Credential>;
  listByHolder(holderId: string): Promise<Credential[]>;
}
