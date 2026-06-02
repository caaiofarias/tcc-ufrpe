/**
 * StudentRecord — PII associated with a credential.
 *
 * Stored separately from Credential to support LGPD right-to-erasure
 * without compromising the integrity of the institutional record.
 */

export interface StudentRecordProps {
  id: string;
  credentialId: string;
  fullName: string;
  cpf: string;
  course: string;
  graduationDate: Date;
  gpa: number | null;
  registryNumber: string;
  retainUntil: Date | null;
  erasedAt: Date | null;
}

export class StudentRecord {
  private constructor(private readonly props: StudentRecordProps) {}

  static create(props: StudentRecordProps): StudentRecord {
    return new StudentRecord(props);
  }

  get id() {
    return this.props.id;
  }

  get isErased(): boolean {
    return this.props.erasedAt !== null;
  }

  /**
   * Marks the record as erased and clears PII fields.
   * The record itself remains for auditability of the erasure event.
   */
  erase(at: Date): void {
    this.props.fullName = '';
    this.props.cpf = '';
    this.props.course = '';
    this.props.registryNumber = '';
    this.props.gpa = null;
    this.props.erasedAt = at;
  }

  toPrimitives(): StudentRecordProps {
    return { ...this.props };
  }
}
