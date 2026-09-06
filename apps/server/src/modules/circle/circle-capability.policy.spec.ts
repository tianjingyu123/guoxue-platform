import {
  CIRCLE_CAPABILITIES, CircleCapability, CircleCapabilityRule, CapabilityFacts, CapabilityGrantSnapshot,
  CapabilityRuntimeContext, CapabilityTransitionInput, CapabilityApplicationInput, readCircleCapabilityRule,
  evaluateCircleCapabilityEligibility, evaluateCapabilityUse, planCapabilityApplication, planCapabilityTransition,
} from "./circle-capability.policy";

// 数值仅为单测夹具，不是正式业务门槛，也不写入 ConfigSystem。
const rule: CircleCapabilityRule = { revision: 2, enabled: true, minIdentity: "L1", minOperatingDays: 10,
  minValidMembers: 5, minPublishedPosts: 4, minRecentPosts: 2, recentWindowDays: 30, maxActiveViolations: 0,
  reapplyCooldownHours: 24, maxValidityDays: 30, maxUnits: 100, maxConcurrent: 2,
  providerRoles: ["OWNER", "PARTNER", "GUEST"], approverRoles: ["SUPER_ADMIN", "OPERATION_ADMIN"] };
const config = (cap: CircleCapability = "LIVE", change: Record<string, unknown> = {}) => ({ version: 1, rules: { [cap]: { ...rule, ...change } } });
const policy = (cap: CircleCapability = "LIVE") => readCircleCapabilityRule(config(cap), cap);
const now = new Date("2026-09-05T00:00:00Z");
const facts: CapabilityFacts = { circleId: "c1", ownerId: "owner", actorId: "owner", circleActive: true, actorActive: true,
  ownerMembershipValid: true, identity: "L1", operatingDays: 10, validMembers: 5, publishedPosts: 4, recentPosts: 2, activeViolations: 0 };
const context: CapabilityRuntimeContext = { circleId: "c1", ownerId: "owner", circleActive: true, ownerActive: true, ownerMembershipValid: true, ownerIdentity: "L1",
  provider: { userId: "guest", active: true, membershipValid: true, role: "GUEST" } };
const approved = (cap: CircleCapability = "LIVE", changes: Partial<CapabilityGrantSnapshot> = {}): CapabilityGrantSnapshot => ({
  id: "g1", circleId: "c1", ownerId: "owner", applicantId: "owner", subjectUserId: null, capability: cap, policyRevision: 2,
  revision: 3, state: "APPROVED", enabled: true, expiresAt: new Date("2026-09-10T00:00:00Z"), maxUnits: 50, maxConcurrent: 2, ...changes,
});
const transition = (cap: CircleCapability = "LIVE", changes: Partial<CapabilityTransitionInput> = {}): CapabilityTransitionInput => ({
  action: "APPROVE", actor: { userId: "reviewer", roles: ["OPERATION_ADMIN"], executor: "HUMAN" }, policy: policy(cap),
  context, now, eligibility: evaluateCircleCapabilityEligibility(policy(cap), facts), expectedRevision: 3, reason: "人工核对",
  approval: { expiresAt: new Date("2026-09-15T00:00:00Z"), maxUnits: 50, maxConcurrent: 2 }, ...changes,
});
const application = (cap: CircleCapability = "LIVE", changes: Partial<CapabilityApplicationInput> = {}): CapabilityApplicationInput => ({
  id: "new1", capability: cap, subjectUserId: null, actor: { userId: "owner", roles: [], executor: "HUMAN" },
  context, policy: policy(cap), eligibility: evaluateCircleCapabilityEligibility(policy(cap), facts), now, latest: null, ...changes,
});

describe("圈内独立能力配置", () => {
  it.each(CIRCLE_CAPABILITIES)("%s 单独解析，不连带开通其他能力", cap => {
    expect(readCircleCapabilityRule(JSON.stringify(config(cap)), cap)).toEqual({ ok: true, capability: cap, rule });
    const other = CIRCLE_CAPABILITIES.find(c => c !== cap)!;
    expect(readCircleCapabilityRule(config(cap), other)).toEqual({ ok: false, reason: "CONFIG_MISSING" });
  });
  it.each([null, undefined, ""])("缺配置不继承老平台默认阈值：%s", raw => {
    expect(readCircleCapabilityRule(raw, "LIVE")).toEqual({ ok: false, reason: "CONFIG_MISSING" });
  });
  it.each(["{", [], { version: 2, rules: {} }, { version: 1, rules: {}, extra: true }, { version: 1, rules: { COURSE: rule } }, "x".repeat(65537)])("未知/损坏格式关闭：%#", raw => {
    expect(readCircleCapabilityRule(raw, "LIVE")).toEqual({ ok: false, reason: "CONFIG_INVALID" });
  });
  it.each(Object.keys(rule))("任何必填字段 %s 缺失均不得补默认值", key => {
    const c = config(); delete c.rules.LIVE[key];
    expect(readCircleCapabilityRule(c, "LIVE")).toEqual({ ok: false, reason: "CONFIG_INVALID" });
  });
  it.each([{ enabled: "true" }, { minValidMembers: "5" }, { minRecentPosts: -1 }, { revision: 0 }, { minOperatingDays: 0.5 },
    { maxConcurrent: 101 }, { maxUnits: 0 }, { minIdentity: "L3" }, { providerRoles: ["MEMBER"] }, { approverRoles: ["CIRCLE_OWNER"] },
    { approverRoles: [] }, { providerRoles: ["GUEST", "GUEST"] }, { extra: true }])("非法值关闭：%j", change => {
    expect(readCircleCapabilityRule(config("LIVE", change), "LIVE")).toEqual({ ok: false, reason: "CONFIG_INVALID" });
  });
  it("显式停用和未知能力分开返回", () => {
    expect(readCircleCapabilityRule(config("LIVE", { enabled: false }), "LIVE")).toEqual({ ok: false, reason: "POLICY_DISABLED" });
    expect(readCircleCapabilityRule(config(), "COURSE")).toEqual({ ok: false, reason: "UNSUPPORTED_CAPABILITY" });
  });
  it.each(["revision", "maxUnits", "maxConcurrent"])("持久化整数 %s 超出 PostgreSQL Int 上限即关闭", key => {
    expect(readCircleCapabilityRule(config("LIVE", { [key]: 2147483648 }), "LIVE")).toEqual({ ok: false, reason: "CONFIG_INVALID" });
  });
});

describe("申请资格只表示可申请", () => {
  it("阈值恰好相等可申请但不返回可使用权限", () => {
    const result = evaluateCircleCapabilityEligibility(policy(), facts);
    expect(result.eligible).toBe(true); expect(result.reason).toBe("ELIGIBLE_TO_APPLY"); expect(result).not.toHaveProperty("canUse");
    expect(result.scope).toEqual({ circleId: "c1", ownerId: "owner", capability: "LIVE", policyRevision: 2 });
  });
  it.each([{ actorId: "guest" }, { actorActive: false }, { circleActive: false }, { ownerMembershipValid: false },
    { identity: "NONE" }, { operatingDays: 9 }, { validMembers: 4 }, { publishedPosts: 3 }, { recentPosts: 1 }, { activeViolations: 1 },
    { recentPosts: NaN }, { validMembers: -1 }])("资格事实不合格拒绝：%j", change => {
    expect(evaluateCircleCapabilityEligibility(policy(), { ...facts, ...change } as CapabilityFacts).eligible).toBe(false);
  });
});

describe("新业务必须具备独立且有效的授权", () => {
  it.each(CIRCLE_CAPABILITIES)("%s 只有圈级授权的结果按能力区分", cap => {
    const result = evaluateCapabilityUse(policy(cap), cap, approved(cap), null, context, now);
    expect(result.allowed).toBe(cap === "LIVE" || cap === "SHORT_VIDEO");
  });
  it("音视频问答的圈级与服务者授权缺一不可", () => {
    const cap = "AUDIO_QUESTION";
    const provider = approved(cap, { id: "pg1", subjectUserId: "guest" });
    expect(evaluateCapabilityUse(policy(cap), cap, approved(cap), provider, context, now)).toEqual({ allowed: true });
    expect(evaluateCapabilityUse(policy(cap), cap, null, provider, context, now).allowed).toBe(false);
    expect(evaluateCapabilityUse(policy("VIDEO_QUESTION"), "VIDEO_QUESTION", approved("VIDEO_QUESTION"), provider, context, now).allowed).toBe(false);
  });
  it.each([{ state: "PENDING" }, { state: "SUSPENDED" }, { state: "REVOKED" }, { enabled: false }, { expiresAt: now },
    { expiresAt: new Date(NaN) }, { policyRevision: 1 }, { ownerId: "previous-owner" }, { circleId: "c2" }, { maxUnits: null },
    { maxUnits: 101 }, { maxConcurrent: 0 }, { revision: 0 }, { subjectUserId: "guest" }])("圈级旧/损坏授权不可使用：%j", changes => {
    expect(evaluateCapabilityUse(policy(), "LIVE", approved("LIVE", changes as Partial<CapabilityGrantSnapshot>), null, context, now).allowed).toBe(false);
  });
  it.each([{ active: false }, { membershipValid: false }, { role: "MEMBER" }, { userId: "another" }])("服务者无效拒绝：%j", changes => {
    expect(evaluateCapabilityUse(policy("AUDIO_QUESTION"), "AUDIO_QUESTION", approved("AUDIO_QUESTION"),
      approved("AUDIO_QUESTION", { subjectUserId: "guest" }), { ...context, provider: { ...context.provider!, ...changes } }, now).allowed).toBe(false);
  });
  it("不能以直播的策略校验另一种能力，设置价格也不产生授权", () => {
    expect(evaluateCapabilityUse(policy("LIVE"), "SHORT_VIDEO", approved("SHORT_VIDEO"), null, context, now)).toEqual({ allowed: false, reason: "CAPABILITY_MISMATCH" });
    expect(evaluateCapabilityUse(policy(), "LIVE", null, null, context, now).allowed).toBe(false);
  });
  it.each([{ ownerMembershipValid: false }, { ownerIdentity: "NONE" }, { ownerActive: false }, { circleActive: false }])("圈主实时状态变化阻止新增使用：%j", changes => {
    expect(evaluateCapabilityUse(policy(), "LIVE", approved(), null, { ...context, ...changes } as CapabilityRuntimeContext, now).allowed).toBe(false);
  });
});

describe("申请、审核、启用的显式状态迁移", () => {
  it("达标申请仅生成 PENDING；批准后仍不启用", () => {
    const request = planCapabilityApplication(application());
    expect(request.allowed).toBe(true); if (!request.allowed) return;
    expect(request.pending).toMatchObject({ state: "PENDING", enabled: false, maxUnits: null, expiresAt: null });
    const result = planCapabilityTransition(request.pending, transition("LIVE", { expectedRevision: 1 }));
    expect(result.allowed).toBe(true); if (!result.allowed) return;
    expect(result.next).toMatchObject({ state: "APPROVED", enabled: false, revision: 2, maxUnits: 50 });
    expect(request.pending.state).toBe("PENDING");
  });
  it.each(["PENDING", "SUSPENDED", "APPROVED"] as const)("阻止 %s 重复申请", state => {
    expect(planCapabilityApplication(application("LIVE", { latest: { grant: approved("LIVE", { state }), updatedAt: now } })))
      .toEqual({ allowed: false, reason: "EXISTING_APPLICATION" });
  });
  it("驳回/撤销冷却取处理时间，边界到达允许重申请", () => {
    const latest = { grant: approved("LIVE", { state: "REJECTED" }), updatedAt: new Date(now.getTime() - 86400000 + 1) };
    expect(planCapabilityApplication(application("LIVE", { latest }))).toEqual({ allowed: false, reason: "REAPPLY_COOLDOWN" });
    latest.updatedAt = new Date(now.getTime() - 86400000);
    expect(planCapabilityApplication(application("LIVE", { latest })).allowed).toBe(true);
  });
  it("损坏历史记录和未知状态不能被当作没有申请", () => {
    expect(planCapabilityApplication(application("LIVE", { latest: { grant: approved("LIVE", { state: "UNKNOWN" as never }), updatedAt: now } })))
      .toEqual({ allowed: false, reason: "INVALID_GRANT_HISTORY" });
    expect(planCapabilityApplication(application("LIVE", { latest: { grant: approved("LIVE", { state: "REVOKED" }), updatedAt: new Date(NaN) } })))
      .toEqual({ allowed: false, reason: "REAPPLY_COOLDOWN" });
  });
  it("正常到期可重新申请，但不能直接启用旧授权", () => {
    const expired = approved("LIVE", { expiresAt: now, enabled: false });
    expect(planCapabilityApplication(application("LIVE", { latest: { grant: expired, updatedAt: now } })).allowed).toBe(true);
    expect(planCapabilityTransition(expired, transition("LIVE", { action: "ENABLE", actor: { userId: "owner", roles: [], executor: "HUMAN" } })).allowed).toBe(false);
  });
  it("跨圈资格结果不能拿来申请或审批", () => {
    const eligibility = evaluateCircleCapabilityEligibility(policy(), { ...facts, circleId: "other" });
    expect(planCapabilityApplication(application("LIVE", { eligibility })).allowed).toBe(false);
    expect(planCapabilityTransition(approved("LIVE", { state: "PENDING" }), transition("LIVE", { eligibility })).allowed).toBe(false);
  });
  it("圈主可为有效嘉宾申请，但需已有同种圈级授权", () => {
    const input = application("AUDIO_QUESTION", { subjectUserId: "guest" });
    expect(planCapabilityApplication(input).allowed).toBe(false);
    input.circleGrant = approved("AUDIO_QUESTION");
    expect(planCapabilityApplication(input).allowed).toBe(true);
  });
  it.each(["owner", "guest"])("管理员身份也不能替自己审批：%s", userId => {
    expect(planCapabilityTransition(approved("AUDIO_QUESTION", { state: "PENDING", subjectUserId: "guest" }),
      transition("AUDIO_QUESTION", { actor: { userId, roles: ["SUPER_ADMIN"], executor: "HUMAN" }, circleGrant: approved("AUDIO_QUESTION") })))
      .toEqual({ allowed: false, reason: "SELF_APPROVAL_FORBIDDEN" });
  });
  it.each(["APPROVE", "REJECT", "ENABLE", "DISABLE", "SUSPEND", "RESUME", "REVOKE"] as const)("自动化不能执行授权变更 %s", action => {
    expect(planCapabilityTransition(approved(), transition("LIVE", { action, actor: { userId: "reviewer", roles: ["SUPER_ADMIN"], executor: "AUTOMATION" } })))
      .toEqual({ allowed: false, reason: "HUMAN_REQUIRED" });
  });
  it("非审核角色、旧修订、空审核原因均拒绝", () => {
    const pending = approved("LIVE", { state: "PENDING" });
    for (const change of [{ actor: { userId: "stranger", roles: ["CIRCLE_OWNER"], executor: "HUMAN" as const } }, { expectedRevision: 2 }, { reason: " " }]) {
      expect(planCapabilityTransition(pending, transition("LIVE", change)).allowed).toBe(false);
    }
  });
  it.each([{ maxUnits: 101 }, { maxUnits: 0 }, { maxConcurrent: 3 }, { maxConcurrent: 0 },
    { expiresAt: now }, { expiresAt: new Date(NaN) }, { expiresAt: new Date(now.getTime() + 31 * 86400000) }])("审批不得突破配置上限：%j", changes => {
    const input = transition(); input.approval = { ...input.approval!, ...changes };
    expect(planCapabilityTransition(approved("LIVE", { state: "PENDING" }), input).allowed).toBe(false);
  });
  it("服务者自己启用，圈主不能代嘉宾启用；暂停恢复不自动重新启用", () => {
    const provider = approved("AUDIO_QUESTION", { subjectUserId: "guest", enabled: false });
    const input = transition("AUDIO_QUESTION", { action: "ENABLE", circleGrant: approved("AUDIO_QUESTION"), actor: { userId: "guest", roles: [], executor: "HUMAN" } });
    const enable = planCapabilityTransition(provider, input);
    expect(enable.allowed).toBe(true);
    expect(planCapabilityTransition(provider, { ...input, actor: { ...input.actor, userId: "owner" } }).allowed).toBe(false);
    const resumed = planCapabilityTransition(approved("LIVE", { state: "SUSPENDED", enabled: false }), transition("LIVE", { action: "RESUME" }));
    expect(resumed.allowed).toBe(true); if (resumed.allowed) expect(resumed.next.enabled).toBe(false);
  });
  it("配置损坏仍能由平台人工撤销，但不可审批/恢复", () => {
    const broken = readCircleCapabilityRule("{", "LIVE");
    expect(planCapabilityTransition(approved(), transition("LIVE", { action: "REVOKE", policy: broken })).allowed).toBe(true);
    expect(planCapabilityTransition(approved("LIVE", { state: "PENDING" }), transition("LIVE", { policy: broken })).allowed).toBe(false);
  });
  it("迁移计划保留旧记录，不自行写入或宣称完成原子配额预留", () => {
    const old = approved(); const before = { ...old };
    const result = planCapabilityTransition(old, transition("LIVE", { action: "SUSPEND" }));
    expect(old).toEqual(before); expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.expectedRevision).toBe(3); expect(result.next).toMatchObject({ revision: 4, state: "SUSPENDED", enabled: false });
      expect(result.audit).toEqual({ actorId: "reviewer", action: "SUSPEND", reason: "人工核对" });
    }
  });
});
