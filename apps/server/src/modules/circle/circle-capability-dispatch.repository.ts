import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { capabilityTimestamp as timestamp } from "./circle-capability-time";
import { CapabilityDispatchAction, CapabilityDispatchSnapshot, planCapabilityDispatch } from "./circle-capability-dispatch.policy";

export interface CapabilityDispatchRecord extends CapabilityDispatchSnapshot {
  id: string;
  reservationId: string;
  providerOperationKey: string;
  createdAt: Date;
  updatedAt: Date;
}
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const date = (v: unknown): v is Date => v instanceof Date && Number.isFinite(v.getTime());

/** 必须使用已持同圈事务锁的主库事务；不自行提交，不调用供应商，不注册到公开接口。 */
@Injectable()
export class CircleCapabilityDispatchRepository {
  private decode(row: CapabilityDispatchRecord): CapabilityDispatchRecord {
    if (![row.id, row.reservationId, row.providerOperationKey].every(uuid) || !date(row.createdAt) || !date(row.updatedAt) ||
      row.updatedAt < row.createdAt || !Number.isInteger(row.revision) || row.revision < 1 || row.revision > 2147483647) throw new Error("DISPATCH_INVALID_ROW");
    const ready = row.state === "READY";
    const cancelled = row.state === "CANCELLED";
    const leased = ["DISPATCHING", "UNKNOWN", "CONFIRMED"].includes(row.state);
    const terminal = cancelled || row.state === "CONFIRMED";
    if ((!ready && !cancelled && !leased) ||
      (leased ? !uuid(row.leaseToken) || !date(row.leaseUntil) || !date(row.dispatchedAt) || row.dispatchedAt < row.createdAt ||
        row.dispatchedAt > row.updatedAt || row.leaseUntil <= row.dispatchedAt : row.leaseToken !== null || row.leaseUntil !== null || row.dispatchedAt !== null) ||
      (terminal ? !date(row.resolvedAt) || row.resolvedAt < (row.dispatchedAt ?? row.createdAt) || row.resolvedAt > row.updatedAt ||
        typeof row.evidenceRef !== "string" || !/^[A-Za-z0-9_./:-]{1,128}$/.test(row.evidenceRef) : row.resolvedAt !== null || row.evidenceRef !== null) ||
      (row.state === "UNKNOWN" && row.updatedAt < row.leaseUntil!)) throw new Error("DISPATCH_INVALID_STATE");
    // 显式白名单，数据库附带字段不得流入日志或供应商调用。
    return { id: row.id, reservationId: row.reservationId, providerOperationKey: row.providerOperationKey,
      state: row.state, revision: row.revision, leaseToken: row.leaseToken, leaseUntil: row.leaseUntil,
      dispatchedAt: row.dispatchedAt, resolvedAt: row.resolvedAt, evidenceRef: row.evidenceRef,
      createdAt: row.createdAt, updatedAt: row.updatedAt };
  }
  private one(rows: CapabilityDispatchRecord[]): CapabilityDispatchRecord | null {
    if (rows.length > 1) throw new Error("DISPATCH_NON_UNIQUE_ROW");
    return rows.length ? this.decode(rows[0]) : null;
  }
  async byReservation(tx: Prisma.TransactionClient, reservationId: string) {
    return this.one(await tx.$queryRaw<CapabilityDispatchRecord[]>`
      SELECT * FROM "CircleCapabilityDispatch" WHERE "reservationId" = ${reservationId} FOR UPDATE`);
  }
  async insertReady(tx: Prisma.TransactionClient, input: {
    id: string; reservationId: string; providerOperationKey: string; expectedQuotaRevision: number; now: Date;
  }) {
    if (![input.id, input.reservationId, input.providerOperationKey].every(uuid) || !date(input.now) ||
      !Number.isInteger(input.expectedQuotaRevision) || input.expectedQuotaRevision < 1) throw new Error("DISPATCH_INVALID_INSERT");
    // 只能和尚未到期的 HELD 额度同事务登记；唯一索引冲突交调用方回滚，不能新建第二次派发。
    const rows = await tx.$queryRaw<CapabilityDispatchRecord[]>`INSERT INTO "CircleCapabilityDispatch"
      ("id", "reservationId", "providerOperationKey", "state", "revision", "createdAt", "updatedAt")
      SELECT ${input.id}, q."id", ${input.providerOperationKey}, 'READY', 1, ${timestamp(input.now)}, ${timestamp(input.now)}
      FROM "CircleCapabilityQuota" q WHERE q."id" = ${input.reservationId} AND q."revision" = ${input.expectedQuotaRevision}
        AND q."state" = 'HELD' AND q."holdUntil" > ${timestamp(input.now)} AND q."updatedAt" <= ${timestamp(input.now)}
      RETURNING *`;
    const result = this.one(rows);
    if (!result || result.id !== input.id || result.reservationId !== input.reservationId || result.providerOperationKey !== input.providerOperationKey ||
      result.state !== "READY" || result.revision !== 1) throw new Error("DISPATCH_INSERT_FAILED");
    return result;
  }
  async transition(tx: Prisma.TransactionClient, previous: CapabilityDispatchRecord, expectedRevision: number, now: Date, action: CapabilityDispatchAction) {
    const current = this.decode(previous);
    if (!date(now) || now < current.updatedAt) throw new Error("DISPATCH_INVALID_TIME");
    const plan = planCapabilityDispatch(current, expectedRevision, now, action);
    if (!plan.allowed) throw new Error(`DISPATCH_${plan.reason}`);
    const next = plan.next;
    return this.one(await tx.$queryRaw<CapabilityDispatchRecord[]>`UPDATE "CircleCapabilityDispatch" SET
      "state" = ${next.state}::"CircleCapabilityDispatchState", "revision" = ${next.revision},
      "leaseToken" = ${next.leaseToken}, "leaseUntil" = ${timestamp(next.leaseUntil)},
      "dispatchedAt" = ${timestamp(next.dispatchedAt)}, "resolvedAt" = ${timestamp(next.resolvedAt)},
      "evidenceRef" = ${next.evidenceRef}, "updatedAt" = ${timestamp(now)}
      WHERE "id" = ${current.id} AND "reservationId" = ${current.reservationId} AND "providerOperationKey" = ${current.providerOperationKey}
        AND "revision" = ${current.revision} AND "state" = ${current.state}::"CircleCapabilityDispatchState"
        AND "updatedAt" = ${timestamp(current.updatedAt)}
        AND (${action.type !== "CLAIM"} OR EXISTS (
          SELECT 1 FROM "CircleCapabilityQuota" q WHERE q."id" = ${current.reservationId}
            AND q."state" = 'ACTIVE' AND q."activatedAt" IS NOT NULL
            AND q."activatedAt" <= ${timestamp(now)} AND q."holdUntil" >= ${timestamp(next.leaseUntil)}
        )) RETURNING *`);
  }
}
