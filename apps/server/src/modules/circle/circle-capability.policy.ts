/**
 * 圈内能力的独立策略内核。只接受服务端读取的配置/事实/授权，不从请求体接收“已开通”。
 * 本文件不写数据库；状态决策必须由后续持久层在同一事务里 CAS 更新并记录审计。
 */
export const CIRCLE_CAPABILITIES = ["LIVE", "SHORT_VIDEO", "AUDIO_QUESTION", "VIDEO_QUESTION"] as const;
export type CircleCapability = typeof CIRCLE_CAPABILITIES[number];
export type CapabilityIdentity = "NONE" | "L1" | "L2";
export type CapabilityProviderRole = "OWNER" | "PARTNER" | "GUEST";
export const CIRCLE_CAPABILITY_CONFIG_KEY = "circle.capability-policy.v1";

export interface CircleCapabilityRule {
  revision: number;
  enabled: boolean;
  minIdentity: CapabilityIdentity;
  minOperatingDays: number;
  minValidMembers: number;
  minPublishedPosts: number;
  minRecentPosts: number;
  recentWindowDays: number;
  maxActiveViolations: number;
  reapplyCooldownHours: number;
  maxValidityDays: number;
  maxUnits: number;
  maxConcurrent: number;
  providerRoles: CapabilityProviderRole[];
  approverRoles: Array<"SUPER_ADMIN" | "OPERATION_ADMIN">;
}

export type RuleRead = { ok: true; capability: CircleCapability; rule: CircleCapabilityRule } |
  { ok: false; reason: "CONFIG_MISSING" | "CONFIG_INVALID" | "POLICY_DISABLED" | "UNSUPPORTED_CAPABILITY" };
const IDENTITY = ["NONE", "L1", "L2"];
const PROVIDERS = ["OWNER", "PARTNER", "GUEST"];
const APPROVERS = ["SUPER_ADMIN", "OPERATION_ADMIN"];
const RULE_KEYS = ["revision", "enabled", "minIdentity", "minOperatingDays", "minValidMembers", "minPublishedPosts", "minRecentPosts", "recentWindowDays", "maxActiveViolations", "reapplyCooldownHours", "maxValidityDays", "maxUnits", "maxConcurrent", "providerRoles", "approverRoles"];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const enumArray = (v: unknown, choices: string[]): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.length <= choices.length && new Set(v).size === v.length && v.every(x => typeof x === "string" && choices.includes(x));

/** 缺字段不补业务默认值；字符串 true/数字、未知版本和损坏配置全部关闭。 */
export function readCircleCapabilityRule(raw: unknown, capability: string): RuleRead {
  if (!CIRCLE_CAPABILITIES.includes(capability as CircleCapability)) return { ok: false, reason: "UNSUPPORTED_CAPABILITY" };
  if (raw === null || raw === undefined || raw === "") return { ok: false, reason: "CONFIG_MISSING" };
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length > 65536) return { ok: false, reason: "CONFIG_INVALID" };
    try { value = JSON.parse(raw); } catch { return { ok: false, reason: "CONFIG_INVALID" }; }
  }
  if (!record(value) || value.version !== 1 || Object.keys(value).some(k => k !== "version" && k !== "rules") || !record(value.rules) ||
      Object.keys(value.rules).some(k => !CIRCLE_CAPABILITIES.includes(k as CircleCapability))) return { ok: false, reason: "CONFIG_INVALID" };
  if (!Object.prototype.hasOwnProperty.call(value.rules, capability)) return { ok: false, reason: "CONFIG_MISSING" };
  const r = value.rules[capability];
  if (!record(r) || Object.keys(r).length !== RULE_KEYS.length || RULE_KEYS.some(k => !Object.prototype.hasOwnProperty.call(r, k)) ||
      typeof r.enabled !== "boolean" || !integer(r.revision, 1, 2147483647) || !IDENTITY.includes(r.minIdentity as string) ||
      !["minOperatingDays", "minValidMembers", "minPublishedPosts", "minRecentPosts", "maxActiveViolations"].every(k => integer(r[k])) ||
      !integer(r.recentWindowDays, 1, 3650) || !integer(r.reapplyCooldownHours, 0, 87600) || !integer(r.maxValidityDays, 1, 3650) ||
      !integer(r.maxUnits, 1, 2147483647) || !integer(r.maxConcurrent, 1, 2147483647) || r.maxConcurrent > r.maxUnits ||
      !enumArray(r.providerRoles, PROVIDERS) || !enumArray(r.approverRoles, APPROVERS)) return { ok: false, reason: "CONFIG_INVALID" };
  if (!r.enabled) return { ok: false, reason: "POLICY_DISABLED" };
  return { ok: true, capability: capability as CircleCapability, rule: { ...(r as unknown as CircleCapabilityRule), providerRoles: [...r.providerRoles] as CapabilityProviderRole[], approverRoles: [...r.approverRoles] as CircleCapabilityRule["approverRoles"] } };
}

export interface CapabilityFacts {
  circleId: string;
  ownerId: string;
  actorId: string;
  circleActive: boolean;
  actorActive: boolean;
  ownerMembershipValid: boolean;
  identity: CapabilityIdentity;
  operatingDays: number;
  validMembers: number;
  publishedPosts: number;
  recentPosts: number;
  activeViolations: number;
}
export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  scope: { circleId: string; ownerId: string; capability: CircleCapability | null; policyRevision: number | null };
  progress: Array<{ key: string; current: number; required: number; passed: boolean }>;
}
export function evaluateCircleCapabilityEligibility(policy: RuleRead, facts: CapabilityFacts): EligibilityResult {
  const scope = { circleId: facts.circleId, ownerId: facts.ownerId, capability: policy.ok ? policy.capability : null, policyRevision: policy.ok ? policy.rule.revision : null };
  const denied = (reason: string): EligibilityResult => ({ eligible: false, reason, scope, progress: [] });
  if (!policy.ok) return denied(policy.reason);
  if (!facts.circleId || !facts.ownerId || facts.actorId !== facts.ownerId) return denied("OWNER_ONLY");
  if (!facts.circleActive || !facts.actorActive || !facts.ownerMembershipValid) return denied("SUBJECT_UNAVAILABLE");
  if (!IDENTITY.includes(facts.identity) || ![facts.operatingDays, facts.validMembers, facts.publishedPosts, facts.recentPosts, facts.activeViolations].every(v => integer(v))) return denied("INVALID_FACTS");
  const r = policy.rule;
  const progress = [
    { key: "identity", current: IDENTITY.indexOf(facts.identity), required: IDENTITY.indexOf(r.minIdentity) },
    { key: "operatingDays", current: facts.operatingDays, required: r.minOperatingDays },
    { key: "validMembers", current: facts.validMembers, required: r.minValidMembers },
    { key: "publishedPosts", current: facts.publishedPosts, required: r.minPublishedPosts },
    { key: "recentPosts", current: facts.recentPosts, required: r.minRecentPosts },
  ].map(p => ({ ...p, passed: p.current >= p.required }));
  progress.push({ key: "activeViolations", current: facts.activeViolations, required: r.maxActiveViolations, passed: facts.activeViolations <= r.maxActiveViolations });
  const eligible = progress.every(p => p.passed);
  return { eligible, reason: eligible ? "ELIGIBLE_TO_APPLY" : "THRESHOLD_NOT_MET", scope, progress };
}

export type CapabilityGrantState = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "REVOKED";
const GRANT_STATES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "REVOKED"];
export interface CapabilityGrantSnapshot {
  source?: "CIRCLE_APPLICATION" | "PLATFORM_DIRECT"; // 缺省仅兼容申请型旧快照，绝不推定直授
  id: string;
  circleId: string;
  ownerId: string;
  applicantId: string;
  subjectUserId: string | null; // null=圈级；非空=独立服务者授权
  capability: CircleCapability;
  policyRevision: number;
  revision: number;
  state: CapabilityGrantState;
  enabled: boolean;
  expiresAt: Date | null;
  maxUnits: number | null;
  maxConcurrent: number | null;
}
export interface CapabilityRuntimeContext {
  circleId: string;
  ownerId: string;
  circleActive: boolean;
  ownerActive: boolean;
  ownerMembershipValid: boolean;
  ownerIdentity: CapabilityIdentity;
  provider?: { userId: string; active: boolean; membershipValid: boolean; role: string };
}
type Decision = { allowed: true } | { allowed: false; reason: string };
const deny = (reason: string): Decision => ({ allowed: false, reason });
const isConsultation = (cap: CircleCapability) => cap === "AUDIO_QUESTION" || cap === "VIDEO_QUESTION";
function grantShapeValid(grant: CapabilityGrantSnapshot): boolean {
  return (grant.source === undefined || grant.source === "CIRCLE_APPLICATION" || grant.source === "PLATFORM_DIRECT") && !!grant.id && !!grant.circleId && !!grant.ownerId && !!grant.applicantId &&
    (grant.subjectUserId === null || typeof grant.subjectUserId === "string" && grant.subjectUserId.length > 0) &&
    CIRCLE_CAPABILITIES.includes(grant.capability) && GRANT_STATES.includes(grant.state) && typeof grant.enabled === "boolean" &&
    integer(grant.revision, 1, 2147483647) && integer(grant.policyRevision, 1, 2147483647);
}
function ownerAvailable(rule: CircleCapabilityRule, context: CapabilityRuntimeContext): boolean {
  return context.circleActive && context.ownerActive && context.ownerMembershipValid && IDENTITY.includes(context.ownerIdentity) &&
    IDENTITY.indexOf(context.ownerIdentity) >= IDENTITY.indexOf(rule.minIdentity);
}

function grantLimitsValid(grant: CapabilityGrantSnapshot, rule: Pick<CircleCapabilityRule, "maxUnits" | "maxConcurrent">, now: Date): boolean {
  return grant.expiresAt instanceof Date && Number.isFinite(grant.expiresAt.getTime()) && grant.expiresAt.getTime() > now.getTime() &&
    integer(grant.maxUnits, 1, rule.maxUnits) && integer(grant.maxConcurrent, 1, rule.maxConcurrent) && grant.maxConcurrent <= grant.maxUnits;
}

function grantMatches(grant: CapabilityGrantSnapshot | null, rule: CircleCapabilityRule, capability: CircleCapability,
  subject: string | null, context: CapabilityRuntimeContext, now: Date): boolean {
  return !!grant && grantShapeValid(grant) && grant.circleId === context.circleId && grant.ownerId === context.ownerId && grant.capability === capability &&
    grant.subjectUserId === subject && grant.policyRevision === rule.revision && integer(grant.revision, 1) &&
    grant.state === "APPROVED" && grant.enabled === true && grantLimitsValid(grant, rule, now);
}

function evaluateCircleGrantOnly(policy: RuleRead, capability: CircleCapability, grant: CapabilityGrantSnapshot | null,
  context: CapabilityRuntimeContext, now: Date): Decision {
  if (!policy.ok) return deny(policy.reason);
  if (policy.capability !== capability) return deny("CAPABILITY_MISMATCH");
  if (!context.circleId || !context.ownerId || !Number.isFinite(now.getTime()) || !ownerAvailable(policy.rule, context)) return deny("SUBJECT_UNAVAILABLE");
  return grantMatches(grant, policy.rule, capability, null, context, now) ? { allowed: true } : deny("CIRCLE_GRANT_UNAVAILABLE");
}

/** 仅判断新增业务资格；不代表已原子预留配额，不能用来关闭既有订单的履约/退款。 */
export function evaluateCapabilityUse(
  policy: RuleRead, capability: CircleCapability, circleGrant: CapabilityGrantSnapshot | null,
  providerGrant: CapabilityGrantSnapshot | null, context: CapabilityRuntimeContext, now: Date,
): Decision {
  // 平台个人直授独立于圈级开通，不外溢为其他成员的权限。
  if (providerGrant?.source === "PLATFORM_DIRECT") return directGrantDecision(providerGrant, capability, context.provider?.userId ?? null, context, now);
  if (!isConsultation(capability) && circleGrant?.source === "PLATFORM_DIRECT") return directGrantDecision(circleGrant, capability, null, context, now);
  const circleDecision = evaluateCircleGrantOnly(policy, capability, circleGrant, context, now);
  if (!circleDecision.allowed) return circleDecision;
  if (!policy.ok) return deny(policy.reason);
  const rule = policy.rule;
  if (isConsultation(capability)) {
    const p = context.provider;
    if (!p || !p.active || !p.membershipValid || !rule.providerRoles.includes(p.role as CapabilityProviderRole)) return deny("PROVIDER_UNAVAILABLE");
    if (!grantMatches(providerGrant, rule, capability, p.userId, context, now)) return deny("PROVIDER_GRANT_UNAVAILABLE");
  }
  return { allowed: true };
}

export type CapabilityAction = "APPROVE" | "REJECT" | "ENABLE" | "DISABLE" | "SUSPEND" | "RESUME" | "REVOKE";
export interface CapabilityActor { userId: string; roles: string[]; executor: "HUMAN" | "AUTOMATION" }
function eligibilityMatches(eligibility: EligibilityResult, policy: RuleRead, context: CapabilityRuntimeContext) {
  return policy.ok && eligibility.eligible && eligibility.scope.circleId === context.circleId && eligibility.scope.ownerId === context.ownerId &&
    eligibility.scope.capability === policy.capability && eligibility.scope.policyRevision === policy.rule.revision;
}
export interface CapabilityApplicationInput {
  id: string;
  capability: CircleCapability;
  subjectUserId: string | null;
  actor: CapabilityActor;
  context: CapabilityRuntimeContext;
  policy: RuleRead;
  eligibility: EligibilityResult;
  now: Date;
  latest: { grant: CapabilityGrantSnapshot; updatedAt: Date } | null;
  circleGrant?: CapabilityGrantSnapshot | null;
}

/** 只生成待审记录，不批准、不开启；持久层须对圈/能力/主体组合加锁后重新判定。 */
export function planCapabilityApplication(input: CapabilityApplicationInput): { allowed: true; pending: CapabilityGrantSnapshot } | { allowed: false; reason: string } {
  const stop = (reason: string) => ({ allowed: false as const, reason });
  const { actor, policy, context, now, subjectUserId, capability, latest } = input;
  if (!actor.userId || actor.executor !== "HUMAN") return stop("HUMAN_REQUIRED");
  if (!input.id || !Number.isFinite(now.getTime()) || !context.circleId || !context.ownerId) return stop("INVALID_APPLICATION");
  if (actor.userId !== context.ownerId) return stop("OWNER_ONLY");
  if (!policy.ok) return stop(policy.reason);
  if (policy.capability !== capability) return stop("CAPABILITY_MISMATCH");
  if (!ownerAvailable(policy.rule, context) || !eligibilityMatches(input.eligibility, policy, context)) return stop("ELIGIBILITY_REQUIRED");
  if (subjectUserId !== null) {
    const p = context.provider;
    if (!isConsultation(capability) || !p || p.userId !== subjectUserId || !p.active || !p.membershipValid ||
        !policy.rule.providerRoles.includes(p.role as CapabilityProviderRole)) return stop("PROVIDER_UNAVAILABLE");
    if (!evaluateCircleGrantOnly(policy, capability, input.circleGrant ?? null, context, now).allowed) return stop("CIRCLE_GRANT_UNAVAILABLE");
  }
  if (latest) {
    const g = latest.grant;
    if (!grantShapeValid(g)) return stop("INVALID_GRANT_HISTORY");
    if (g.circleId !== context.circleId || g.capability !== capability || g.subjectUserId !== subjectUserId) return stop("HISTORY_SCOPE_MISMATCH");
    if (["PENDING", "SUSPENDED"].includes(g.state)) return stop("EXISTING_APPLICATION");
    if (g.state === "APPROVED" && (!(g.expiresAt instanceof Date) || !Number.isFinite(g.expiresAt.getTime()) || g.expiresAt.getTime() > now.getTime())) return stop("EXISTING_APPLICATION");
    if (["REJECTED", "REVOKED"].includes(g.state)) {
      const elapsed = latest.updatedAt instanceof Date ? now.getTime() - latest.updatedAt.getTime() : NaN;
      if (!Number.isFinite(elapsed) || elapsed < policy.rule.reapplyCooldownHours * 3600000) return stop("REAPPLY_COOLDOWN");
    }
  }
  return { allowed: true, pending: { id: input.id, circleId: context.circleId, ownerId: context.ownerId, applicantId: actor.userId,
    subjectUserId, capability, policyRevision: policy.rule.revision, revision: 1, state: "PENDING", enabled: false,
    expiresAt: null, maxUnits: null, maxConcurrent: null } };
}

export interface CapabilityTransitionInput {
  action: CapabilityAction;
  actor: CapabilityActor; // 经鉴权的服务端身份，不能由客户端填写
  policy: RuleRead;
  context: CapabilityRuntimeContext;
  now: Date;
  eligibility: EligibilityResult;
  expectedRevision: number;
  reason: string;
  approval?: { expiresAt: Date; maxUnits: number; maxConcurrent: number };
  circleGrant?: CapabilityGrantSnapshot | null;
}
export type CapabilityTransition = { allowed: false; reason: string } |
  { allowed: true; expectedRevision: number; next: CapabilityGrantSnapshot; audit: { actorId: string; action: CapabilityAction; reason: string } };

export function planCapabilityTransition(grant: CapabilityGrantSnapshot, input: CapabilityTransitionInput): CapabilityTransition {
  const stop = (reason: string): CapabilityTransition => ({ allowed: false, reason });
  const { actor, action, context, now, policy } = input;
  if (!actor.userId || actor.executor !== "HUMAN") return stop("HUMAN_REQUIRED");
  if (!grantShapeValid(grant)) return stop("INVALID_GRANT");
  if (!integer(grant.revision, 1, 2147483646) || input.expectedRevision !== grant.revision) return stop("STALE_REVISION");
  if (!input.reason?.trim() || input.reason.length > 500) return stop("REASON_REQUIRED");
  if (!Number.isFinite(now.getTime())) return stop("INVALID_TIME");
  if (grant.circleId !== context.circleId) return stop("SUBJECT_MISMATCH");
  if (grant.source === "PLATFORM_DIRECT") return planDirectTransition(grant, input);
  const selfAction = action === "ENABLE" || action === "DISABLE";
  if (selfAction) {
    if (actor.userId !== (grant.subjectUserId ?? context.ownerId) || grant.ownerId !== context.ownerId) return stop("SUBJECT_ONLY");
  } else {
    // 停用/撤销是安全动作，配置损坏时仍允许既有平台治理角色收回权限。
    const roles = policy.ok ? policy.rule.approverRoles : APPROVERS;
    if (!actor.roles.some(role => roles.includes(role as "SUPER_ADMIN" | "OPERATION_ADMIN"))) return stop("REVIEWER_REQUIRED");
    if ((action === "APPROVE" || action === "RESUME") && [grant.applicantId, grant.subjectUserId, context.ownerId, grant.ownerId].includes(actor.userId)) return stop("SELF_APPROVAL_FORBIDDEN");
  }
  const next = { ...grant, revision: grant.revision + 1 };
  const closing = ["REJECT", "DISABLE", "SUSPEND", "REVOKE"].includes(action);
  if (!closing) {
    if (!policy.ok) return stop(policy.reason);
    if (policy.capability !== grant.capability) return stop("CAPABILITY_MISMATCH");
    if (grant.policyRevision !== policy.rule.revision || grant.ownerId !== context.ownerId) return stop("POLICY_OR_OWNER_CHANGED");
    if (!ownerAvailable(policy.rule, context)) return stop("SUBJECT_UNAVAILABLE");
    if (grant.subjectUserId !== null) {
      if (!isConsultation(grant.capability) || context.provider?.userId !== grant.subjectUserId || !context.provider.active || !context.provider.membershipValid ||
          !policy.rule.providerRoles.includes(context.provider.role as CapabilityProviderRole)) return stop("PROVIDER_UNAVAILABLE");
      if (!evaluateCircleGrantOnly(policy, grant.capability, input.circleGrant ?? null, context, now).allowed) return stop("CIRCLE_GRANT_UNAVAILABLE");
    }
  }
  if (action === "APPROVE") {
    if (grant.state !== "PENDING") return stop("INVALID_TRANSITION");
    if (!eligibilityMatches(input.eligibility, policy, context)) return stop("ELIGIBILITY_REQUIRED");
    if (!policy.ok) return stop(policy.reason);
    const a = input.approval;
    if (!a || !(a.expiresAt instanceof Date) || !Number.isFinite(a.expiresAt.getTime()) || a.expiresAt.getTime() <= now.getTime() ||
        a.expiresAt.getTime() - now.getTime() > policy.rule.maxValidityDays * 86400000 ||
        !integer(a.maxUnits, 1, policy.rule.maxUnits) || !integer(a.maxConcurrent, 1, policy.rule.maxConcurrent) || a.maxConcurrent > a.maxUnits) return stop("INVALID_APPROVAL_LIMITS");
    Object.assign(next, a, { expiresAt: new Date(a.expiresAt), state: "APPROVED", enabled: false });
  } else if (action === "REJECT") {
    if (grant.state !== "PENDING") return stop("INVALID_TRANSITION");
    Object.assign(next, { state: "REJECTED", enabled: false });
  } else if (action === "ENABLE" || action === "DISABLE") {
    if (grant.state !== "APPROVED" || grant.enabled === (action === "ENABLE")) return stop("INVALID_TRANSITION");
    if (action === "ENABLE" && (!policy.ok || !grantLimitsValid(grant, policy.rule, now))) return stop("GRANT_EXPIRED_OR_LIMIT_INVALID");
    next.enabled = action === "ENABLE";
  } else if (action === "SUSPEND") {
    if (grant.state !== "APPROVED") return stop("INVALID_TRANSITION");
    Object.assign(next, { state: "SUSPENDED", enabled: false });
  } else if (action === "RESUME") {
    if (grant.state !== "SUSPENDED" || !eligibilityMatches(input.eligibility, policy, context)) return stop("INVALID_TRANSITION");
    if (!policy.ok || !grantLimitsValid(grant, policy.rule, now)) return stop("GRANT_EXPIRED_OR_LIMIT_INVALID");
    Object.assign(next, { state: "APPROVED", enabled: false });
  } else if (action === "REVOKE") {
    if (!["PENDING", "APPROVED", "SUSPENDED"].includes(grant.state)) return stop("INVALID_TRANSITION");
    Object.assign(next, { state: "REVOKED", enabled: false });
  } else return stop("INVALID_ACTION");
  return { allowed: true, expectedRevision: grant.revision, next, audit: { actorId: actor.userId, action, reason: input.reason.trim() } };
}

/** 直授不读取圈子运营门槛/申请额度；有限值上限只是存储与资源安全边界。 */
const DIRECT_LIMITS = { maxUnits: 2147483647, maxConcurrent: 2147483647 };
export function directSubjectAvailable(context: CapabilityRuntimeContext, subject: string | null): boolean {
  if (!context.circleActive || !context.ownerActive || !context.ownerMembershipValid) return false;
  return subject === null || !!context.provider && context.provider.userId === subject && context.provider.active && context.provider.membershipValid;
}
function directLimitsValid(grant: CapabilityGrantSnapshot, now: Date): boolean {
  return grantLimitsValid(grant, DIRECT_LIMITS, now);
}
function directGrantDecision(grant: CapabilityGrantSnapshot, capability: CircleCapability, subject: string | null,
  context: CapabilityRuntimeContext, now: Date): Decision {
  return grant.source === "PLATFORM_DIRECT" && grantShapeValid(grant) && Number.isFinite(now.getTime()) &&
    grant.circleId === context.circleId && grant.ownerId === context.ownerId && grant.capability === capability &&
    grant.subjectUserId === subject && (!isConsultation(capability) || subject !== null) && directSubjectAvailable(context, subject) &&
    grant.state === "APPROVED" && grant.enabled && directLimitsValid(grant, now) ? { allowed: true } : deny("DIRECT_GRANT_UNAVAILABLE");
}
export function planPlatformDirectGrant(input: { id: string; actor: CapabilityActor; capability: CircleCapability;
  subjectUserId: string | null; context: CapabilityRuntimeContext; now: Date; reason: string;
  expiresAt: Date; maxUnits: number; maxConcurrent: number }): { allowed: true; grant: CapabilityGrantSnapshot } | { allowed: false; reason: string } {
  const stop = (reason: string) => ({ allowed: false as const, reason });
  if (!input.actor.userId || input.actor.executor !== "HUMAN") return stop("HUMAN_REQUIRED");
  if (!input.actor.roles.some(r => APPROVERS.includes(r))) return stop("REVIEWER_REQUIRED");
  if ([input.subjectUserId, input.context.ownerId].includes(input.actor.userId)) return stop("SELF_APPROVAL_FORBIDDEN");
  if (!input.id || !CIRCLE_CAPABILITIES.includes(input.capability) || !input.context.circleId || !input.context.ownerId ||
      !Number.isFinite(input.now.getTime()) || !input.reason.trim() || input.reason.length > 500) return stop("INVALID_APPLICATION");
  if (isConsultation(input.capability) && !input.subjectUserId || !directSubjectAvailable(input.context, input.subjectUserId)) return stop("SUBJECT_UNAVAILABLE");
  const grant: CapabilityGrantSnapshot = { id: input.id, circleId: input.context.circleId, ownerId: input.context.ownerId,
    applicantId: input.actor.userId, subjectUserId: input.subjectUserId, capability: input.capability, source: "PLATFORM_DIRECT",
    policyRevision: 1, revision: 1, state: "APPROVED", enabled: true, expiresAt: input.expiresAt,
    maxUnits: input.maxUnits, maxConcurrent: input.maxConcurrent };
  if (!directLimitsValid(grant, input.now) || input.expiresAt.getTime() - input.now.getTime() > 3650 * 86400000) return stop("INVALID_APPROVAL_LIMITS");
  return { allowed: true, grant };
}
function planDirectTransition(grant: CapabilityGrantSnapshot, input: CapabilityTransitionInput): CapabilityTransition {
  const stop = (reason: string): CapabilityTransition => ({ allowed: false, reason });
  const { actor, action, context, now } = input;
  const selfAction = action === "ENABLE" || action === "DISABLE";
  if (selfAction ? actor.userId !== (grant.subjectUserId ?? context.ownerId) || grant.ownerId !== context.ownerId : !actor.roles.some(r => APPROVERS.includes(r))) return stop("REVIEWER_OR_SUBJECT_REQUIRED");
  if (action === "RESUME" && [grant.subjectUserId, context.ownerId].includes(actor.userId)) return stop("SELF_APPROVAL_FORBIDDEN");
  const next = { ...grant, revision: grant.revision + 1 };
  if (action === "ENABLE" || action === "RESUME") {
    if (grant.ownerId !== context.ownerId || !directSubjectAvailable(context, grant.subjectUserId) || !directLimitsValid(grant, now)) return stop("DIRECT_GRANT_UNAVAILABLE");
    if (action === "ENABLE" ? grant.state !== "APPROVED" || grant.enabled : grant.state !== "SUSPENDED") return stop("INVALID_TRANSITION");
    Object.assign(next, { state: "APPROVED", enabled: action === "ENABLE" });
  } else if (action === "DISABLE" || action === "SUSPEND") {
    if (grant.state !== "APPROVED" || action === "DISABLE" && !grant.enabled) return stop("INVALID_TRANSITION");
    Object.assign(next, { state: action === "SUSPEND" ? "SUSPENDED" : "APPROVED", enabled: false });
  } else if (action === "REVOKE") {
    if (!["APPROVED", "SUSPENDED"].includes(grant.state)) return stop("INVALID_TRANSITION");
    Object.assign(next, { state: "REVOKED", enabled: false });
  } else return stop("INVALID_TRANSITION");
  return { allowed: true, expectedRevision: grant.revision, next, audit: { actorId: actor.userId, action, reason: input.reason.trim() } };
}
