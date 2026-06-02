import type { HolderSession } from './HolderSession.js';

export interface HolderSessionRepository {
  save(session: HolderSession): Promise<void>;
  findByRefreshToken(hashedToken: string): Promise<HolderSession | null>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  revokeAllForHolder(holderId: string, revokedAt: Date): Promise<void>;
}
