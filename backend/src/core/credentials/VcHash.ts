/**
 * VcHash — SHA-256 of the issuer-signed JWT in compact form.
 * This is the value anchored on-chain in the SBT.
 */
export class VcHash {
  private constructor(private readonly bytes: Uint8Array) {
    if (bytes.length !== 32) {
      throw new Error(`VcHash must be 32 bytes (got ${bytes.length})`);
    }
  }

  static fromBytes(bytes: Uint8Array): VcHash {
    return new VcHash(bytes);
  }

  static fromHex(hex: string): VcHash {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (clean.length !== 64) {
      throw new Error(`VcHash hex must be 64 chars (got ${clean.length})`);
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return new VcHash(bytes);
  }

  toHex(): string {
    return (
      '0x' +
      Array.from(this.bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }

  equals(other: VcHash): boolean {
    if (this.bytes.length !== other.bytes.length) return false;
    return this.bytes.every((b, i) => b === other.bytes[i]);
  }
}
