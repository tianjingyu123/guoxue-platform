/** 可靠派发内核；数据库适配器仍须持锁、核验授权并按 revision 条件更新。 */
export type CapabilityDispatchState = "READY" | "DISPATCHING" | "CONFIRMED" | "UNKNOWN" | "CANCELLED";
export interface CapabilityDispatchSnapshot {
  state: CapabilityDispatchState;
  revision: number;
  leaseToken: string | null;
  leaseUntil: Date | null;
  dispatchedAt: Date | null;
  resolvedAt: Date | null;
  evidenceRef: string | null;
}
export type CapabilityDispatchAction =
  | { type: "CLAIM"; leaseToken: string; leaseUntil: Date; holdUntil: Date }
  | { type: "EXPIRE_LEASE" }
  | { type: "CONFIRM"; leaseToken: string; evidenceRef: string }
  | { type: "CANCEL_READY"; evidenceRef: string };
const date = (value: unknown): value is Date => value instanceof Date && Number.isFinite(value.getTime());
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const evidence = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_./:-]{1,128}$/.test(value);

export function planCapabilityDispatch(current: CapabilityDispatchSnapshot, expectedRevision: number, now: Date, action: CapabilityDispatchAction):
  { allowed: false; reason: string } | { allowed: true; next: CapabilityDispatchSnapshot } {
  const deny = (reason: string) => ({ allowed: false as const, reason });
  if (!current || !date(now) || !Number.isSafeInteger(current.revision) || current.revision < 1 ||
    current.revision >= 2147483647 || expectedRevision !== current.revision) return deny("STALE_OR_INVALID_REVISION");
  const next = { ...current, revision: current.revision + 1 };
  if (action.type === "CLAIM") {
    if (current.state !== "READY" || current.leaseToken || current.dispatchedAt || current.resolvedAt || current.evidenceRef || current.leaseUntil ||
      !uuid(action.leaseToken) || !date(action.leaseUntil) || !date(action.holdUntil) ||
      action.leaseUntil <= now || action.leaseUntil > action.holdUntil) return deny("CLAIM_NOT_ALLOWED");
    return { allowed: true, next: { ...next, state: "DISPATCHING", leaseToken: action.leaseToken, leaseUntil: action.leaseUntil, dispatchedAt: now } };
  }
  if (action.type === "CANCEL_READY") {
    if (current.state !== "READY" || current.leaseToken || current.dispatchedAt || current.leaseUntil || current.resolvedAt ||
      !evidence(action.evidenceRef)) return deny("CANCEL_NOT_ALLOWED");
    return { allowed: true, next: { ...next, state: "CANCELLED", evidenceRef: action.evidenceRef, resolvedAt: now } };
  }
  if (!uuid(current.leaseToken) || !date(current.dispatchedAt) || !date(current.leaseUntil) ||
    current.leaseUntil <= current.dispatchedAt || now < current.dispatchedAt || current.resolvedAt || current.evidenceRef) return deny("INVALID_LEASE_STATE");
  if (action.type === "EXPIRE_LEASE") {
    if (current.state !== "DISPATCHING" || now < current.leaseUntil) return deny("LEASE_NOT_EXPIRED");
    // 保留同一次派发身份供对账，不重新排队，也不据此释放额度。
    return { allowed: true, next: { ...next, state: "UNKNOWN" } };
  }
  if (action.type === "CONFIRM") {
    if (!["DISPATCHING", "UNKNOWN"].includes(current.state) || action.leaseToken !== current.leaseToken || !evidence(action.evidenceRef)) return deny("CONFIRM_NOT_ALLOWED");
    return { allowed: true, next: { ...next, state: "CONFIRMED", evidenceRef: action.evidenceRef, resolvedAt: now } };
  }
  return deny("UNKNOWN_ACTION");
}
