import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { CapabilityGrantSnapshot, CIRCLE_CAPABILITY_CONFIG_KEY, CircleCapability } from "./circle-capability.policy";
import { capabilityTimestamp as timestamp } from "./circle-capability-time";

export interface CapabilityGrantRow extends CapabilityGrantSnapshot {
  subjectKey: string;
  sequence: number;
  eligibilitySnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
export const capabilitySubjectKey = (userId: string | null) => userId === null ? "circle" : `user:${userId}`;
export interface CapabilitySubjectLocks { userIds: string[]; memberIds: string[]; roleIds: string[] }

/** 参数化 SQL 边界；只接受事务客户端，不自行连接或写其他表。 */
@Injectable()
export class CircleCapabilityRepository {
  async lockCircle(tx: Prisma.TransactionClient, circleId: string) {
    // 同圈四种能力/服务者统一排序，避免圈级撤销和服务者审批分别上锁产生竞态。
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`circle-capability:${circleId}`}))`;
    const configs = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ConfigSystem" WHERE "configKey" = ${CIRCLE_CAPABILITY_CONFIG_KEY} FOR SHARE`;
    const circles = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Circle" WHERE "id" = ${circleId} FOR SHARE`;
    // 空查询没有行锁；不能在后续读取时接受刚插入、实际未被锁定的记录。
    return { configId: configs[0]?.id ?? null, circleId: circles[0]?.id ?? null };
  }

  async lockPeople(tx: Prisma.TransactionClient, circleId: string, actorId: string, userIds: string[]) {
    const ids = [...new Set([actorId, ...userIds])].sort();
    const users = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "User" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`);
    const members = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "CircleMember" WHERE "circleId" = ${circleId} AND "userId" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`);
    const roles = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "UserRole" WHERE "userId" = ${actorId} ORDER BY "id" FOR SHARE`;
    return { userIds: users.map(r => r.id), memberIds: members.map(r => r.id), roleIds: roles.map(r => r.id) } satisfies CapabilitySubjectLocks;
  }

  async byId(tx: Prisma.TransactionClient, id: string): Promise<CapabilityGrantRow | null> {
    const rows = await tx.$queryRaw<CapabilityGrantRow[]>`SELECT * FROM "CircleCapabilityGrant" WHERE "id" = ${id}`;
    return rows[0] ?? null;
  }

  async latest(tx: Prisma.TransactionClient, circleId: string, capability: CircleCapability, subjectUserId: string | null): Promise<CapabilityGrantRow | null> {
    const key = capabilitySubjectKey(subjectUserId);
    const rows = await tx.$queryRaw<CapabilityGrantRow[]>`SELECT * FROM "CircleCapabilityGrant"
      WHERE "circleId" = ${circleId} AND "capability" = ${capability}::"CircleCapabilityType" AND "subjectKey" = ${key}
      ORDER BY "sequence" DESC LIMIT 1`;
    return rows[0] ?? null;
  }

  async create(tx: Prisma.TransactionClient, pending: CapabilityGrantSnapshot, sequence: number, eligibility: unknown, now: Date) {
    const key = capabilitySubjectKey(pending.subjectUserId);
    const rows = await tx.$queryRaw<CapabilityGrantRow[]>`INSERT INTO "CircleCapabilityGrant"
      ("id", "circleId", "ownerId", "applicantId", "subjectUserId", "subjectKey", "capability", "sequence", "policyRevision",
       "revision", "state", "enabled", "eligibilitySnapshot", "createdAt", "updatedAt", "source", "expiresAt", "maxUnits", "maxConcurrent")
      VALUES (${pending.id}, ${pending.circleId}, ${pending.ownerId}, ${pending.applicantId}, ${pending.subjectUserId}, ${key},
        ${pending.capability}::"CircleCapabilityType", ${sequence}, ${pending.policyRevision}, 1, ${pending.state}::"CircleCapabilityGrantState", ${pending.enabled},
        ${JSON.stringify(eligibility)}::jsonb, ${timestamp(now)}, ${timestamp(now)}, ${pending.source ?? "CIRCLE_APPLICATION"},
        ${timestamp(pending.expiresAt)}, ${pending.maxUnits}, ${pending.maxConcurrent}) RETURNING *`;
    if (rows.length !== 1) throw new Error("CAPABILITY_INSERT_FAILED");
    return rows[0];
  }

  async compareAndSet(tx: Prisma.TransactionClient, previous: CapabilityGrantRow, next: CapabilityGrantSnapshot, now: Date) {
    const rows = await tx.$queryRaw<CapabilityGrantRow[]>`UPDATE "CircleCapabilityGrant"
      SET "state" = ${next.state}::"CircleCapabilityGrantState", "enabled" = ${next.enabled}, "revision" = ${next.revision},
        "expiresAt" = ${timestamp(next.expiresAt)}, "maxUnits" = ${next.maxUnits}, "maxConcurrent" = ${next.maxConcurrent}, "updatedAt" = ${timestamp(now)}
      WHERE "id" = ${previous.id} AND "revision" = ${previous.revision} AND "state" = ${previous.state}::"CircleCapabilityGrantState"
      RETURNING *`;
    return rows.length === 1 ? rows[0] : null;
  }

  async audit(tx: Prisma.TransactionClient, actorId: string, action: string, reason: string, previous: CapabilityGrantSnapshot | null, next: CapabilityGrantSnapshot, now: Date) {
    // 快照仅为授权字段；不复制账号资料或第三方配置内容。
    const snapshot = (g: CapabilityGrantSnapshot) => ({ id: g.id, circleId: g.circleId, ownerId: g.ownerId, applicantId: g.applicantId,
      subjectUserId: g.subjectUserId, capability: g.capability, source: g.source ?? "CIRCLE_APPLICATION", policyRevision: g.policyRevision, revision: g.revision,
      state: g.state, enabled: g.enabled, expiresAt: g.expiresAt, maxUnits: g.maxUnits, maxConcurrent: g.maxConcurrent });
    const affected = await tx.$executeRaw`INSERT INTO "CircleCapabilityAudit"
      ("id", "grantId", "revision", "actorId", "action", "reason", "beforeSnapshot", "afterSnapshot", "createdAt")
      VALUES (${randomUUID()}, ${next.id}, ${next.revision}, ${actorId}, ${action}, ${reason},
        ${previous ? JSON.stringify(snapshot(previous)) : null}::jsonb, ${JSON.stringify(snapshot(next))}::jsonb, ${timestamp(now)})`;
    if (affected !== 1) throw new Error("CAPABILITY_AUDIT_FAILED");
  }

  async list(tx: Prisma.TransactionClient, filters: { circleId?: string; subjectUserId?: string; state?: string; capability?: CircleCapability }, offset: number, limit: number) {
    const clauses: Prisma.Sql[] = [];
    if (filters.circleId) clauses.push(Prisma.sql`"circleId" = ${filters.circleId}`);
    if (filters.subjectUserId) clauses.push(Prisma.sql`"subjectUserId" = ${filters.subjectUserId}`);
    if (filters.state) clauses.push(Prisma.sql`"state" = ${filters.state}::"CircleCapabilityGrantState"`);
    if (filters.capability) clauses.push(Prisma.sql`"capability" = ${filters.capability}::"CircleCapabilityType"`);
    const where = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.empty;
    const rows = await tx.$queryRaw<CapabilityGrantRow[]>(Prisma.sql`SELECT * FROM "CircleCapabilityGrant" ${where} ORDER BY "createdAt" DESC, "id" DESC OFFSET ${offset} LIMIT ${limit}`);
    const counts = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT count(*) AS count FROM "CircleCapabilityGrant" ${where}`);
    return { items: rows, total: Number(counts[0]?.count ?? 0) };
  }
}
