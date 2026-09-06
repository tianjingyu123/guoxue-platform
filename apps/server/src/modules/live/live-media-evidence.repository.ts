import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MediaEvidence, mediaEvidenceStatus, mergeCssMediaEvidence, parseCssMediaEvent } from "./live-media-evidence.policy";

interface Snapshot { version: 1; domain: string; appName: string; evidence: MediaEvidence }
interface EvidenceRow { roomId: string; snapshot: Snapshot; revision: number }
const keys = (value: object, expected: string[]) => Object.keys(value).sort().join() === [...expected].sort().join();
const name = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9._-]{1,253}$/.test(value);

/** 内部事务仓储；只能接收已验签的回调。没有客户端 API，不调用供应商，不自行释放额度。 */
@Injectable()
export class LiveMediaEvidenceRepository {
  /** 与未来收尾同房间共用；同时需圈子锁时固定先圈子后房间，禁止反向获取。 */
  async lockRoom(tx: Prisma.TransactionClient, roomId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-media:${roomId}`}))`;
  }

  async readInTransaction(tx: Prisma.TransactionClient, roomId: string): Promise<EvidenceRow | null> {
    const rows = await tx.$queryRaw<EvidenceRow[]>`SELECT * FROM "LiveMediaEvidence" WHERE "roomId"=${roomId} FOR UPDATE`;
    if (!rows.length) return null;
    if (rows.length !== 1) throw new Error("LIVE_MEDIA_NON_UNIQUE");
    const row = rows[0], s = row.snapshot, evidence = s?.evidence;
    if (!Number.isSafeInteger(row.revision) || row.revision < 1 || !s || s.version !== 1 || !name(s.domain) || !name(s.appName)
      || !keys(s, ["version", "domain", "appName", "evidence"]) || !evidence || !keys(evidence, ["sessions", "uncertain"])
      || typeof evidence.uncertain !== "boolean" || !Array.isArray(evidence.sessions) || evidence.sessions.length > 128
      || evidence.sessions.some(item => !item || !keys(item, ["sessionHash", "beganAtMs", "endedAtMs"])
        || !/^[a-f0-9]{64}$/.test(item.sessionHash)
        || ![item.beganAtMs, item.endedAtMs].every(t => t === null || Number.isSafeInteger(t) && t >= 0)
        || item.beganAtMs === null && item.endedAtMs === null)
      || new Set(evidence.sessions.map(item => item.sessionHash)).size !== evidence.sessions.length) throw new Error("LIVE_MEDIA_INVALID_STORED_ROW");
    return row;
  }

  async recordCssInTransaction(tx: Prisma.TransactionClient, body: Record<string, unknown>, expected: {
    roomId: string; domain: string; appName: string; nowMs: number;
  }) {
    if (!name(expected.domain) || !name(expected.appName)) return { ignored: true as const };
    const event = parseCssMediaEvent(body, expected);
    if (!event) return { ignored: true as const };
    await this.lockRoom(tx, expected.roomId);
    const room = await tx.liveRoom.findUnique({ where: { id: expected.roomId }, select: { id: true } });
    if (!room) return { ignored: true as const };
    const previous = await this.readInTransaction(tx, room.id);
    // 配置变更不把历史回调冒充新供应商活动的完整证据，保留 UNKNOWN 等待核对。
    const prior = previous?.snapshot.evidence ?? { sessions: [], uncertain: false };
    const changedScope = !!previous && (previous.snapshot.domain !== expected.domain || previous.snapshot.appName !== expected.appName);
    const evidence = mergeCssMediaEvidence({ ...prior, uncertain: prior.uncertain || changedScope }, event);
    const snapshot: Snapshot = { version: 1, domain: expected.domain, appName: expected.appName, evidence };
    const status = mediaEvidenceStatus(evidence);
    // PostgreSQL jsonb 会重排对象键，不能以 JSON.stringify 的键顺序判定重复。
    if (previous && !changedScope && prior.uncertain === evidence.uncertain && prior.sessions.length === evidence.sessions.length
      && evidence.sessions.every(item => prior.sessions.some(old => old.sessionHash === item.sessionHash
        && old.beganAtMs === item.beganAtMs && old.endedAtMs === item.endedAtMs))) {
      return { ignored: false as const, changed: false, revision: previous.revision, status };
    }
    const revision = (previous?.revision ?? 0) + 1;
    if (revision > 2147483647) throw new Error("LIVE_MEDIA_REVISION_EXHAUSTED");
    const changed = previous
      ? await tx.$executeRaw`UPDATE "LiveMediaEvidence" SET "snapshot"=${JSON.stringify(snapshot)}::jsonb, "revision"=${revision}
          WHERE "roomId"=${room.id} AND "revision"=${previous.revision}`
      : await tx.$executeRaw`INSERT INTO "LiveMediaEvidence" ("roomId", "snapshot", "revision") VALUES (${room.id}, ${JSON.stringify(snapshot)}::jsonb, ${revision})`;
    if (changed !== 1) throw new Error("LIVE_MEDIA_REVISION_CONFLICT");
    return { ignored: false as const, changed: true, revision, status };
  }

  /** 返回给工作台的脱敏投影；CSS 不读取旧 Redis 状态，重启后仍以主库为准。 */
  async runtimeInTransaction(tx: Prisma.TransactionClient, roomId: string, scope: { domain: string; appName: string; nowMs: number }) {
    const row = await this.readInTransaction(tx, roomId);
    const unknown = { status: "unknown" as const, connectedAt: null, disconnectedAt: null, lastEventAt: null,
      reason: "awaiting_verified_media_evidence", evidenceRevision: row?.revision ?? 0 };
    if (!row || row.snapshot.domain !== scope.domain || row.snapshot.appName !== scope.appName) return unknown;
    const state = mediaEvidenceStatus(row.snapshot.evidence), sessions = row.snapshot.evidence.sessions;
    const times = sessions.flatMap(s => [s.beganAtMs, s.endedAtMs]).filter((t): t is number => t !== null);
    const last = Math.max(...times);
    // 不延长旧 Redis 的 48 小时有效期；缺新回调不能让历史开始事件永久充当在线。
    if (state === "UNKNOWN" || !Number.isSafeInteger(scope.nowMs) || last > scope.nowMs + 300000 || scope.nowMs - last > 48 * 3600000) return unknown;
    const online = state === "ONLINE";
    const begins = sessions.filter(s => online ? s.endedAtMs === null : true).map(s => s.beganAtMs!);
    const ends = sessions.map(s => s.endedAtMs).filter((t): t is number => t !== null);
    return { status: online ? "online" as const : "offline" as const,
      connectedAt: new Date(Math.max(...begins)).toISOString(),
      disconnectedAt: online ? null : new Date(Math.max(...ends)).toISOString(),
      lastEventAt: new Date(last).toISOString(), reason: online ? null : "upstream_disconnected",
      evidenceRevision: row.revision };
  }
}
