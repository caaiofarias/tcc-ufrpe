import type { AuthChallenge } from './AuthChallenge.js';

export interface AuthChallengeRepository {
  save(challenge: AuthChallenge): Promise<void>;
  findByNonce(nonce: string): Promise<AuthChallenge | null>;
  consume(id: string, consumedAt: Date): Promise<void>;
}
