import { createHash } from "node:crypto";

export interface CssMediaEvent { sessionHash: string; kind: "BEGIN" | "END"; occurredAtMs: number }
export interface MediaSessionEvidence { sessionHash: string; beganAtMs: number | null; endedAtMs: number | null }
export interface MediaEvidence { sessions: MediaSessionEvidence[]; uncertain: boolean }
export type MediaEvidenceStatus = "ONLINE" | "OFFLINE_OBSERVED" | "UNKNOWN";
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const sessionHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** 仅在回调守卫验签之后使用；不保留原包、鉴权参数、客户端IP或签名。 */
export function parseCssMediaEvent(body: Record<string, unknown>, expected: {
  roomId: string; domain: string; appName: string; nowMs: number;
}): CssMediaEvent | null {
  // sequence 标识一次推流活动；不能用到达时间代替官方 event_time。
  // 官方字段：https://cloud.tencent.com/document/product/267/47025
  if (!expected.roomId || !expected.domain || !expected.appName || !timestamp(expected.nowMs)
    || body.stream_id !== `room_${expected.roomId}` || body.app !== expected.domain || body.appname !== expected.appName
    || (body.event_type !== 0 && body.event_type !== 1)
    || typeof body.sequence !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.sequence)
    || typeof body.event_time !== "number" || !Number.isSafeInteger(body.event_time)) return null;
  const occurredAtMs = body.event_time * 1000;
  if (!timestamp(occurredAtMs) || occurredAtMs < 946684800000 || occurredAtMs > expected.nowMs + 300000) return null;
  return { sessionHash: createHash("sha256").update(body.sequence).digest("hex"),
    kind: body.event_type === 1 ? "BEGIN" : "END", occurredAtMs };
}

function validSession(row: MediaSessionEvidence): boolean {
  return !!row && sessionHash(row.sessionHash)
    && (row.beganAtMs === null || timestamp(row.beganAtMs)) && (row.endedAtMs === null || timestamp(row.endedAtMs))
    && (row.beganAtMs !== null || row.endedAtMs !== null);
}

/** 纯状态归并；重复、乱序可交换。持久层必须在同房间锁中加载、归并、提交。 */
export function mergeCssMediaEvidence(previous: MediaEvidence, event: CssMediaEvent): MediaEvidence {
  if (!previous || !Array.isArray(previous.sessions) || previous.sessions.length > 128 || typeof previous.uncertain !== "boolean"
    || !previous.sessions.every(validSession) || new Set(previous.sessions.map(row => row.sessionHash)).size !== previous.sessions.length
    || !event || !sessionHash(event.sessionHash) || !timestamp(event.occurredAtMs) || !["BEGIN", "END"].includes(event.kind)) {
    return { sessions: [], uncertain: true };
  }
  const sessions = previous.sessions.map(row => ({ ...row }));
  let row = sessions.find(item => item.sessionHash === event.sessionHash);
  if (!row) {
    // 不淘汰未结连接来腾空间，否则可把仍在推流的连接丢掉后误判离线。
    if (sessions.length === 128) return { sessions, uncertain: true };
    row = { sessionHash: event.sessionHash, beganAtMs: null, endedAtMs: null }; sessions.push(row);
  }
  const field = event.kind === "BEGIN" ? "beganAtMs" : "endedAtMs";
  const old = row[field];
  // 同一序列/同种事件有两个时间不可猜哪条正确，保留未知，等待供应商只读取证。
  const uncertain = previous.uncertain || old !== null && old !== event.occurredAtMs;
  row[field] = old === null ? event.occurredAtMs : Math.max(old, event.occurredAtMs);
  sessions.sort((a, b) => a.sessionHash.localeCompare(b.sessionHash));
  return { sessions, uncertain };
}

export function mediaEvidenceStatus(evidence: MediaEvidence): MediaEvidenceStatus {
  if (!evidence || evidence.uncertain || !Array.isArray(evidence.sessions) || !evidence.sessions.length
    || evidence.sessions.length > 128 || !evidence.sessions.every(validSession)
    || new Set(evidence.sessions.map(row => row.sessionHash)).size !== evidence.sessions.length) return "UNKNOWN";
  if (evidence.sessions.some(row => row.beganAtMs === null || row.endedAtMs !== null && row.endedAtMs < row.beganAtMs!)) return "UNKNOWN";
  return evidence.sessions.some(row => row.endedAtMs === null) ? "ONLINE" : "OFFLINE_OBSERVED";
}

// OFFLINE_OBSERVED 只证明已收到的连接已停止，不证明无遗漏回调或不会重连。
// 不在此释放额度；收尾还须持久化记录、业务结束、供应商停流/禁止重连的可信证明。
