import type { StatusList } from './StatusList.js';
import type { StatusListEntry } from './StatusListEntry.js';

export interface StatusListRepository {
  saveList(list: StatusList): Promise<void>;
  findLatestByInstitution(institutionId: string): Promise<StatusList | null>;

  saveEntry(entry: StatusListEntry): Promise<void>;
  findEntryByCredential(credentialId: string): Promise<StatusListEntry | null>;
  markEntryRevoked(credentialId: string): Promise<void>;

  /** Returns the next available index in the current status list for an institution. */
  nextIndex(institutionId: string): Promise<{ statusListId: string; index: number }>;
}
