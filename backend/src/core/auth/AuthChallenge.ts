import { InvalidStateError, UnauthorizedError } from '@core/shared/errors/index.js';

export interface AuthChallengeProps {
  id: string;
  holderDid: string;
  nonce: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export class AuthChallenge {
  private constructor(private readonly props: AuthChallengeProps) {}

  static create(props: AuthChallengeProps): AuthChallenge {
    return new AuthChallenge(props);
  }

  get id() { return this.props.id; }
  get holderDid() { return this.props.holderDid; }
  get nonce() { return this.props.nonce; }
  get expiresAt() { return this.props.expiresAt; }
  get consumedAt() { return this.props.consumedAt; }

  isExpired(now: Date): boolean {
    return now >= this.props.expiresAt;
  }

  isConsumed(): boolean {
    return this.props.consumedAt !== null;
  }

  /** Marks the challenge as used. Throws if already consumed or expired. */
  consume(at: Date): void {
    if (this.isConsumed()) {
      throw new InvalidStateError('Challenge already consumed');
    }
    if (this.isExpired(at)) {
      throw new UnauthorizedError('Challenge has expired');
    }
    this.props.consumedAt = at;
  }

  toPrimitives(): AuthChallengeProps {
    return { ...this.props };
  }
}
