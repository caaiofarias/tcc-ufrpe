import type { InstitutionUser } from './InstitutionUser.js';

export interface InstitutionUserRepository {
  findByEmail(email: string): Promise<InstitutionUser | null>;
  findById(id: string): Promise<InstitutionUser | null>;
  save(user: InstitutionUser): Promise<void>;
  updateLastLoginAt(id: string, at: Date): Promise<void>;
}
