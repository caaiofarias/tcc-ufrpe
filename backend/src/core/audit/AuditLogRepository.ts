import type { AuditLog } from './AuditLog.js';
import type { AuditAction } from './AuditAction.js';

export interface AuditLogRepository {
  append(log: AuditLog): Promise<void>;
  findByTarget(targetType: string, targetId: string): Promise<AuditLog[]>;
  findByActor(actorUserId: string): Promise<AuditLog[]>;
  findByAction(action: AuditAction): Promise<AuditLog[]>;
}
