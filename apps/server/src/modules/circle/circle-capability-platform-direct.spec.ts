import { CapabilityRuntimeContext, CapabilityTransitionInput, CIRCLE_CAPABILITIES, evaluateCapabilityUse, planCapabilityTransition, planPlatformDirectGrant } from "./circle-capability.policy";

describe("平台定向直授决策，不与圈子申请规则混用", () => {
  const now = new Date("2026-09-05T00:00:00Z");
  const context: CapabilityRuntimeContext = { circleId: "circle", ownerId: "owner", circleActive: true, ownerActive: true,
    ownerMembershipValid: true, ownerIdentity: "NONE", provider: { userId: "partner", active: true, membershipValid: true, role: "MEMBER" } };
  const input = () => ({ id: "grant", actor: { userId: "admin", roles: ["OPERATION_ADMIN"], executor: "HUMAN" as const },
    capability: "LIVE" as typeof CIRCLE_CAPABILITIES[number], subjectUserId: "partner" as string | null, context, now,
    reason: "引进名师", expiresAt: new Date(now.getTime() + 3600000), maxUnits: 1000, maxConcurrent: 50 });
  const granted = () => { const p = planPlatformDirectGrant(input()); if (!p.allowed) throw new Error(p.reason); return p.grant; };
  it.each(CIRCLE_CAPABILITIES)("%s 可由平台单独开通，不读取圈子门槛或头衔", capability => {
    const p = planPlatformDirectGrant({ ...input(), capability });
    expect(p).toMatchObject({ allowed: true, grant: { source: "PLATFORM_DIRECT", enabled: true, state: "APPROVED", maxUnits: 1000 } });
    if (!p.allowed) return;
    expect(evaluateCapabilityUse({ ok: false, reason: "CONFIG_MISSING" }, capability, null, p.grant, context, now)).toEqual({ allowed: true });
  });
  it.each([{ expiresAt: new Date("invalid") }, { expiresAt: now }, { expiresAt: new Date(now.getTime() + 3651 * 86400000) },
    { maxUnits: 0 }, { maxUnits: NaN }, { maxUnits: 1.5 }, { maxUnits: 2147483648 }, { maxConcurrent: 1001 }, { maxConcurrent: 0 },
    { reason: " " }])("拒绝非法直授期限额度和空理由 %#", change => {
    expect(planPlatformDirectGrant({ ...input(), ...change }).allowed).toBe(false);
  });
  it.each(["AUDIO_QUESTION", "VIDEO_QUESTION"] as const)("%s 不能用圈级直授批量开通所有人", capability => {
    expect(planPlatformDirectGrant({ ...input(), capability, subjectUserId: null }).allowed).toBe(false);
  });
  it("自动化、普通角色、自授均失败", () => {
    expect(planPlatformDirectGrant({ ...input(), actor: { ...input().actor, executor: "AUTOMATION" } }).allowed).toBe(false);
    expect(planPlatformDirectGrant({ ...input(), actor: { ...input().actor, roles: ["CIRCLE_OWNER"] } }).allowed).toBe(false);
    expect(planPlatformDirectGrant({ ...input(), actor: { ...input().actor, userId: "partner" } }).allowed).toBe(false);
  });
  it.each([{ ownerId: "other" }, { circleId: "other" }, { circleActive: false }, { ownerActive: false },
    { provider: { ...context.provider!, active: false } }, { provider: { ...context.provider!, membershipValid: false } }])("已有直授仍检查范围和安全主体 %#", change => {
    expect(evaluateCapabilityUse({ ok: false, reason: "POLICY_DISABLED" }, "LIVE", null, granted(), { ...context, ...change }, now).allowed).toBe(false);
  });
  it.each(["REVOKED", "SUSPENDED"] as const)("%s 直授不因圈级授权而恢复", state => {
    expect(evaluateCapabilityUse({ ok: false, reason: "CONFIG_INVALID" }, "LIVE", null, { ...granted(), state }, context, now).allowed).toBe(false);
  });
  it("直授不依赖申请角色配置，原授权管理员可撤销但版本必须一致", () => {
    const grant = granted();
    const request: CapabilityTransitionInput = { action: "REVOKE", actor: input().actor, context, now,
      policy: { ok: false, reason: "CONFIG_INVALID" }, expectedRevision: 1, reason: "合作结束",
      eligibility: { eligible: false, reason: "NOT_REQUIRED", progress: [], scope: { circleId: "circle", ownerId: "owner", capability: "LIVE", policyRevision: null } } };
    expect(planCapabilityTransition(grant, request)).toMatchObject({ allowed: true, next: { revision: 2, state: "REVOKED", enabled: false } });
    expect(planCapabilityTransition(grant, { ...request, expectedRevision: 2 })).toEqual({ allowed: false, reason: "STALE_REVISION" });
  });
});
