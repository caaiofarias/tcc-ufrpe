export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {}
export class InvalidStateError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class ConflictError extends DomainError {}
export class BlockchainError extends DomainError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
