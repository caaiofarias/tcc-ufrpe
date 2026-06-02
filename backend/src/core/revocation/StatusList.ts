export interface StatusListProps {
  id: string;
  institutionId: string;
  version: number;
  /** Gzip-compressed bitstring. */
  bitstring: Buffer;
  /** Signed Status List VC served at the public endpoint. */
  signedVc: string;
  publishedAt: Date;
}

export class StatusList {
  private constructor(private readonly props: StatusListProps) {}

  static create(props: StatusListProps): StatusList {
    return new StatusList(props);
  }

  get id() { return this.props.id; }
  get institutionId() { return this.props.institutionId; }
  get version() { return this.props.version; }
  get bitstring() { return this.props.bitstring; }
  get signedVc() { return this.props.signedVc; }
  get publishedAt() { return this.props.publishedAt; }

  toPrimitives(): StatusListProps {
    return { ...this.props };
  }
}
