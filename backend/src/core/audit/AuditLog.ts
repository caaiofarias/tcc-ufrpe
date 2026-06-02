import type { AuditAction } from './AuditAction.js';

export interface AuditLogProps {
  id: string;
  /** Null for system-initiated actions (e.g. blockchain confirmation callbacks). */
  actorUserId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLog {
  private constructor(private readonly props: AuditLogProps) {}

  static create(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  get id() { return this.props.id; }
  get actorUserId() { return this.props.actorUserId; }
  get action() { return this.props.action; }
  get targetType() { return this.props.targetType; }
  get targetId() { return this.props.targetId; }
  get metadata() { return this.props.metadata; }
  get createdAt() { return this.props.createdAt; }

  toPrimitives(): AuditLogProps {
    return { ...this.props };
  }
}
