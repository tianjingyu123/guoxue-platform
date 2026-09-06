/** 停流待办不是停流凭证；本策略不调用云端，也不允许据此释放额度。 */
export interface ConsultStopIntent {
  version: 1;
  state: "READY" | "DISPATCHING" | "ACKNOWLEDGED" | "UNKNOWN";
  operationId: string;
  reason: "END" | "CANCEL" | "WAITING_TIMEOUT" | "BUDGET_TIMEOUT";
  requestedBy: string | null;
  requestedAt: string;
  credentialRevision: number;
  scope: { sdkAppId: number; rtcRoomId: string };
  protectUntil: string;
  dispatch?: {
    region: "ap-beijing" | "ap-guangzhou";
    claimedAt: string;
    leaseUntil: string;
    resultAt?: string;
    providerRequestId?: string;
  };
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const validDate = (date: Date) => date instanceof Date && Number.isFinite(date.getTime());

export function createConsultStopIntent(input: {
  operationId: string;
  reason: ConsultStopIntent["reason"];
  requestedBy: string | null;
  now: Date;
  boundary: { scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number };
}): ConsultStopIntent {
  const { boundary, now, reason, requestedBy, operationId } = input;
  if (!uuid.test(operationId) || !["END", "CANCEL", "WAITING_TIMEOUT", "BUDGET_TIMEOUT"].includes(reason)
    || (["WAITING_TIMEOUT", "BUDGET_TIMEOUT"].includes(reason) ? requestedBy !== null : typeof requestedBy !== "string" || !uuid.test(requestedBy))
    || !validDate(now) || !validDate(boundary.expiresAt)
    || !Number.isInteger(boundary.revision) || boundary.revision < 1 || boundary.revision > 2147483647
    || !Number.isSafeInteger(boundary.scope?.sdkAppId) || boundary.scope.sdkAppId < 1 || boundary.scope.sdkAppId > 0xffffffff
    || !/^consult_[a-f0-9]{16}$/.test(boundary.scope?.rtcRoomId ?? "")) {
    throw new Error("CONSULT_STOP_INTENT_INVALID");
  }
  const protectUntil = new Date(Math.max(now.getTime(), boundary.expiresAt.getTime()) + 300000);
  if (!validDate(protectUntil)) throw new Error("CONSULT_STOP_INTENT_INVALID");
  // 显式白名单复制，避免误将票据原文或其他环境字段写入待办。
  return { version: 1, state: "READY", operationId, reason, requestedBy, requestedAt: now.toISOString(),
    credentialRevision: boundary.revision,
    scope: { sdkAppId: boundary.scope.sdkAppId, rtcRoomId: boundary.scope.rtcRoomId },
    protectUntil: protectUntil.toISOString() };
}

/** 主库读回的待办也必须完整校验，不能仅凭 state=ACKNOWLEDGED 就展示为可信记录。 */
export function validConsultStopIntent(intent: ConsultStopIntent, boundary: {
  scope: { sdkAppId: number; rtcRoomId: string }; expiresAt: Date; revision: number;
}, call: { status: string; callerId: string; expertId: string; rtcRoomId: string }): boolean {
  const time = (value: unknown) => {
    const ms = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(ms) && new Date(ms).toISOString() === value ? ms : NaN;
  };
  try {
    if (!intent || intent.version !== 1) return false;
    const expected = createConsultStopIntent({ operationId: intent.operationId, reason: intent.reason,
      requestedBy: intent.requestedBy, now: new Date(intent.requestedAt), boundary });
    if (intent.scope?.sdkAppId !== expected.scope.sdkAppId || intent.scope?.rtcRoomId !== expected.scope.rtcRoomId
      || call.rtcRoomId !== expected.scope.rtcRoomId || intent.credentialRevision !== expected.credentialRevision
      || intent.protectUntil !== expected.protectUntil || intent.requestedAt !== expected.requestedAt
      || (['END', 'BUDGET_TIMEOUT'].includes(intent.reason) ? call.status !== 'ENDED' : intent.reason === 'WAITING_TIMEOUT' ? call.status !== 'MISSED' : !['MISSED', 'REFUNDED'].includes(call.status))
      || (!['WAITING_TIMEOUT', 'BUDGET_TIMEOUT'].includes(intent.reason) && intent.requestedBy !== call.callerId && intent.requestedBy !== call.expertId)) return false;
    if (intent.state === 'READY') return !intent.dispatch;
    const dispatch = intent.dispatch;
    if (!['DISPATCHING', 'UNKNOWN', 'ACKNOWLEDGED'].includes(intent.state) || !dispatch
      || !['ap-beijing', 'ap-guangzhou'].includes(dispatch.region)
      || !Number.isFinite(time(dispatch.claimedAt)) || time(dispatch.claimedAt) < time(intent.requestedAt)
      || time(dispatch.leaseUntil) !== time(dispatch.claimedAt) + 60000) return false;
    if (intent.state === 'DISPATCHING') return !dispatch.resultAt && !dispatch.providerRequestId;
    if (!Number.isFinite(time(dispatch.resultAt)) || time(dispatch.resultAt) < time(dispatch.claimedAt)) return false;
    if (intent.state === 'UNKNOWN') return !dispatch.providerRequestId;
    return typeof dispatch.providerRequestId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(dispatch.providerRequestId)
      && time(dispatch.resultAt) <= time(dispatch.leaseUntil);
  } catch { return false; }
}
