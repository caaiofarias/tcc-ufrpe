
import { InvalidStateError } from '@core/shared/errors/index.js';

export interface RevocationProps {
  id: string;
  credentialId: string;
  reason: string;
  revokedByUserId: string;
  txHash: string | null;
  revokedAt: Date;
  blockchainConfirmedAt: Date | null;
}

export class Revocation {
  private constructor(private readonly props: RevocationProps) {}

  static create(props: RevocationProps): Revocation {
    return new Revocation(props);
  }

  get id() { return this.props.id; }
  get credentialId() { return this.props.credentialId; }
  get reason() { return this.props.reason; }
  get revokedByUserId() { return this.props.revokedByUserId; }
  get txHash() { return this.props.txHash; }
  get revokedAt() { return this.props.revokedAt; }
  get blockchainConfirmedAt() { return this.props.blockchainConfirmedAt; }

  /** Called when the on-chain revocation tx is confirmed. */
  confirmOnChain(txHash: string, at: Date): void {
    if (this.props.blockchainConfirmedAt !== null) {
      throw new InvalidStateError('Revocation already confirmed on chain');
    }
    this.props.txHash = txHash;
    this.props.blockchainConfirmedAt = at;
  }

  toPrimitives(): RevocationProps {
    return { ...this.props };
  }
}
