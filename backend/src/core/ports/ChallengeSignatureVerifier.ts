/**
 * Verifies that a signature over a challenge message was produced
 * by the holder of a given did:ethr.
 */
export interface ChallengeSignatureVerifier {
  verify(input: { did: string; message: string; signature: string }): Promise<boolean>;
}
