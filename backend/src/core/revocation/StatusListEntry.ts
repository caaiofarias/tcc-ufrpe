import { InvalidStateError } from '@core/shared/errors/index.js';

export interface StatusListEntryProps {
  id: string;
  statusListId: string;
  credentialId: string;
  /** Position of this credential in the status list bitstring. */
  index: number;
  revoked: boolean;
}

export class StatusListEntry {
  private constructor(private readonly props: StatusListEntryProps) {}

  static create(props: StatusListEntryProps): StatusListEntry {
    return new StatusListEntry(props);
  }

  get id() { return this.props.id; }
  get statusListId() { return this.props.statusListId; }
  get credentialId() { return this.props.credentialId; }
  get index() { return this.props.index; }
  get revoked() { return this.props.revoked; }

  markRevoked(): void {
    if (this.props.revoked) {
      throw new InvalidStateError('Status list entry already marked as revoked');
    }
    this.props.revoked = true;
  }

  toPrimitives(): StatusListEntryProps {
    return { ...this.props };
  }
}
