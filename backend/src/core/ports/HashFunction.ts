export interface HashFunction {
  sha256(input: string | Uint8Array): Uint8Array;
}
