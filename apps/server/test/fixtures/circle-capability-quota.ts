import { CapabilityGrantSnapshot, CircleCapability, CircleCapabilityRule, readCircleCapabilityRule } from "../../src/modules/circle/circle-capability.policy";
import { CAPABILITY_BUSINESS_TYPES, QuotaReserveInput, QuotaReservation, planQuotaReservation, planQuotaTransition } from "../../src/modules/circle/circle-capability-quota.policy";

export const quotaId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const quotaNow = new Date("2026-09-05T00:00:00Z");
export const quotaLater = (s: number) => new Date(quotaNow.getTime() + s * 1000);
export function quotaFixture(cap: CircleCapability = "LIVE"): QuotaReserveInput {
  const question = cap === "AUDIO_QUESTION" || cap === "VIDEO_QUESTION";
  // 测试规则不构成正式配置或用户资源额度。
  const rule: CircleCapabilityRule = { revision: 2, enabled: true, minIdentity: "L1", minOperatingDays: 10, minValidMembers: 5,
    minPublishedPosts: 4, minRecentPosts: 2, recentWindowDays: 30, maxActiveViolations: 0, reapplyCooldownHours: 24,
    maxValidityDays: 30, maxUnits: 100, maxConcurrent: 2, providerRoles: ["OWNER", "GUEST"], approverRoles: ["SUPER_ADMIN", "OPERATION_ADMIN"] };
  const grant: CapabilityGrantSnapshot = { id: quotaId(10), circleId: quotaId(1), ownerId: quotaId(2), applicantId: quotaId(2),
    subjectUserId: null, capability: cap, policyRevision: 2, revision: 3, state: "APPROVED", enabled: true, expiresAt: quotaLater(3600), maxUnits: 10, maxConcurrent: 2 };
  return { id: quotaId(20), binding: { circleId: quotaId(1), capability: cap, actorId: question ? quotaId(4) : quotaId(2),
    subjectUserId: question ? quotaId(3) : null, businessType: CAPABILITY_BUSINESS_TYPES[cap], businessId: quotaId(5), requestKey: quotaId(6), units: 1, holdSeconds: 60 },
    authorization: { policy: readCircleCapabilityRule({ version: 1, rules: { [cap]: rule } }, cap), circleGrant: grant,
      providerGrant: question ? { ...grant, id: quotaId(11), subjectUserId: quotaId(3) } : null,
      context: { circleId: quotaId(1), ownerId: quotaId(2), circleActive: true, ownerActive: true, ownerMembershipValid: true, ownerIdentity: "L1",
        provider: { userId: quotaId(3), active: true, membershipValid: true, role: "GUEST" } },
      actor: { userId: question ? quotaId(4) : quotaId(2), active: true, executor: "HUMAN" } },
    now: quotaNow, usage: [grant.id, ...(question ? [quotaId(11)] : [])].map(grantId => ({ grantId, committed: 0, held: 0, active: 0 })), existingByRequest: null, existingByBusiness: null };
}
export function quotaHeld(input = quotaFixture()): QuotaReservation {
  const result = planQuotaReservation(input); if (!result.allowed) throw new Error(result.reason); return result.reservation;
}
export function quotaActive(r = quotaHeld(), input = quotaFixture()): QuotaReservation {
  const result = planQuotaTransition(r, { binding: r.binding, action: "ACTIVATE", operationKey: quotaId(30), expectedRevision: r.revision,
    now: quotaLater(1), authorization: input.authorization });
  if (!result.allowed) throw new Error(result.reason); return result.reservation;
}
export function quotaClone<T>(v: T): T {
  if (v instanceof Date) return new Date(v) as T;
  if (v instanceof Map) return new Map([...v].map(([k, value]) => [k, quotaClone(value)])) as T;
  if (Array.isArray(v)) return v.map(quotaClone) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, value]) => [k, quotaClone(value)])) as T;
  return v;
}
