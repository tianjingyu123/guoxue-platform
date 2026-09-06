import { createHash } from "crypto";
import { VerifiedTrtcCallback } from "../../common/trtc-callback.guard";

export interface ConsultMediaEvent {
  key: string; sdkAppId: number; roomId: string; userId: string | null; uniqueId: number | null;
  type: number; eventAt: number; precise: boolean; callbackAt: number; receivedAt: number; bodyDigest: string;
}
export interface ConsultMediaEvidence { version: 1; revision: number; overflow: boolean; events: ConsultMediaEvent[] }
const types = [101, 102, 103, 104, 201, 202, 203, 204, 205, 206];
const millis = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 8640000000000000;
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const eventKey = (event: Omit<ConsultMediaEvent, "key">) => createHash("sha256").update(JSON.stringify([
  event.sdkAppId, event.roomId, event.userId, event.uniqueId, event.type, event.eventAt, event.precise,
])).digest("hex");
const validEvent = (event: ConsultMediaEvent) => !!event && digest(event.key) && event.key === eventKey(event)
  && Number.isSafeInteger(event.sdkAppId) && event.sdkAppId > 0 && event.sdkAppId <= 0xffffffff
  && /^consult_[a-f0-9]{16}$/.test(event.roomId) && types.includes(event.type) && typeof event.precise === "boolean"
  && (event.type === 101 || event.type === 102 ? event.userId === null : typeof event.userId === "string" && /^c_[a-f0-9]{30}$/.test(event.userId))
  && (event.uniqueId === null || Number.isSafeInteger(event.uniqueId) && event.uniqueId > 0)
  && millis(event.eventAt) && millis(event.callbackAt) && millis(event.receivedAt) && digest(event.bodyDigest)
  && event.eventAt <= event.callbackAt + 300000 && event.callbackAt <= event.receivedAt + 300000;

/** 主库读取后也必须验证形状；不能把损坏的JSON当作离线证明。 */
export function validConsultMediaEvidence(value: unknown): value is ConsultMediaEvidence {
  if (!value || typeof value !== "object") return false;
  const state = value as ConsultMediaEvidence;
  return state.version === 1 && Number.isInteger(state.revision) && state.revision > 0 && state.revision <= 2147483647
    && typeof state.overflow === "boolean" && Array.isArray(state.events) && state.events.length > 0 && state.events.length <= 128
    && state.events.every(validEvent) && new Set(state.events.map(row => row.key)).size === state.events.length
    && state.events.every(row => row.sdkAppId === state.events[0].sdkAppId && row.roomId === state.events[0].roomId);
}

/** 只归一化已验签快照，不接收原始 HTTP DTO 作为可信来源。 */
export function parseConsultMediaEvent(verified: VerifiedTrtcCallback): ConsultMediaEvent | null {
  const body = verified.body, info = body.EventInfo;
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  const value = info as Record<string, unknown>, type = body.EventType;
  if (typeof type !== "number" || !types.includes(type) || body.EventGroupId !== (type < 200 ? 1 : 2)
    || typeof value.RoomId !== "string" || !/^consult_[a-f0-9]{16}$/.test(value.RoomId)
    || !Number.isSafeInteger(verified.sdkAppId) || verified.sdkAppId < 1 || verified.sdkAppId > 0xffffffff
    || !millis(body.CallbackTs) || !millis(verified.receivedAt) || !digest(verified.bodyDigest)) return null;
  const precise = value.EventMsTs !== undefined;
  const eventAt = precise ? value.EventMsTs : typeof value.EventTs === "number" && Number.isSafeInteger(value.EventTs) ? value.EventTs * 1000 : NaN;
  if (!millis(eventAt) || eventAt > body.CallbackTs + 300000 || body.CallbackTs > verified.receivedAt + 300000) return null;
  const userId = type === 101 || type === 102 ? null : value.UserId;
  if (userId !== null && (typeof userId !== "string" || !/^c_[a-f0-9]{30}$/.test(userId))) return null;
  const uniqueId = value.UniqueId === undefined ? null : value.UniqueId;
  if (uniqueId !== null && (typeof uniqueId !== "number" || !Number.isSafeInteger(uniqueId) || uniqueId <= 0)) return null;
  const normalized = { sdkAppId: verified.sdkAppId, roomId: value.RoomId, userId: userId as string | null, uniqueId: uniqueId as number | null,
    type, eventAt, precise, callbackAt: body.CallbackTs, receivedAt: verified.receivedAt, bodyDigest: verified.bodyDigest };
  return { key: eventKey(normalized), ...normalized };
}

export function appendConsultMediaEvent(previous: ConsultMediaEvidence | null, event: ConsultMediaEvent): ConsultMediaEvidence {
  const state = previous ?? { version: 1 as const, revision: 0, overflow: false, events: [] };
  if (state.version !== 1 || !Number.isInteger(state.revision) || state.revision < (previous ? 1 : 0) || state.revision >= 2147483647
    || typeof state.overflow !== "boolean" || !Array.isArray(state.events) || state.events.length > 128
    || !validEvent(event) || new Set(state.events.map(row => row?.key)).size !== state.events.length
    || state.events.some(row => !validEvent(row) || row.sdkAppId !== event.sdkAppId || row.roomId !== event.roomId)) {
    throw new Error("CONSULT_MEDIA_EVIDENCE_INVALID");
  }
  // 重投不更新接收时间，不能靠重放旧事件伪造新鲜的退房证据。
  if (state.events.some(row => row.key === event.key) || state.overflow) return state;
  if (state.events.length === 128) return { ...state, overflow: true, revision: state.revision + 1 };
  return { version: 1, revision: state.revision + 1, overflow: false, events: [...state.events, { ...event }] };
}

/** 仅是观察态，不是额度完成决策；无UniqueId时按供应商新版过滤后的用户事件处理。 */
export function observeConsultMedia(evidence: ConsultMediaEvidence | null, participants: [string, string]): "ACTIVITY_OBSERVED" | "OFFLINE_OBSERVED" | "UNKNOWN" {
  if (!validConsultMediaEvidence(evidence) || evidence.overflow || participants[0] === participants[1]
    || !participants.every(user => /^c_[a-f0-9]{30}$/.test(user))
    || evidence.events.some(event => event.userId !== null && !participants.includes(event.userId))) return "UNKNOWN";
  const events = evidence.events;
  const latestAt = Math.max(...events.map(event => event.eventAt)), latest = events.filter(event => event.eventAt === latestAt);
  if (latest.some(event => event.type === 102)) {
    return latest.every(event => event.type === 102 && event.precise) ? "OFFLINE_OBSERVED" : "UNKNOWN";
  }
  let allClosed = true, active = false, ambiguous = false;
  for (const userId of participants) {
    const owned = events.filter(event => event.userId === userId), presence = owned.filter(event => event.type === 103 || event.type === 104);
    if (!presence.length) { allClosed = false; if (owned.some(event => [201, 203, 205].includes(event.type))) active = true; continue; }
    const modes = new Set(presence.map(event => event.uniqueId === null));
    if (modes.size > 1) { ambiguous = true; continue; }
    for (const session of new Set(presence.map(event => event.uniqueId))) {
      const rows = presence.filter(event => event.uniqueId === session), max = Math.max(...rows.map(event => event.eventAt));
      const last = rows.filter(event => event.eventAt === max);
      if (last.some(event => !event.precise) || new Set(last.map(event => event.type)).size > 1) { ambiguous = true; continue; }
      if (last[0].type === 103) { active = true; allClosed = false; }
    }
    const lastExit = Math.max(0, ...presence.filter(event => event.type === 104).map(event => event.eventAt));
    if (owned.some(event => event.type >= 200 && event.eventAt >= lastExit)) { active = true; allClosed = false; }
  }
  if (ambiguous) return "UNKNOWN";
  if (active || latest.some(event => event.type === 101)) return "ACTIVITY_OBSERVED";
  return allClosed ? "OFFLINE_OBSERVED" : "UNKNOWN";
}

/** 收尾候选证据：必须在重入保护窗后观察整房解散；仍不能代替权限证明或账本事务。 */
export function consultFinalRoomObservation(evidence: ConsultMediaEvidence | null, participants: [string, string],
  scope: { sdkAppId: number; rtcRoomId: string }, protectUntilMs: number, nowMs: number) {
  const pending = (reason: string) => ({ observed: false as const, reason });
  if (!Number.isSafeInteger(protectUntilMs) || protectUntilMs <= 0 || !Number.isSafeInteger(nowMs)
    || nowMs < protectUntilMs) return pending("REENTRY_WINDOW_OPEN");
  if (!validConsultMediaEvidence(evidence) || evidence.overflow
    || evidence.events.some(event => event.sdkAppId !== scope.sdkAppId || event.roomId !== scope.rtcRoomId)) {
    return pending("EVIDENCE_SCOPE_INVALID");
  }
  // 验签阶段容忍时钟偏差不代表可以提前消费未来事件；历史重投也不能刷新事件时间。
  if (evidence.events.some(event => event.eventAt > nowMs || event.callbackAt > nowMs || event.receivedAt > nowMs)) {
    return pending("EVIDENCE_IN_FUTURE");
  }
  if (observeConsultMedia(evidence, participants) !== "OFFLINE_OBSERVED") return pending("MEDIA_NOT_CLOSED");
  const lastAt = Math.max(...evidence.events.map(event => event.eventAt));
  const latest = evidence.events.filter(event => event.eventAt === lastAt);
  if (lastAt <= protectUntilMs || !latest.every(event => event.type === 102 && event.precise)) {
    return pending("NO_ROOM_DISMISS_AFTER_PROTECTION");
  }
  return { observed: true as const, evidenceRevision: evidence.revision, eventKey: latest[0].key, eventAt: lastAt };
}
