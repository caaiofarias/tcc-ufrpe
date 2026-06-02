/**
 * Mirrors the CredentialType enum declared in the AcademicSBT smart contract.
 * The contract currently accepts any string in `mint(...)`, but the backend
 * validates against this enum for consistency.
 */
export enum CredentialType {
  BACHELOR = 'BACHELOR',
  LICENTIATE = 'LICENTIATE',
  TECHNOLOGIST = 'TECHNOLOGIST',
  POSTGRAD_LATO = 'POSTGRAD_LATO',
  POSTGRAD_STRICTO = 'POSTGRAD_STRICTO',
  SEQUENTIAL = 'SEQUENTIAL',
}
