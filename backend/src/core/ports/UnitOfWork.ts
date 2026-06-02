/**
 * Port for transactional boundaries. Implementation wraps Prisma's
 * $transaction. Use cases call uow.transaction(async () => { ... })
 * to group repository operations atomically.
 */
export interface UnitOfWork {
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
