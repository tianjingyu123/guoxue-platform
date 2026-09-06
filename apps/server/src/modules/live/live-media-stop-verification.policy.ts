/** 供应商查询只保留脱敏字段；QUERYING 会立即撤销上一轮查询作为最新证据的资格。 */
export interface MediaStopVerification {
  queryId: string;
  state: "QUERYING" | "active" | "inactive" | "forbid" | "UNKNOWN";
  startedAtMs: number;
  receivedAtMs: number | null;
  requestId: string | null;
  scopeProofRef: string;
  proofValidUntilMs: number;
}
export interface MediaStopCompletion {
  quotaId: string;
  quotaRevision: number;
  completedAtMs: number;
  mediaRevision: number;
  credentialRevision: number;
  verification: MediaStopVerification;
}
export function validStopCompletion(value: MediaStopCompletion) {
  return !!value && typeof value === "object" && Object.keys(value).sort().join() ===
    ["quotaId", "quotaRevision", "completedAtMs", "mediaRevision", "credentialRevision", "verification"].sort().join()
    && typeof value.quotaId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.quotaId)
    && [value.quotaRevision, value.mediaRevision, value.credentialRevision].every(n => Number.isInteger(n) && n > 0 && n <= 2147483647)
    && Number.isSafeInteger(value.completedAtMs) && validStopVerification(value.verification) && value.verification.state === "forbid"
    && value.verification.receivedAtMs !== null && value.completedAtMs >= value.verification.receivedAtMs
    && value.completedAtMs - value.verification.receivedAtMs <= 60000 && value.completedAtMs < value.verification.proofValidUntilMs;
}
const timestamp = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export function validStopVerification(v: MediaStopVerification) {
  return !!v && typeof v === "object" && Object.keys(v).sort().join() ===
    ["queryId", "state", "startedAtMs", "receivedAtMs", "requestId", "scopeProofRef", "proofValidUntilMs"].sort().join()
    && typeof v.queryId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v.queryId)
    && timestamp(v.startedAtMs) && timestamp(v.proofValidUntilMs) && v.proofValidUntilMs > v.startedAtMs
    && typeof v.scopeProofRef === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v.scopeProofRef)
    && ["QUERYING", "active", "inactive", "forbid", "UNKNOWN"].includes(v.state)
    && (v.state === "QUERYING" ? v.receivedAtMs === null && v.requestId === null :
      timestamp(v.receivedAtMs) && v.receivedAtMs >= v.startedAtMs
      && (v.state === "UNKNOWN" ? v.requestId === null : typeof v.requestId === "string" && /^[A-Za-z0-9-]{1,128}$/.test(v.requestId)
        && v.receivedAtMs < v.proofValidUntilMs && v.receivedAtMs - v.startedAtMs <= 60000));
}
