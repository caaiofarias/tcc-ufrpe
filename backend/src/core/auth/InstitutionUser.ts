import { UnauthorizedError } from '@core/shared/errors/index.js';

export enum Role {
  ADMIN = 'ADMIN',
  ISSUER = 'ISSUER',
}

export interface InstitutionUserProps {
  id: string;
  institutionId: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export class InstitutionUser {
  private constructor(private readonly props: InstitutionUserProps) {}

  static create(props: InstitutionUserProps): InstitutionUser {
    return new InstitutionUser(props);
  }

  get id() { return this.props.id; }
  get institutionId() { return this.props.institutionId; }
  get email() { return this.props.email; }
  get passwordHash() { return this.props.passwordHash; }
  get role() { return this.props.role; }
  get isActive() { return this.props.isActive; }
  get lastLoginAt() { return this.props.lastLoginAt; }

  recordLogin(at: Date): void {
    if (!this.props.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }
    this.props.lastLoginAt = at;
    this.props.updatedAt = at;
  }

  deactivate(at: Date): void {
    this.props.isActive = false;
    this.props.updatedAt = at;
  }

  toPrimitives(): InstitutionUserProps {
    return { ...this.props };
  }
}
