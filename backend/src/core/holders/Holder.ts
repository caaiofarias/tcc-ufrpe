export interface HolderProps {
  id: string;
  did: string;
  address: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export class Holder {
  private constructor(private readonly props: HolderProps) {}

  static create(props: HolderProps): Holder {
    return new Holder(props);
  }

  get id() {
    return this.props.id;
  }
  get did() {
    return this.props.did;
  }
  get address() {
    return this.props.address;
  }

  touch(at: Date): void {
    this.props.lastSeenAt = at;
  }

  toPrimitives(): HolderProps {
    return { ...this.props };
  }
}
