import type { CredentialType } from '@core/credentials/CredentialType.js';

/**
 * Port for interacting with the AcademicSBT smart contract.
 * Implementation lives in infrastructure/blockchain/EthersBlockchainAnchor.ts.
 */
export interface BlockchainAnchor {
  /**
   * Mints a new SBT for the given holder address.
   * Resolves once the transaction is confirmed (synchronous wait).
   */
  mint(input: {
    to: string;
    vcHash: string;
    credentialType: CredentialType;
  }): Promise<{ tokenId: bigint; txHash: string }>;

  /**
   * Revokes an existing credential by tokenId.
   */
  revoke(input: { tokenId: bigint; reason: string }): Promise<{ txHash: string }>;

  /**
   * Reads on-chain credential state.
   */
  getCredential(tokenId: bigint): Promise<{
    vcHash: string;
    issuedAt: Date;
    revoked: boolean;
    credentialType: string;
  }>;

  /**
   * Used by reconciliation: find tokenId by vcHash via event logs.
   */
  findTokenIdByVcHash(vcHash: string): Promise<bigint | null>;
}
