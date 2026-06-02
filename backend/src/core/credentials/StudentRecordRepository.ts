import type { StudentRecord } from './StudentRecord.js';

export interface StudentRecordRepository {
  create(record: StudentRecord): Promise<StudentRecord>;
  findByCredentialId(credentialId: string): Promise<StudentRecord | null>;
  update(record: StudentRecord): Promise<StudentRecord>;
}
