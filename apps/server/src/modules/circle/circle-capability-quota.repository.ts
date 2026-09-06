import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { QuotaAction, QuotaBinding, QuotaOperationReceipt, QuotaReservation, QuotaUsage, validQuotaBinding, validQuotaReservation } from "./circle-capability-quota.policy";
import { capabilityTimestamp as timestamp } from "./circle-capability-time";

type QuotaRow = Omit<QuotaReservation, "binding"> & QuotaBinding;
export type QuotaAuditActor = { source: "USER"; actorId: string; evidenceRef: null } |
  { source: "BUSINESS_ADAPTER"; actorId: null; evidenceRef: string };
export interface QuotaReceiptRow extends Omit<QuotaOperationReceipt, "action"> {
  action: QuotaAction | "RESERVE";
  source: string;
  actorId: string | null;
  evidenceRef: string | null;
}
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const safeCount = (value: bigint) => {
  if (typeof value !== "bigint" || value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("QUOTA_INVALID_AGGREGATE");
  return Number(value);
};
export function validQuotaAuditActor(actor: QuotaAuditActor): boolean {
  return !!actor && (actor.source === "USER" ? uuid(actor.actorId) && actor.evidenceRef === null :
    actor.source === "BUSINESS_ADAPTER" && actor.actorId === null && typeof actor.evidenceRef === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(actor.evidenceRef));
}

/** 内部事务仓储，无独立连接或网络副作用。所有方法必须由持有同圈事务锁的调用方使用。 */
@Injectable()
export class CircleCapabilityQuotaRepository {
  async lockScope(tx: Prisma.TransactionClient, circleId: string) {
    // 与授权仓储使用完全相同的事务锁键；收尾不锁账号/配置，避免撤权后不能结束业务。
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`circle-capability:${circleId}`}))`;
  }
  private decode(row: QuotaRow): QuotaReservation {
    const binding: QuotaBinding = { circleId: row.circleId, capability: row.capability, actorId: row.actorId, subjectUserId: row.subjectUserId,
      businessType: row.businessType, businessId: row.businessId, requestKey: row.requestKey, units: row.units, holdSeconds: row.holdSeconds };
    const result: QuotaReservation = { id: row.id, binding, ownerId: row.ownerId, circleGrantId: row.circleGrantId,
      circleGrantRevision: row.circleGrantRevision, providerGrantId: row.providerGrantId, providerGrantRevision: row.providerGrantRevision,
      policyRevision: row.policyRevision, revision: row.revision, state: row.state, createdAt: row.createdAt, updatedAt: row.updatedAt,
      holdUntil: row.holdUntil, activatedAt: row.activatedAt, terminalAt: row.terminalAt };
    if (!validQuotaReservation(result)) throw new Error("QUOTA_INVALID_STORED_ROW");
    return result;
  }
  private one(rows: QuotaRow[]): QuotaReservation | null {
    if (rows.length > 1) throw new Error("QUOTA_NON_UNIQUE_ROW");
    return rows.length ? this.decode(rows[0]) : null;
  }
  async byId(tx: Prisma.TransactionClient, id: string) {
    return this.one(await tx.$queryRaw<QuotaRow[]>`SELECT * FROM "CircleCapabilityQuota" WHERE "id" = ${id}`);
  }
  async byRequest(tx: Prisma.TransactionClient, requestKey: string) {
    return this.one(await tx.$queryRaw<QuotaRow[]>`SELECT * FROM "CircleCapabilityQuota" WHERE "requestKey" = ${requestKey}`);
  }
  async byBusiness(tx: Prisma.TransactionClient, businessType: string, businessId: string) {
    // 全局业务实例唯一，不能换圈子或请求 key 再占一份。
    return this.one(await tx.$queryRaw<QuotaRow[]>`SELECT * FROM "CircleCapabilityQuota" WHERE "businessType" = ${businessType} AND "businessId" = ${businessId}`);
  }
  async usage(tx: Prisma.TransactionClient, grantIds: string[], now: Date): Promise<QuotaUsage[]> {
    if (grantIds.length < 1 || grantIds.length > 2 || !grantIds.every(uuid) || new Set(grantIds).size !== grantIds.length ||
        !(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("QUOTA_INVALID_USAGE_REQUEST");
    const result: QuotaUsage[] = [];
    for (const grantId of [...grantIds].sort()) {
      // 在主库聚合，不把无限增长的历史账本拉到应用内存；同圈锁由事务服务统一取得。
      const rows = await tx.$queryRaw<Array<{ committed: bigint; held: bigint; active: bigint; invalid: bigint }>>`
        SELECT count(*) FILTER (WHERE "state" IN ('ACTIVE', 'COMPLETED')) AS "committed",
          count(*) FILTER (WHERE "state" = 'HELD' AND "holdUntil" > ${timestamp(now)}) AS "held",
          count(*) FILTER (WHERE "state" = 'ACTIVE') AS "active",
          count(*) FILTER (WHERE ("units" = 1 AND "holdSeconds" BETWEEN 1 AND 900 AND "revision" > 0
            AND (("circleGrantId" IS NOT NULL AND "circleGrantRevision" > 0) OR ("circleGrantId" IS NULL AND "circleGrantRevision" IS NULL AND "providerGrantId" IS NOT NULL AND "providerGrantRevision" > 0)) AND "policyRevision" > 0
            AND "createdAt" <= "updatedAt" AND "updatedAt" <= ${timestamp(now)}
            AND "holdUntil" > "createdAt" AND "holdUntil" <= "createdAt" + "holdSeconds" * interval '1 second'
            AND (("state" = 'HELD' AND "activatedAt" IS NULL AND "terminalAt" IS NULL)
              OR ("state" = 'ACTIVE' AND "activatedAt" >= "createdAt" AND "activatedAt" <= "updatedAt" AND "activatedAt" < "holdUntil" AND "terminalAt" IS NULL)
              OR ("state" = 'COMPLETED' AND "activatedAt" >= "createdAt" AND "activatedAt" < "holdUntil" AND "terminalAt" >= "activatedAt" AND "terminalAt" <= "updatedAt")
              OR ("state" = 'RELEASED' AND "activatedAt" IS NULL AND "terminalAt" >= "createdAt" AND "terminalAt" <= "updatedAt")
              OR ("state" = 'EXPIRED' AND "activatedAt" IS NULL AND "terminalAt" >= "holdUntil" AND "terminalAt" <= "updatedAt"))) IS NOT TRUE) AS "invalid"
        FROM "CircleCapabilityQuota" WHERE "circleGrantId" = ${grantId} OR "providerGrantId" = ${grantId}`;
      if (rows.length !== 1 || safeCount(rows[0].invalid) !== 0) throw new Error("QUOTA_INVALID_USAGE_ROWS");
      result.push({ grantId, committed: safeCount(rows[0].committed), held: safeCount(rows[0].held), active: safeCount(rows[0].active) });
    }
    return result;
  }
  async insert(tx: Prisma.TransactionClient, r: QuotaReservation) {
    if (!validQuotaReservation(r) || r.state !== "HELD" || r.revision !== 1) throw new Error("QUOTA_INVALID_INSERT");
    const b = r.binding;
    const rows = await tx.$queryRaw<QuotaRow[]>`INSERT INTO "CircleCapabilityQuota"
      ("id", "circleId", "capability", "actorId", "subjectUserId", "businessType", "businessId", "requestKey", "units", "holdSeconds",
       "ownerId", "circleGrantId", "circleGrantRevision", "providerGrantId", "providerGrantRevision", "policyRevision", "revision", "state",
       "createdAt", "updatedAt", "holdUntil", "activatedAt", "terminalAt")
      VALUES (${r.id}, ${b.circleId}, ${b.capability}::"CircleCapabilityType", ${b.actorId}, ${b.subjectUserId}, ${b.businessType},
       ${b.businessId}, ${b.requestKey}, ${b.units}, ${b.holdSeconds}, ${r.ownerId}, ${r.circleGrantId}, ${r.circleGrantRevision},
       ${r.providerGrantId}, ${r.providerGrantRevision}, ${r.policyRevision}, 1, 'HELD', ${timestamp(r.createdAt)}, ${timestamp(r.updatedAt)}, ${timestamp(r.holdUntil)}, NULL, NULL) RETURNING *`;
    const stored = this.one(rows);
    if (!stored) throw new Error("QUOTA_INSERT_FAILED");
    return stored;
  }
  async compareAndSet(tx: Prisma.TransactionClient, previous: QuotaReservation, next: QuotaReservation) {
    if (!validQuotaReservation(previous) || !validQuotaReservation(next) || next.id !== previous.id || next.revision !== previous.revision + 1) throw new Error("QUOTA_INVALID_CAS");
    const immutable = ["ownerId", "circleGrantId", "circleGrantRevision", "providerGrantId", "providerGrantRevision", "policyRevision"] as const;
    if (immutable.some(k => previous[k] !== next[k]) || Object.keys(previous.binding).some(k => previous.binding[k] !== next.binding[k]) ||
        previous.createdAt.getTime() !== next.createdAt.getTime() || previous.holdUntil.getTime() !== next.holdUntil.getTime()) throw new Error("QUOTA_IMMUTABLE_BINDING_CHANGED");
    // 只允许修改生命周期字段，绝不顺带换授权、业务、期限或主体。
    return this.one(await tx.$queryRaw<QuotaRow[]>`UPDATE "CircleCapabilityQuota" SET "state" = ${next.state}::"CircleCapabilityQuotaState",
      "revision" = ${next.revision}, "updatedAt" = ${timestamp(next.updatedAt)}, "activatedAt" = ${timestamp(next.activatedAt)}, "terminalAt" = ${timestamp(next.terminalAt)}
      WHERE "id" = ${previous.id} AND "revision" = ${previous.revision} AND "state" = ${previous.state}::"CircleCapabilityQuotaState" RETURNING *`);
  }
  async receipt(tx: Prisma.TransactionClient, operationKey: string): Promise<QuotaReceiptRow | null> {
    const rows = await tx.$queryRaw<Array<Omit<QuotaReceiptRow, "binding"> & { afterSnapshot: Prisma.JsonValue }>>`
      SELECT "reservationId", "operationKey", "action", "appliedRevision", "source", "actorId", "evidenceRef", "afterSnapshot"
      FROM "CircleCapabilityQuotaReceipt" WHERE "operationKey" = ${operationKey}`;
    if (rows.length > 1) throw new Error("QUOTA_NON_UNIQUE_RECEIPT");
    const row = rows[0]; if (!row) return null;
    const after = row.afterSnapshot as unknown as QuotaReservation;
    if (!after || !validQuotaBinding(after.binding) || after.id !== row.reservationId || after.revision !== row.appliedRevision ||
        !["RESERVE", "ACTIVATE", "COMPLETE", "RELEASE", "EXPIRE"].includes(row.action)) throw new Error("QUOTA_INVALID_RECEIPT");
    return { reservationId: row.reservationId, operationKey: row.operationKey, action: row.action, appliedRevision: row.appliedRevision,
      binding: after.binding, source: row.source, actorId: row.actorId, evidenceRef: row.evidenceRef };
  }
  async writeReceipt(tx: Prisma.TransactionClient, operationKey: string, action: QuotaAction | "RESERVE", actor: QuotaAuditActor,
    previous: QuotaReservation | null, next: QuotaReservation) {
    if (!uuid(operationKey) || !validQuotaAuditActor(actor) || !validQuotaReservation(next)) throw new Error("QUOTA_INVALID_RECEIPT_INPUT");
    if (action === "RESERVE" ? previous !== null || next.revision !== 1 || next.state !== "HELD" || operationKey !== next.binding.requestKey :
      !previous || previous.id !== next.id || previous.revision + 1 !== next.revision ||
      ({ ACTIVATE: "ACTIVE", COMPLETE: "COMPLETED", RELEASE: "RELEASED", EXPIRE: "EXPIRED" }[action] !== next.state)) throw new Error("QUOTA_RECEIPT_TRANSITION_MISMATCH");
    // decode 同时剔除不属于账本的字段，避免将业务请求/第三方凭据塞入审计。
    const snapshot = (r: QuotaReservation) => this.decode({ ...r, ...r.binding });
    const count = await tx.$executeRaw`INSERT INTO "CircleCapabilityQuotaReceipt"
      ("id", "reservationId", "operationKey", "action", "appliedRevision", "source", "actorId", "evidenceRef", "beforeSnapshot", "afterSnapshot", "createdAt")
      VALUES (${randomUUID()}, ${next.id}, ${operationKey}, ${action}::"CircleCapabilityQuotaAction", ${next.revision}, ${actor.source},
        ${actor.actorId}, ${actor.evidenceRef}, ${previous ? JSON.stringify(snapshot(previous)) : null}::jsonb, ${JSON.stringify(snapshot(next))}::jsonb, ${timestamp(next.updatedAt)})`;
    if (count !== 1) throw new Error("QUOTA_RECEIPT_WRITE_FAILED");
  }
}
