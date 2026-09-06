import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { capabilityTimestamp as timestamp } from "../circle/circle-capability-time";
import { LiveCredentialScope, LiveMediaCredentialRepository, validScope } from "./live-media-credential.repository";
import { MediaStopVerification, validStopVerification, MediaStopCompletion, validStopCompletion } from "./live-media-stop-verification.policy";

export interface MediaStopIntent {
  roomId: string; provider: "CSS" | "TRTC"; operationId: string; requestedBy: string; scope: LiveCredentialScope;
  credentialRevision: number; protectUntil: Date; state: "READY" | "DISPATCHING" | "UNKNOWN" | "ACKNOWLEDGED";
  revision: number; createdAt: Date; claimedAt: Date | null; leaseUntil: Date | null; resultAt: Date | null; providerRequestId: string | null;
  verification: MediaStopVerification | null;
  completion: MediaStopCompletion | null;
}
const validTime = (v: unknown): v is Date => v instanceof Date && Number.isFinite(v.getTime());
const validId = (v: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const sameScope = (a: LiveCredentialScope, b: LiveCredentialScope) => Object.keys(a).every(key => a[key] === b[key]);

/** 不执行 SDK、不释放额度；仅由结束业务和可信后台派发器使用，禁止作为请求 DTO 暴露。 */
@Injectable()
export class LiveMediaStopRepository {
  constructor(private readonly credentials: LiveMediaCredentialRepository) {}

  async prepareInTransaction(tx: Prisma.TransactionClient, roomId: string, requestedBy: string, now: Date) {
    if (!validTime(now) || !validId(requestedBy)) throw new Error("LIVE_STOP_REQUEST_INVALID");
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { status: true } });
    if (!room || room.status !== "ENDED") throw new Error("LIVE_STOP_ROOM_NOT_ENDED");
    const boundaries = await this.credentials.readInTransaction(tx, roomId);
    // 历史房间没有可信签发范围时不能猜测；不自动释放资源。
    if (!boundaries.length) return { tracked: false, intents: [] as MediaStopIntent[] };
    const intents: MediaStopIntent[] = [];
    for (const boundary of boundaries) {
      const previous = await this.readInTransaction(tx, roomId, boundary.provider);
      if (previous) {
        if (!sameScope(previous.scope, boundary.scope) || previous.credentialRevision !== boundary.revision
          || previous.protectUntil.getTime() < boundary.expiresAt.getTime() + 300000) throw new Error("LIVE_STOP_BOUNDARY_DRIFT");
        intents.push(previous); continue;
      }
      const protectUntil = new Date(Math.max(now.getTime(), boundary.expiresAt.getTime()) + 300000);
      const operationId = randomUUID();
      const inserted = await tx.$executeRaw`INSERT INTO "LiveMediaStopIntent"
        ("roomId", provider, "operationId", "requestedBy", scope, "credentialRevision", "protectUntil", state, revision, "createdAt")
        VALUES (${roomId}, ${boundary.provider}, ${operationId}, ${requestedBy}, ${JSON.stringify(boundary.scope)}::jsonb,
          ${boundary.revision}, ${timestamp(protectUntil)}, 'READY', 1, ${timestamp(now)})`;
      if (inserted !== 1) throw new Error("LIVE_STOP_INSERT_FAILED");
      intents.push((await this.readInTransaction(tx, roomId, boundary.provider))!);
    }
    return { tracked: true, intents };
  }

  async readInTransaction(tx: Prisma.TransactionClient, roomId: string, provider: string): Promise<MediaStopIntent | null> {
    const rows = await tx.$queryRaw<MediaStopIntent[]>`SELECT * FROM "LiveMediaStopIntent" WHERE "roomId"=${roomId} AND provider=${provider} FOR UPDATE`;
    if (!rows.length) return null;
    const r = rows[0];
    if (rows.length !== 1 || r.roomId !== roomId || r.provider !== provider || r.scope?.provider !== provider || !validScope(r.scope, roomId)
      || !validId(r.operationId) || !validId(r.requestedBy) || !Number.isInteger(r.credentialRevision) || r.credentialRevision < 1
      || !Number.isInteger(r.revision) || r.revision < 1 || r.revision > 2147483647 || !validTime(r.createdAt) || !validTime(r.protectUntil)
      || r.protectUntil <= r.createdAt
      || !["READY", "DISPATCHING", "UNKNOWN", "ACKNOWLEDGED"].includes(r.state)
      || [r.claimedAt, r.leaseUntil, r.resultAt].some(value => value !== null && !validTime(value))
      || r.state === "READY" && (r.claimedAt !== null || r.leaseUntil !== null || r.resultAt !== null || r.providerRequestId !== null)
      || r.state !== "READY" && (!validTime(r.claimedAt) || !validTime(r.leaseUntil) || r.leaseUntil <= r.claimedAt)
      || r.claimedAt !== null && r.claimedAt < r.createdAt
      || r.resultAt !== null && (!r.claimedAt || r.resultAt < r.claimedAt)
      || r.state === "DISPATCHING" && (r.resultAt !== null || r.providerRequestId !== null)
      || r.state === "UNKNOWN" && (!validTime(r.resultAt) || r.providerRequestId !== null)
      || r.state === "ACKNOWLEDGED" && (!validTime(r.resultAt) || !r.providerRequestId)
      || r.verification !== null && (!validStopVerification(r.verification) || r.provider !== "CSS" || !r.claimedAt
        || r.verification.startedAtMs < r.claimedAt.getTime())
      || r.completion !== null && (!validStopCompletion(r.completion) || r.state !== "ACKNOWLEDGED" || !r.resultAt
        || r.completion.credentialRevision !== r.credentialRevision || r.completion.verification.startedAtMs < r.resultAt.getTime()
        || r.completion.completedAtMs >= r.protectUntil.getTime())
      || r.providerRequestId !== null && (typeof r.providerRequestId !== "string" || !/^[A-Za-z0-9-]{1,128}$/.test(r.providerRequestId))) throw new Error("LIVE_STOP_STORED_ROW_INVALID");
    return r;
  }

  async claimInTransaction(tx: Prisma.TransactionClient, roomId: string, provider: string, now: Date) {
    if (!validTime(now)) throw new Error("LIVE_STOP_TIME_INVALID");
    const row = await this.readInTransaction(tx, roomId, provider);
    if (!row || row.state !== "READY") return null;
    if (row.revision >= 2147483647 || now < row.createdAt) throw new Error("LIVE_STOP_CLAIM_INVALID");
    const changed = await tx.$executeRaw`UPDATE "LiveMediaStopIntent" SET state='DISPATCHING', revision=revision+1,
      "claimedAt"=${timestamp(now)}, "leaseUntil"=${timestamp(new Date(now.getTime() + 60000))}
      WHERE "roomId"=${roomId} AND provider=${provider} AND revision=${row.revision} AND state='READY'`;
    if (changed !== 1) throw new Error("LIVE_STOP_CLAIM_CONFLICT");
    return this.readInTransaction(tx, roomId, provider);
  }

  async recordResultInTransaction(tx: Prisma.TransactionClient, roomId: string, provider: string, operationId: string,
    result: { state: "UNKNOWN" } | { state: "ACKNOWLEDGED"; requestId: string }, now: Date) {
    const row = await this.readInTransaction(tx, roomId, provider);
    if (!row || row.operationId !== operationId || !validTime(now) || !row.claimedAt || now < row.claimedAt
      || !["UNKNOWN", "ACKNOWLEDGED"].includes(result.state)) throw new Error("LIVE_STOP_RESULT_INVALID");
    const requestId = result.state === "ACKNOWLEDGED" ? result.requestId : null;
    if (requestId !== null && (typeof requestId !== "string" || !/^[A-Za-z0-9-]{1,128}$/.test(requestId))) throw new Error("LIVE_STOP_REQUEST_ID_INVALID");
    if (row.state === "ACKNOWLEDGED") {
      if (result.state !== row.state || requestId !== row.providerRequestId) throw new Error("LIVE_STOP_RESULT_CONFLICT");
      return row;
    }
    if (!["DISPATCHING", "UNKNOWN"].includes(row.state) || row.revision >= 2147483647) throw new Error("LIVE_STOP_RESULT_STATE_INVALID");
    if (row.state === "UNKNOWN" && result.state === "UNKNOWN") return row;
    const changed = await tx.$executeRaw`UPDATE "LiveMediaStopIntent" SET state=${result.state}, revision=revision+1,
      "resultAt"=${timestamp(now)}, "providerRequestId"=${requestId}
      WHERE "roomId"=${roomId} AND provider=${provider} AND revision=${row.revision}`;
    if (changed !== 1) throw new Error("LIVE_STOP_RESULT_CONFLICT");
    return this.readInTransaction(tx, roomId, provider);
  }

  async expireLeaseInTransaction(tx: Prisma.TransactionClient, roomId: string, provider: string, now: Date) {
    const row = await this.readInTransaction(tx, roomId, provider);
    if (!validTime(now)) throw new Error("LIVE_STOP_TIME_INVALID");
    if (!row || row.state !== "DISPATCHING" || !row.leaseUntil || now < row.leaseUntil) return row;
    return this.recordResultInTransaction(tx, roomId, provider, row.operationId, { state: "UNKNOWN" }, now);
  }

  async beginVerificationInTransaction(tx: Prisma.TransactionClient, roomId: string, operationId: string,
    proof: { reference: string; until: number }, now: Date) {
    const row = await this.readInTransaction(tx, roomId, "CSS");
    const verification: MediaStopVerification = { queryId: randomUUID(), state: "QUERYING", startedAtMs: now.getTime(),
      receivedAtMs: null, requestId: null, scopeProofRef: proof.reference, proofValidUntilMs: proof.until };
    if (!row || row.operationId !== operationId || row.state === "READY" || !row.claimedAt || now < row.claimedAt
      || !validStopVerification(verification) || row.revision >= 2147483647) throw new Error("LIVE_STOP_QUERY_INVALID");
    const changed = await tx.$executeRaw`UPDATE "LiveMediaStopIntent" SET verification=${JSON.stringify(verification)}::jsonb, revision=revision+1
      WHERE "roomId"=${roomId} AND provider='CSS' AND revision=${row.revision}`;
    if (changed !== 1) throw new Error("LIVE_STOP_QUERY_CONFLICT");
    return verification;
  }

  /** 必须与额度 COMPLETE 同一事务；冻结收尾时证据，后续查询不能改写既有审计。 */
  async saveCompletionInTransaction(tx: Prisma.TransactionClient, roomId: string, operationId: string, completion: MediaStopCompletion) {
    const row = await this.readInTransaction(tx, roomId, "CSS");
    if (!row || row.operationId !== operationId || row.completion || row.state !== "ACKNOWLEDGED"
      || !validStopCompletion(completion) || completion.credentialRevision !== row.credentialRevision
      || row.verification?.queryId !== completion.verification.queryId || row.revision >= 2147483647) {
      throw new Error("LIVE_STOP_COMPLETION_INVALID");
    }
    const changed = await tx.$executeRaw`UPDATE "LiveMediaStopIntent" SET completion=${JSON.stringify(completion)}::jsonb, revision=revision+1
      WHERE "roomId"=${roomId} AND provider='CSS' AND revision=${row.revision}`;
    if (changed !== 1) throw new Error("LIVE_STOP_COMPLETION_CONFLICT");
    // 重新解码验证持久化的整体约束；失败会回滚同事务额度变更。
    return this.readInTransaction(tx, roomId, "CSS");
  }

  async finishVerificationInTransaction(tx: Prisma.TransactionClient, roomId: string, operationId: string, queryId: string,
    response: { state: "active" | "inactive" | "forbid" | "UNKNOWN"; requestId?: string }, now: Date) {
    const row = await this.readInTransaction(tx, roomId, "CSS");
    if (!row || row.operationId !== operationId || !validTime(now)) throw new Error("LIVE_STOP_QUERY_RESULT_INVALID");
    // 两节点只读查询可以重叠，但迟到结果不能覆盖新一轮状态。
    if (!row.verification || row.verification.queryId !== queryId) return { applied: false, verification: row.verification };
    const previous = row.verification;
    if (previous.state !== "QUERYING" || now.getTime() < previous.startedAtMs || row.revision >= 2147483647) {
      throw new Error("LIVE_STOP_QUERY_RESULT_CONFLICT");
    }
    const usable = ["active", "inactive", "forbid"].includes(response.state) && typeof response.requestId === "string"
      && /^[A-Za-z0-9-]{1,128}$/.test(response.requestId) && now.getTime() < previous.proofValidUntilMs
      && now.getTime() - previous.startedAtMs <= 60000;
    const verification: MediaStopVerification = { ...previous, state: usable ? response.state : "UNKNOWN",
      receivedAtMs: now.getTime(), requestId: usable ? response.requestId! : null };
    if (!validStopVerification(verification)) throw new Error("LIVE_STOP_QUERY_RESULT_INVALID");
    const changed = await tx.$executeRaw`UPDATE "LiveMediaStopIntent" SET verification=${JSON.stringify(verification)}::jsonb, revision=revision+1
      WHERE "roomId"=${roomId} AND provider='CSS' AND revision=${row.revision}`;
    if (changed !== 1) throw new Error("LIVE_STOP_QUERY_CONFLICT");
    return { applied: true, verification };
  }
}
