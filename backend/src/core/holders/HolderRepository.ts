import type { Holder } from './Holder.js';

export interface HolderRepository {
  upsertByDid(input: { did: string; address: string; firstSeenAt: Date }): Promise<Holder>;
  findByDid(did: string): Promise<Holder | null>;
  findById(id: string): Promise<Holder | null>;
  touch(id: string, at: Date): Promise<void>;
}
