import type { Institution } from './Institution.js';

export interface InstitutionRepository {
  findById(id: string): Promise<Institution | null>;
  findByDid(did: string): Promise<Institution | null>;
  findByDomain(domain: string): Promise<Institution | null>;
}
