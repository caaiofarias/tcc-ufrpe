/**
 * IssueCredentialUseCase — orchestrates the full credential issuance flow.
 *
 * Sequence (high level):
 *   1. Validate input and parse the holder's did:ethr.
 *   2. Upsert the Holder record (idempotent).
 *   3. Check for active duplicates (same holder + same type).
 *   4. Build the SD-JWT VC in memory (issuer-signed JWT + disclosures + decoys).
 *   5. Compute vcHash = SHA-256(issuer-signed JWT compact form).
 *   6. Persist Credential as PENDING (transaction 1) — vcHash already populated
 *      so reconciliation can find it on-chain if step 7 fails to record.
 *   7. Mint the SBT on-chain. Wait for confirmation.
 *   8. Persist final state, allocate Status List entry, write audit log
 *      (transaction 2).
 *   9. Assemble sdJwtCompact and return — discarded from server memory after
 *      response is sent.
 *
 * The VC (sdJwtCompact) is NEVER persisted server-side. If transmission to
 * the holder fails, the recovery path is revocation + reissuance.
 */

import { randomUUID } from 'crypto';

import { DID } from '@core/holders/DID.js';
import { Credential } from '@core/credentials/Credential.js';
import { CredentialStatus } from '@core/credentials/CredentialStatus.js';
import { StudentRecord } from '@core/credentials/StudentRecord.js';
import { AuditLog } from '@core/audit/AuditLog.js';
import { AuditAction } from '@core/audit/AuditAction.js';
import { StatusListEntry } from '@core/revocation/StatusListEntry.js';
import { ConflictError } from '@core/shared/errors/index.js';

import type { CredentialRepository } from '@core/credentials/CredentialRepository.js';
import type { StudentRecordRepository } from '@core/credentials/StudentRecordRepository.js';
import type { HolderRepository } from '@core/holders/HolderRepository.js';
import type { AuditLogRepository } from '@core/audit/AuditLogRepository.js';
import type { StatusListRepository } from '@core/revocation/StatusListRepository.js';
import type { SdJwtIssuer } from '@core/ports/SdJwtIssuer.js';
import type { Signer } from '@core/ports/Signer.js';
import type { HashFunction } from '@core/ports/HashFunction.js';
import type { BlockchainAnchor } from '@core/ports/BlockchainAnchor.js';
import type { Clock } from '@core/ports/Clock.js';
import type { UnitOfWork } from '@core/ports/UnitOfWork.js';
import type { CredentialType } from '@core/credentials/CredentialType.js';

export interface IssueCredentialInput {
  institutionId: string;
  issuedByUserId: string;
  holderDid: string;
  holderPublicKeyJwk: Record<string, unknown>;
  credentialType: CredentialType;
  claims: {
    fullName: string;
    cpf: string;
    course: string;
    graduationDate: Date;
    gpa: number | null;
    registryNumber: string;
  };
}

export interface IssueCredentialOutput {
  credentialId: string;
  sbtTokenId: string;
  vcHash: string;
  txHash: string;
  /**
   * The full SD-JWT VC in compact form. Returned exactly once; backend
   * does NOT persist this value. Caller is responsible for delivering
   * it to the holder (via QR or similar) and discarding.
   */
  sdJwtCompact: string;
  status: 'ISSUED';
}

export class IssueCredentialUseCase {
  constructor(
    private readonly credentials: CredentialRepository,
    private readonly studentRecords: StudentRecordRepository,
    private readonly holders: HolderRepository,
    private readonly sdJwtIssuer: SdJwtIssuer,
    private readonly signer: Signer,
    private readonly hash: HashFunction,
    private readonly anchor: BlockchainAnchor,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
    private readonly auditLog: AuditLogRepository,
    private readonly statusList: StatusListRepository,
    private readonly sdJwtDecoyCount: number = 3,
  ) {}

  async execute(input: IssueCredentialInput): Promise<IssueCredentialOutput> {
    const now = this.clock.now();

    // 1. Parse DID — throws if format is invalid
    const did = DID.fromStringWithKey(input.holderDid, input.holderPublicKeyJwk);

    // 2. Upsert holder (idempotent on first-seen)
    const holder = await this.holders.upsertByDid({
      did: did.toString(),
      address: did.toEthereumAddress(),
      firstSeenAt: now,
    });

    // 3. Duplicate guard
    const duplicate = await this.credentials.findActiveByHolderAndType(
      holder.id,
      input.credentialType,
    );
    if (duplicate) {
      throw new ConflictError(
        `Holder already has an active ${input.credentialType} credential`,
      );
    }

    // 4. Issue SD-JWT VC in memory
    const { issuerSignedJwt, disclosures } = await this.sdJwtIssuer.issue({
      sdClaims: {
        fullName: input.claims.fullName,
        cpf: input.claims.cpf,
        course: input.claims.course,
        graduationDate: input.claims.graduationDate,
        gpa: input.claims.gpa,
        registryNumber: input.claims.registryNumber,
      },
      alwaysDisclosed: {
        iss: this.signer.getInstitutionDid(),
        sub: did.toString(),
        iat: Math.floor(now.getTime() / 1000),
        vct: 'AcademicCredential',
        credential_type: input.credentialType,
        cnf: {jwk: did.toPublicKeyJwk()},
      },
      decoyCount: this.sdJwtDecoyCount,
      signer: this.signer,
      hashAlg: 'sha-256',
    });

    // 5. Compute vcHash = SHA-256(issuer-signed JWT)
    const vcHashBytes = this.hash.sha256(issuerSignedJwt);
    const vcHash = Buffer.from(vcHashBytes).toString('hex');

    // 6. Persist as PENDING — vcHash present so reconciliation can cross-check on-chain
    const credentialId = randomUUID();
    const credential = Credential.create({
      id: credentialId,
      institutionId: input.institutionId,
      holderId: holder.id,
      issuedByUserId: input.issuedByUserId,
      vcHash,
      sbtTokenId: null,
      txHash: null,
      credentialType: input.credentialType,
      status: CredentialStatus.PENDING,
      issuedAt: now,
      revokedAt: null,
      blockchainConfirmedAt: null,
      reissuanceOfId: null,
    });

    const studentRecord = StudentRecord.create({
      id: randomUUID(),
      credentialId,
      fullName: input.claims.fullName,
      cpf: input.claims.cpf,
      course: input.claims.course,
      graduationDate: input.claims.graduationDate,
      gpa: input.claims.gpa,
      registryNumber: input.claims.registryNumber,
      retainUntil: null,
      erasedAt: null,
    });

    await this.uow.transaction(async () => {
      await this.credentials.create(credential);
      await this.studentRecords.create(studentRecord);
    });

    // 7. Mint SBT — blocks until tx is confirmed
    let mintResult: { tokenId: bigint; txHash: string };
    try {
      mintResult = await this.anchor.mint({
        to: holder.address,
        vcHash,
        credentialType: input.credentialType,
      });
    } catch (err) {
      credential.markFailed();
      await this.credentials.update(credential);
      await this.auditLog.append(
        AuditLog.create({
          id: randomUUID(),
          actorUserId: input.issuedByUserId,
          action: AuditAction.CREDENTIAL_ISSUE_FAILED,
          targetType: 'Credential',
          targetId: credentialId,
          metadata: { reason: err instanceof Error ? err.message : String(err) },
          createdAt: this.clock.now(),
        }),
      );
      throw err;
    }

    // 8. Confirm on-chain state + status list entry + audit log (atomic)
    credential.confirmOnChain(mintResult.tokenId, mintResult.txHash, this.clock.now());

    const { statusListId, index } = await this.statusList.nextIndex(input.institutionId);
    const statusEntry = StatusListEntry.create({
      id: randomUUID(),
      statusListId,
      credentialId,
      index,
      revoked: false,
    });

    await this.uow.transaction(async () => {
      await this.credentials.update(credential);
      await this.statusList.saveEntry(statusEntry);
      await this.auditLog.append(
        AuditLog.create({
          id: randomUUID(),
          actorUserId: input.issuedByUserId,
          action: AuditAction.CREDENTIAL_ISSUED,
          targetType: 'Credential',
          targetId: credentialId,
          metadata: {
            holderId: holder.id,
            credentialType: input.credentialType,
            sbtTokenId: mintResult.tokenId.toString(),
            txHash: mintResult.txHash,
          },
          createdAt: this.clock.now(),
        }),
      );
    });

    // 9. Assemble SD-JWT compact form: issuerJwt~disclosure1~disclosure2~
    const sdJwtCompact = [issuerSignedJwt, ...disclosures, ''].join('~');

    return {
      credentialId,
      sbtTokenId: mintResult.tokenId.toString(),
      vcHash,
      txHash: mintResult.txHash,
      sdJwtCompact,
      status: 'ISSUED',
    };
  }
}
