/**
 * Port for the institution's signing key. Today reads from env;
 * could be backed by KMS/HSM in production.
 */
export interface Signer {
  getInstitutionDid(): string;
  getKeyId(): string;
  getAlgorithm(): string;
  sign(payload: Uint8Array): Promise<Uint8Array>;
  getPublicJwk(): Promise<Record<string, unknown>>;
}
