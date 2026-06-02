import type { Signer } from './Signer.js';

/**
 * Port for issuing SD-JWT VCs. Implementation wraps @sd-jwt/* libraries.
 */
export interface SdJwtIssuer {
  issue(input: {
    sdClaims: Record<string, unknown>;
    alwaysDisclosed: Record<string, unknown>;
    decoyCount: number;
    signer: Signer;
    hashAlg: 'sha-256';
  }): Promise<{
    issuerSignedJwt: string;
    disclosures: string[];
  }>;
}
