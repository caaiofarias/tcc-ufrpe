import type { Revocation } from './Revocation.js';

export interface RevocationRepository {
  save(revocation: Revocation): Promise<void>;
  findByCredentialId(credentialId: string): Promise<Revocation | null>;
  confirmOnChain(id: string, txHash: string, at: Date): Promise<void>;
}
