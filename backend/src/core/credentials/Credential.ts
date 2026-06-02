/**
 * Credential — institutional record of an issued VC.
 *
 * Note on vcHash: this is the SHA-256 of the issuer-signed JWT, used as
 * the cryptographic identifier of the issuance and as the on-chain anchor.
 * It is NOT the VC itself — the VC (sdJwtCompact) is delivered to the
 * holder at issuance time and never persisted server-side.
 */

import { CredentialType } from './CredentialType.js';
import { CredentialStatus } from './CredentialStatus.js';

export interface CredentialProps {
  id: string;
  institutionId: string;
  holderId: string;
  issuedByUserId: string;
  vcHash: string;
  sbtTokenId: bigint | null;
  txHash: string | null;
  credentialType: CredentialType;
  status: CredentialStatus;
  issuedAt: Date;
  revokedAt: Date | null;
  blockchainConfirmedAt: Date | null;
  reissuanceOfId: string | null;
}

export class Credential {
  private constructor(private readonly props: CredentialProps) {}

  static create(props: CredentialProps): Credential {
    return new Credential(props);
  }

  get id() {
    return this.props.id;
  }
  get vcHash() {
    return this.props.vcHash;
  }
  get status() {
    return this.props.status;
  }
  get holderId() {
    return this.props.holderId;
  }
  get sbtTokenId() {
    return this.props.sbtTokenId;
  }

  /**
   * Domain rule: a credential can only be revoked once, and only if currently issued.
   */
  revoke(at: Date): void {
    if (this.props.status !== CredentialStatus.ISSUED) {
      throw new Error(`Cannot revoke credential in status ${this.props.status}`);
    }
    this.props.status = CredentialStatus.REVOKED;
    this.props.revokedAt = at;
  }

  /**
   * Marks the credential as confirmed on-chain after a successful mint.
   */
  confirmOnChain(sbtTokenId: bigint, txHash: string, at: Date): void {
    if (this.props.status !== CredentialStatus.PENDING) {
      throw new Error(`Cannot confirm credential in status ${this.props.status}`);
    }
    this.props.sbtTokenId = sbtTokenId;
    this.props.txHash = txHash;
    this.props.status = CredentialStatus.ISSUED;
    this.props.blockchainConfirmedAt = at;
  }

  markFailed(): void {
    this.props.status = CredentialStatus.FAILED;
  }

  toPrimitives(): CredentialProps {
    return { ...this.props };
  }
}
