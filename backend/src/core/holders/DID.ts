/**
 * DID value object. Currently supports did:ethr only.
 *
 * Format: did:ethr:[<chain>:]<address>
 *   e.g. did:ethr:0x1234... (mainnet, default)
 *        did:ethr:sepolia:0x1234...
 *        did:ethr:0x539:0x1234... (chainId 1337 hex)
 */

export class DID {
  private constructor(
    private readonly raw: string,
    private readonly method: string,
    private readonly address: string,
    private readonly publicKeyJwk: Record<string, unknown> | null,
  ) {}

  /**
   * Parses a DID string. Does NOT carry public key — use `fromStringWithKey`
   * when the public key is needed (e.g., for VC issuance with Key Binding).
   */
  static fromString(raw: string): DID {
    const { method, address } = DID.parse(raw);
    return new DID(raw, method, address, null);
  }

  /**
   * Parses a DID string and attaches the public key as a JWK.
   * Used at issuance time, when the holder presents both their DID
   * and the corresponding public key.
   */
  static fromStringWithKey(raw: string, publicKeyJwk: Record<string, unknown>): DID {
    const { method, address } = DID.parse(raw);
    return new DID(raw, method, address, publicKeyJwk);
  }

  private static parse(raw: string): { method: string; address: string } {
    const parts = raw.split(':');
    if (parts.length < 3 || parts[0] !== 'did') {
      throw new Error(`Invalid DID format: ${raw}`);
    }
    const method = parts[1];
    const address = parts[parts.length - 1];

    if (method !== 'ethr') {
      throw new Error(`Unsupported DID method: ${method}. Only did:ethr is accepted.`);
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Invalid Ethereum address in DID: ${address}`);
    }

    return { method, address: address.toLowerCase() };
  }

  isEthr(): boolean {
    return this.method === 'ethr';
  }

  toEthereumAddress(): string {
    return this.address;
  }

  toString(): string {
    return this.raw;
  }

  toPublicKeyJwk(): Record<string, unknown> {
    if (!this.publicKeyJwk) {
      throw new Error(
        `DID ${this.raw} has no associated public key. ` +
          `Use DID.fromStringWithKey() when the public key is required.`,
      );
    }
    return this.publicKeyJwk;
  }
}
