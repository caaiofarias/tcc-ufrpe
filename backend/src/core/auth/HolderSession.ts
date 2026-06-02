import { InvalidStateError } from '@core/shared/errors/index.js';

export interface HolderSessionProps {
  id: string;
  holderId: string;
  /** SHA-256 of the raw refresh token — never store the raw token. */
  refreshToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  userAgent: string | null;
}

export class HolderSession {
  private constructor(private readonly props: HolderSessionProps) {}

  static create(props: HolderSessionProps): HolderSession {
    return new HolderSession(props);
  }

  get id() { return this.props.id; }
  get holderId() { return this.props.holderId; }
  get refreshToken() { return this.props.refreshToken; }
  get expiresAt() { return this.props.expiresAt; }
  get revokedAt() { return this.props.revokedAt; }

  isExpired(now: Date): boolean {
    return now >= this.props.expiresAt;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isValid(now: Date): boolean {
    return !this.isExpired(now) && !this.isRevoked();
  }

  revoke(at: Date): void {
    if (this.isRevoked()) {
      throw new InvalidStateError('Session already revoked');
    }
    this.props.revokedAt = at;
  }

  toPrimitives(): HolderSessionProps {
    return { ...this.props };
  }
}
