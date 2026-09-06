import { CapabilityGrantSnapshot, CapabilityRuntimeContext, CircleCapability, evaluateCapabilityUse, RuleRead } from "./circle-capability.policy";

/** 仅作事务内决策。仓储必须串行读取/写入两份额度和审计；此内核不执行 SDK、订单或数据库操作。 */
export const CAPABILITY_BUSINESS_TYPES = { LIVE: "LIVE_SESSION", SHORT_VIDEO: "SHORT_VIDEO_PUBLISH",
  AUDIO_QUESTION: "AUDIO_QUESTION", VIDEO_QUESTION: "VIDEO_QUESTION" } as const;
export type QuotaState = "HELD" | "ACTIVE" | "COMPLETED" | "RELEASED" | "EXPIRED";
export type QuotaAction = "ACTIVATE" | "COMPLETE" | "RELEASE" | "EXPIRE";
export interface QuotaBinding {
  circleId: string;
  capability: CircleCapability;
  actorId: string;
  subjectUserId: string | null;
  businessType: typeof CAPABILITY_BUSINESS_TYPES[CircleCapability];
  businessId: string; // 一次具体业务实例，不是可无限重播的固定直播间ID
  requestKey: string;
  units: 1; // 当前规则按业务次数计费，不由请求任意修改或以时长充当次数
  holdSeconds: number; // 由业务适配层明确提供，无默认值
}
export interface QuotaAuthorization {
  policy: RuleRead;
  context: CapabilityRuntimeContext;
  circleGrant: CapabilityGrantSnapshot | null;
  providerGrant: CapabilityGrantSnapshot | null;
  actor: { userId: string; active: boolean; executor: "HUMAN" | "AUTOMATION" };
}
export interface QuotaReservation {
  id: string;
  binding: QuotaBinding;
  ownerId: string;
  circleGrantId: string | null; // 个人平台直授不依赖圈级授权；两者不可同时为空
  circleGrantRevision: number | null;
  providerGrantId: string | null;
  providerGrantRevision: number | null;
  policyRevision: number;
  revision: number;
  state: QuotaState;
  createdAt: Date;
  updatedAt: Date;
  holdUntil: Date;
  activatedAt: Date | null;
  terminalAt: Date | null;
}
export interface QuotaUsage { grantId: string; committed: number; held: number; active: number }
type Denied = { allowed: false; reason: string };
const deny = (reason: string): Denied => ({ allowed: false, reason });
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const integer = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
const date = (value: unknown): value is Date => value instanceof Date && Number.isFinite(value.getTime());
const consultation = (cap: CircleCapability) => cap === "AUDIO_QUESTION" || cap === "VIDEO_QUESTION";
const bindingKeys: Array<keyof QuotaBinding> = ["circleId", "capability", "actorId", "subjectUserId", "businessType", "businessId", "requestKey", "units", "holdSeconds"];
const sameBinding = (a: QuotaBinding, b: QuotaBinding) => bindingKeys.every(key => a[key] === b[key]);

export function validQuotaBinding(b: QuotaBinding): boolean {
  return !!b && Object.prototype.hasOwnProperty.call(CAPABILITY_BUSINESS_TYPES, b.capability) &&
    b.businessType === CAPABILITY_BUSINESS_TYPES[b.capability] && [b.circleId, b.actorId, b.businessId, b.requestKey].every(uuid) &&
    (consultation(b.capability) ? uuid(b.subjectUserId) : b.subjectUserId === null || uuid(b.subjectUserId)) && b.units === 1 &&
    integer(b.holdSeconds, 1, 900);
}

export function validQuotaReservation(r: QuotaReservation): boolean {
  if (!r || !uuid(r.id) || !validQuotaBinding(r.binding) || !uuid(r.ownerId) ||
      (r.circleGrantId === null ? r.circleGrantRevision !== null : !uuid(r.circleGrantId) || !integer(r.circleGrantRevision, 1, 2147483647)) || !integer(r.policyRevision, 1, 2147483647) ||
      !integer(r.revision, 1, 2147483647) || !date(r.createdAt) || !date(r.updatedAt) || !date(r.holdUntil) ||
      r.updatedAt < r.createdAt || r.holdUntil <= r.createdAt || r.holdUntil.getTime() - r.createdAt.getTime() > r.binding.holdSeconds * 1000) return false;
  if (r.binding.subjectUserId !== null ? !uuid(r.providerGrantId) || !integer(r.providerGrantRevision, 1, 2147483647) : r.providerGrantId !== null || r.providerGrantRevision !== null || r.circleGrantId === null) return false;
  if (r.providerGrantId === r.circleGrantId) return false;
  const started = date(r.activatedAt) && r.activatedAt >= r.createdAt && r.activatedAt <= r.updatedAt && r.activatedAt < r.holdUntil;
  const ended = date(r.terminalAt) && r.terminalAt >= r.createdAt && r.terminalAt <= r.updatedAt;
  if (r.state === "HELD") return r.activatedAt === null && r.terminalAt === null;
  if (r.state === "ACTIVE") return started && r.terminalAt === null;
  if (r.state === "COMPLETED") return started && ended && r.terminalAt! >= r.activatedAt!;
  if (r.state === "RELEASED") return r.activatedAt === null && ended;
  if (r.state === "EXPIRED") return r.activatedAt === null && ended && r.terminalAt! >= r.holdUntil;
  return false;
}

/** 超时只取消尚未开始的占位，ACTIVE 不能按 TTL 自动释放并发。完成仍消耗累计次数。 */
export function quotaContribution(r: QuotaReservation, now: Date): { allowed: true; held: number; committed: number; active: number } | Denied {
  if (!validQuotaReservation(r) || !date(now) || now < r.updatedAt) return deny("INVALID_RESERVATION_OR_TIME");
  return { allowed: true, held: r.state === "HELD" && now < r.holdUntil ? 1 : 0,
    committed: r.state === "ACTIVE" || r.state === "COMPLETED" ? 1 : 0, active: r.state === "ACTIVE" ? 1 : 0 };
}

function authorize(b: QuotaBinding, a: QuotaAuthorization, now: Date): Denied | { allowed: true; grants: CapabilityGrantSnapshot[] } {
  if (a.actor.executor !== "HUMAN" || !a.actor.active || a.actor.userId !== b.actorId) return deny("ACTOR_UNAVAILABLE");
  if (a.context.circleId !== b.circleId || (b.subjectUserId !== null && a.context.provider?.userId !== b.subjectUserId) ||
      (!consultation(b.capability) && (b.subjectUserId ?? a.context.ownerId) !== b.actorId)) return deny("SUBJECT_MISMATCH");
  if (!consultation(b.capability) && b.subjectUserId !== null && a.providerGrant?.source !== "PLATFORM_DIRECT") return deny("DIRECT_GRANT_REQUIRED");
  const decision = evaluateCapabilityUse(a.policy, b.capability, a.circleGrant, a.providerGrant, a.context, now);
  if (!decision.allowed) return decision;
  const grants = [a.circleGrant, ...(b.subjectUserId !== null ? [a.providerGrant] : [])].filter((g): g is CapabilityGrantSnapshot => g !== null);
  if (!a.circleGrant && a.providerGrant?.source !== "PLATFORM_DIRECT" || a.circleGrant && a.providerGrant?.source === "PLATFORM_DIRECT") return deny("INVALID_GRANT_SCOPE");
  if (!grants.every(g => uuid(g.id)) || new Set(grants.map(g => g.id)).size !== grants.length) return deny("INVALID_GRANT_SCOPE");
  return { allowed: true, grants };
}
function authorizationMatches(r: QuotaReservation, a: QuotaAuthorization): boolean {
  return r.ownerId === a.context.ownerId && r.circleGrantId === (a.circleGrant?.id ?? null) && r.circleGrantRevision === (a.circleGrant?.revision ?? null) &&
    r.policyRevision === (a.circleGrant ?? a.providerGrant)?.policyRevision && r.providerGrantId === (r.binding.subjectUserId !== null ? a.providerGrant?.id : null) &&
    r.providerGrantRevision === (r.binding.subjectUserId !== null ? a.providerGrant?.revision : null);
}
function sameReservation(a: QuotaReservation, b: QuotaReservation): boolean {
  const fields: Array<keyof QuotaReservation> = ["id", "ownerId", "circleGrantId", "circleGrantRevision", "providerGrantId", "providerGrantRevision", "policyRevision", "revision", "state"];
  const dates: Array<"createdAt" | "updatedAt" | "holdUntil" | "activatedAt" | "terminalAt"> = ["createdAt", "updatedAt", "holdUntil", "activatedAt", "terminalAt"];
  return sameBinding(a.binding, b.binding) && fields.every(key => a[key] === b[key]) && dates.every(key => a[key]?.getTime() === b[key]?.getTime());
}

export interface QuotaReserveInput {
  id: string;
  binding: QuotaBinding;
  authorization: QuotaAuthorization;
  now: Date;
  usage: QuotaUsage[]; // 在同一主库事务持锁读取；不能由客户端提供
  existingByRequest: QuotaReservation | null;
  existingByBusiness: QuotaReservation | null;
}
export function planQuotaReservation(input: QuotaReserveInput): Denied | { allowed: true; effect: "INSERT_HELD" | "NONE"; reservation: QuotaReservation } {
  const { binding: b, authorization: a, now } = input;
  if (!uuid(input.id) || !validQuotaBinding(b) || !date(now)) return deny("INVALID_QUOTA_REQUEST");
  const auth = authorize(b, a, now);
  if (!auth.allowed) return auth;
  const { existingByRequest: byKey, existingByBusiness: byBusiness } = input;
  if (byKey || byBusiness) {
    // 业务唯一键与请求幂等键必须指向同一条记录，不能换 key/主体/TTL 再占一次。
    if (!byKey || !byBusiness || byKey.id !== byBusiness.id || !validQuotaReservation(byKey) || !validQuotaReservation(byBusiness) ||
        !sameBinding(byKey.binding, b) || !sameReservation(byKey, byBusiness) ||
        now < byKey.updatedAt || !authorizationMatches(byKey, a)) return deny("IDEMPOTENCY_CONFLICT");
    if (byKey.state === "HELD" && now >= byKey.holdUntil) return deny("HOLD_EXPIRED");
    return { allowed: true, effect: "NONE", reservation: byKey };
  }
  if (input.usage.length !== auth.grants.length || new Set(input.usage.map(u => u.grantId)).size !== input.usage.length) return deny("INVALID_USAGE_SNAPSHOT");
  for (const grant of auth.grants) {
    const usage = input.usage.find(u => u.grantId === grant.id);
    if (!usage || ![usage.committed, usage.held, usage.active].every(v => integer(v)) || usage.active > usage.committed) return deny("INVALID_USAGE_SNAPSHOT");
    if (BigInt(usage.committed) + BigInt(usage.held) + 1n > BigInt(grant.maxUnits!)) return deny("QUOTA_EXHAUSTED");
    if (BigInt(usage.active) + BigInt(usage.held) + 1n > BigInt(grant.maxConcurrent!)) return deny("CONCURRENCY_LIMIT");
  }
  const holdUntil = new Date(Math.min(now.getTime() + b.holdSeconds * 1000, ...auth.grants.map(g => g.expiresAt!.getTime())));
  const reservation: QuotaReservation = { id: input.id, binding: { ...b }, ownerId: a.context.ownerId,
    circleGrantId: a.circleGrant?.id ?? null, circleGrantRevision: a.circleGrant?.revision ?? null,
    providerGrantId: b.subjectUserId !== null ? a.providerGrant!.id : null, providerGrantRevision: b.subjectUserId !== null ? a.providerGrant!.revision : null,
    policyRevision: (a.circleGrant ?? a.providerGrant)!.policyRevision, revision: 1, state: "HELD", createdAt: new Date(now), updatedAt: new Date(now), holdUntil,
    activatedAt: null, terminalAt: null };
  return validQuotaReservation(reservation) ? { allowed: true, effect: "INSERT_HELD", reservation } : deny("INVALID_RESERVATION");
}

export interface QuotaOperationReceipt { reservationId: string; operationKey: string; action: QuotaAction; binding: QuotaBinding; appliedRevision: number }
export interface QuotaTransitionInput {
  binding: QuotaBinding;
  action: QuotaAction;
  operationKey: string;
  expectedRevision: number;
  now: Date;
  authorization?: QuotaAuthorization; // ACTIVATE 必须重新核验；收尾不能因撤权而阻断
  priorReceipt?: QuotaOperationReceipt | null; // 由事务仓储读取，禁止客户端提交
}
export function planQuotaTransition(r: QuotaReservation, input: QuotaTransitionInput): Denied |
  { allowed: true; effect: "UPDATE" | "NONE"; reservation: QuotaReservation; receipt: QuotaOperationReceipt } {
  if (!validQuotaReservation(r) || !validQuotaBinding(input.binding) || !sameBinding(r.binding, input.binding) ||
      !["ACTIVATE", "COMPLETE", "RELEASE", "EXPIRE"].includes(input.action) || !uuid(input.operationKey) || !date(input.now) || input.now < r.updatedAt) return deny("INVALID_OPERATION");
  const prior = input.priorReceipt;
  if (prior) {
    if (prior.reservationId !== r.id || prior.operationKey !== input.operationKey || prior.action !== input.action ||
        !validQuotaBinding(prior.binding) || !sameBinding(prior.binding, r.binding) || !integer(prior.appliedRevision, 2, r.revision)) return deny("IDEMPOTENCY_CONFLICT");
    // effect=NONE 永不触发第二次 SDK/订单动作，即使后续已完成或撤权。
    return { allowed: true, effect: "NONE", reservation: r, receipt: prior };
  }
  if (input.expectedRevision !== r.revision || !integer(r.revision, 1, 2147483646)) return deny("STALE_REVISION");
  const next = { ...r, revision: r.revision + 1, updatedAt: new Date(input.now) };
  if (input.action === "ACTIVATE") {
    if (r.state !== "HELD") return deny("INVALID_TRANSITION");
    if (input.now >= r.holdUntil) return deny("HOLD_EXPIRED");
    if (!input.authorization) return deny("AUTHORIZATION_REQUIRED");
    const auth = authorize(r.binding, input.authorization, input.now);
    if (!auth.allowed) return auth;
    if (!authorizationMatches(r, input.authorization)) return deny("GRANT_CHANGED");
    next.state = "ACTIVE"; next.activatedAt = new Date(input.now);
  } else if (input.action === "COMPLETE") {
    if (r.state !== "ACTIVE") return deny("INVALID_TRANSITION");
    next.state = "COMPLETED"; next.terminalAt = new Date(input.now);
  } else if (input.action === "RELEASE") {
    if (r.state !== "HELD") return deny("INVALID_TRANSITION");
    next.state = "RELEASED"; next.terminalAt = new Date(input.now);
  } else {
    if (r.state !== "HELD") return deny("INVALID_TRANSITION");
    if (input.now < r.holdUntil) return deny("HOLD_NOT_EXPIRED");
    next.state = "EXPIRED"; next.terminalAt = new Date(input.now);
  }
  if (!validQuotaReservation(next)) return deny("INVALID_RESERVATION");
  return { allowed: true, effect: "UPDATE", reservation: next, receipt: { reservationId: r.id,
    operationKey: input.operationKey, action: input.action, binding: { ...r.binding }, appliedRevision: next.revision } };
}
