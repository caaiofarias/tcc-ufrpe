export interface InstitutionProps {
  id: string;
  name: string;
  did: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Institution {
  private constructor(private readonly props: InstitutionProps) {}

  static create(props: InstitutionProps): Institution {
    return new Institution(props);
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get did() { return this.props.did; }
  get domain() { return this.props.domain; }

  toPrimitives(): InstitutionProps {
    return { ...this.props };
  }
}
