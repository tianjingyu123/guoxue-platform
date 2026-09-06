import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { capabilityTimestamp as timestamp } from "../circle/circle-capability-time";

export type LiveCredentialScope = { provider: "CSS"; domain: string; appName: string; streamName: string }
  | { provider: "TRTC"; sdkAppId: number; trtcRoomId: string };
export interface CredentialBoundary { roomId: string; provider: "CSS" | "TRTC"; scope: LiveCredentialScope; expiresAt: Date; revision: number }
const uuid = (v: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const exactKeys = (v: object, keys: string[]) => Object.keys(v).sort().join() === keys.sort().join();
export function validScope(scope: LiveCredentialScope, roomId: string) {
  if (!scope || typeof scope !== "object" || !uuid(roomId)) return false;
  if (scope.provider === "CSS") return exactKeys(scope, ["provider", "domain", "appName", "streamName"])
    && typeof scope.domain === "string" && scope.domain.length <= 253 && scope.domain.split(".").length > 1
    && scope.domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    && /^[A-Za-z0-9_-]{1,64}$/.test(scope.appName) && scope.streamName === `room_${roomId}`;
  return scope.provider === "TRTC" && exactKeys(scope, ["provider", "sdkAppId", "trtcRoomId"])
    && Number.isSafeInteger(scope.sdkAppId) && scope.sdkAppId > 0 && /^[A-Za-z0-9_]{1,64}$/.test(scope.trtcRoomId);
}

/** URL 仅在调用栈内解析；返回对象严格投影，错误不携带 URL 或查询参数。 */
export function cssCredentialBoundary(roomId: string, pushUrl: string, nowMs: number) {
  try {
    const url = new URL(pushUrl), segments = url.pathname.split("/");
    const scope: LiveCredentialScope = { provider: "CSS", domain: url.hostname, appName: segments[1], streamName: segments[2] };
    const times = url.searchParams.getAll("txTime"), raw = times[0];
    if (url.protocol !== "rtmp:" || url.username || url.password || url.port || url.hash || segments.length !== 3
      || !validScope(scope, roomId) || times.length !== 1 || !/^[a-f0-9]{1,12}$/i.test(raw ?? "")) throw new Error();
    const expiresAt = new Date(parseInt(raw, 16) * 1000);
    assertExpiry(expiresAt, nowMs);
    return { scope, expiresAt };
  } catch { throw new Error("LIVE_CREDENTIAL_BOUNDARY_INVALID"); }
}
function assertExpiry(expiresAt: Date, nowMs: number) {
  if (!Number.isSafeInteger(nowMs) || !(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())
    || expiresAt.getTime() <= nowMs || expiresAt.getTime() > nowMs + 86400000) throw new Error("LIVE_CREDENTIAL_EXPIRY_INVALID");
}

/** 内部事务仓储。签发成功与边界记录必须共同提交；不能由 HTTP 请求提供范围。 */
@Injectable()
export class LiveMediaCredentialRepository {
  async recordCssInTransaction(tx: Prisma.TransactionClient, roomId: string, pushUrl: string, nowMs: number) {
    const boundary = cssCredentialBoundary(roomId, pushUrl, nowMs);
    return this.recordInTransaction(tx, roomId, boundary.scope, boundary.expiresAt, nowMs);
  }
  async recordTrtcInTransaction(tx: Prisma.TransactionClient, roomId: string, sdkAppId: number, trtcRoomId: string, expiresAt: string, nowMs: number) {
    return this.recordInTransaction(tx, roomId, { provider: "TRTC", sdkAppId, trtcRoomId }, new Date(expiresAt), nowMs);
  }
  async recordInTransaction(tx: Prisma.TransactionClient, roomId: string, scope: LiveCredentialScope, expiresAt: Date, nowMs: number) {
    if (!validScope(scope, roomId)) throw new Error("LIVE_CREDENTIAL_SCOPE_INVALID");
    assertExpiry(expiresAt, nowMs);
    await tx.$executeRaw`SELECT id FROM "LiveRoom" WHERE id=${roomId} FOR UPDATE`;
    const room = await tx.liveRoom.findUnique({ where: { id: roomId }, select: { status: true, auditStatus: true } });
    if (!room || !["WAITING", "LIVING"].includes(room.status) || room.auditStatus === "REJECTED") throw new Error("LIVE_CREDENTIAL_ROOM_CLOSED");
    const previous = (await this.readInTransaction(tx, roomId)).find(row => row.provider === scope.provider);
    if (previous) {
      if (Object.keys(scope).some(key => scope[key] !== previous.scope[key])) throw new Error("LIVE_CREDENTIAL_SCOPE_CHANGED");
      if (expiresAt <= previous.expiresAt) return previous;
      if (previous.revision >= 2147483647) throw new Error("LIVE_CREDENTIAL_REVISION_EXHAUSTED");
      const n = await tx.$executeRaw`UPDATE "LiveMediaCredentialBoundary" SET "expiresAt"=${timestamp(expiresAt)}, "revision"=${previous.revision + 1}
        WHERE "roomId"=${roomId} AND provider=${scope.provider} AND revision=${previous.revision}`;
      if (n !== 1) throw new Error("LIVE_CREDENTIAL_CONFLICT");
      return { ...previous, expiresAt, revision: previous.revision + 1 };
    }
    const n = await tx.$executeRaw`INSERT INTO "LiveMediaCredentialBoundary" ("roomId", provider, scope, "expiresAt", revision)
      VALUES (${roomId}, ${scope.provider}, ${JSON.stringify(scope)}::jsonb, ${timestamp(expiresAt)}, 1)`;
    if (n !== 1) throw new Error("LIVE_CREDENTIAL_INSERT_FAILED");
    return { roomId, provider: scope.provider, scope, expiresAt, revision: 1 };
  }

  async readInTransaction(tx: Prisma.TransactionClient, roomId: string): Promise<CredentialBoundary[]> {
    const rows = await tx.$queryRaw<CredentialBoundary[]>`SELECT * FROM "LiveMediaCredentialBoundary" WHERE "roomId"=${roomId} ORDER BY provider FOR UPDATE`;
    if (rows.length > 2 || new Set(rows.map(row => row.provider)).size !== rows.length || rows.some(row => row.roomId !== roomId
      || row.provider !== row.scope?.provider || !validScope(row.scope, roomId) || !(row.expiresAt instanceof Date)
      || !Number.isFinite(row.expiresAt.getTime()) || !Number.isInteger(row.revision) || row.revision < 1)) throw new Error("LIVE_CREDENTIAL_STORED_ROW_INVALID");
    return rows;
  }
}
