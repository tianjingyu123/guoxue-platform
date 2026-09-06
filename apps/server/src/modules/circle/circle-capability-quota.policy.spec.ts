import { CIRCLE_CAPABILITIES, CircleCapability, CircleCapabilityRule, CapabilityGrantSnapshot, readCircleCapabilityRule } from "./circle-capability.policy";
import { CAPABILITY_BUSINESS_TYPES, QuotaReserveInput, QuotaReservation, QuotaTransitionInput,
  QuotaOperationReceipt, validQuotaBinding, planQuotaReservation, planQuotaTransition, quotaContribution } from "./circle-capability-quota.policy";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-09-05T00:00:00Z");
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);
// 额度、期限均为单测夹具，不是正式环境默认配置。
const rule: CircleCapabilityRule = { revision: 2, enabled: true, minIdentity: "L1", minOperatingDays: 10,
  minValidMembers: 5, minPublishedPosts: 4, minRecentPosts: 2, recentWindowDays: 30, maxActiveViolations: 0,
  reapplyCooldownHours: 24, maxValidityDays: 30, maxUnits: 100, maxConcurrent: 2,
  providerRoles: ["OWNER", "PARTNER", "GUEST"], approverRoles: ["SUPER_ADMIN", "OPERATION_ADMIN"] };
const isQuestion = (cap: CircleCapability) => cap === "AUDIO_QUESTION" || cap === "VIDEO_QUESTION";
function request(cap: CircleCapability = "LIVE"): QuotaReserveInput {
  const grant: CapabilityGrantSnapshot = { id: id(10), circleId: id(1), ownerId: id(2), applicantId: id(2),
    subjectUserId: null, capability: cap, policyRevision: 2, revision: 3, state: "APPROVED", enabled: true,
    expiresAt: later(3600), maxUnits: 10, maxConcurrent: 2 };
  return { id: id(20), binding: { circleId: id(1), capability: cap, actorId: isQuestion(cap) ? id(4) : id(2),
    subjectUserId: isQuestion(cap) ? id(3) : null, businessType: CAPABILITY_BUSINESS_TYPES[cap], businessId: id(5), requestKey: id(6), units: 1, holdSeconds: 60 },
    authorization: { policy: readCircleCapabilityRule({ version: 1, rules: { [cap]: rule } }, cap),
      context: { circleId: id(1), ownerId: id(2), circleActive: true, ownerActive: true, ownerMembershipValid: true, ownerIdentity: "L1",
        provider: { userId: id(3), active: true, membershipValid: true, role: "GUEST" } },
      circleGrant: grant, providerGrant: isQuestion(cap) ? { ...grant, id: id(11), subjectUserId: id(3) } : null,
      actor: { userId: isQuestion(cap) ? id(4) : id(2), active: true, executor: "HUMAN" } },
    now, usage: [{ grantId: id(10), committed: 0, held: 0, active: 0 }, ...(isQuestion(cap) ? [{ grantId: id(11), committed: 0, held: 0, active: 0 }] : [])],
    existingByRequest: null, existingByBusiness: null };
}
function held(input = request()): QuotaReservation {
  const result = planQuotaReservation(input);
  if (!result.allowed) throw new Error(result.reason);
  return result.reservation;
}
function operation(r: QuotaReservation, changes: Partial<QuotaTransitionInput> = {}): QuotaTransitionInput {
  return { binding: { ...r.binding }, action: "ACTIVATE", operationKey: id(30), expectedRevision: r.revision,
    now: later(1), authorization: request(r.binding.capability).authorization, ...changes };
}
function active(input = request()): QuotaReservation {
  const r = held(input); const result = planQuotaTransition(r, operation(r, { authorization: input.authorization }));
  if (!result.allowed) throw new Error(result.reason);
  return result.reservation;
}
// 模拟两次 Prisma 回读；不用宿主 structuredClone 产生另一个 Jest VM 的 Date 原型。
function reread(r: QuotaReservation): QuotaReservation {
  return { ...r, binding: { ...r.binding }, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt),
    holdUntil: new Date(r.holdUntil), activatedAt: r.activatedAt && new Date(r.activatedAt), terminalAt: r.terminalAt && new Date(r.terminalAt) };
}

describe("额度预留绑定与授权", () => {
  it.each(CIRCLE_CAPABILITIES)("%s 仅生成未开始的预留，不执行外部业务", cap => {
    const input = request(cap); const original = structuredClone(input);
    const result = planQuotaReservation(input);
    expect(result).toMatchObject({ allowed: true, effect: "INSERT_HELD", reservation: { revision: 1, state: "HELD", activatedAt: null, terminalAt: null, holdUntil: later(60) } });
    if (!result.allowed) return;
    expect(result.reservation.providerGrantId).toBe(isQuestion(cap) ? id(11) : null);
    expect(result.reservation.binding).not.toBe(input.binding);
    expect(input).toEqual(original);
  });
  it.each([{ circleId: "bad" }, { actorId: "bad" }, { businessId: id(5).replace("4000", "1000") }, { requestKey: "bad" },
    { subjectUserId: "bad" }, { capability: "COURSE" }, { businessType: "AUDIO_QUESTION" }, { units: 0 }, { units: 2 },
    { holdSeconds: 0 }, { holdSeconds: 901 }, { holdSeconds: 1.5 }, { holdSeconds: NaN }])("拒绝畸形或跨用途绑定 %#", change => {
    const input = request(); Object.assign(input.binding, change);
    expect(validQuotaBinding(input.binding)).toBe(false);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "INVALID_QUOTA_REQUEST" });
  });
  it("合法个人发布绑定仍须独立平台直授，不能借用圈级批准", () => {
    const input = request(); input.binding.subjectUserId = id(3); input.binding.actorId = id(3); input.authorization.actor.userId = id(3);
    expect(validQuotaBinding(input.binding)).toBe(true);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "DIRECT_GRANT_REQUIRED" });
  });
  it.each(["AUDIO_QUESTION", "VIDEO_QUESTION"] as const)("%s 必须绑定具体服务者", cap => {
    const input = request(cap); input.binding.subjectUserId = null;
    expect(planQuotaReservation(input).allowed).toBe(false);
  });
  it.each([{ active: false }, { executor: "AUTOMATION" }, { userId: id(90) }])("账号/执行者不符即拒绝 %#", change => {
    const input = request(); Object.assign(input.authorization.actor, change);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "ACTOR_UNAVAILABLE" });
  });
  it("非圈主不能使用圈级发布能力；问答也不能偷换服务者", () => {
    const input = request(); input.binding.actorId = id(90); input.authorization.actor.userId = id(90);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "SUBJECT_MISMATCH" });
    const question = request("AUDIO_QUESTION"); question.binding.subjectUserId = id(90);
    expect(planQuotaReservation(question)).toEqual({ allowed: false, reason: "SUBJECT_MISMATCH" });
  });
  it.each(["circleGrant", "providerGrant"] as const)("问答缺 %s 不预留", key => {
    const input = request("AUDIO_QUESTION"); input.authorization[key] = null;
    expect(planQuotaReservation(input).allowed).toBe(false);
  });
  it("两份授权不能复用同一 ID，损坏 ID 也不能进入账本", () => {
    const input = request("AUDIO_QUESTION"); input.authorization.providerGrant!.id = id(10);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "INVALID_GRANT_SCOPE" });
    input.authorization.providerGrant!.id = "bad";
    expect(planQuotaReservation(input).allowed).toBe(false);
  });
  it("预留期限不超过任一授权期限", () => {
    const input = request("AUDIO_QUESTION"); input.authorization.circleGrant!.expiresAt = later(30);
    input.authorization.providerGrant!.expiresAt = later(10);
    expect(held(input).holdUntil).toEqual(later(10));
    input.authorization.providerGrant!.expiresAt = now;
    expect(planQuotaReservation(input).allowed).toBe(false);
  });
  it.each([1, 900])("显式 TTL 边界 %s 秒有效", holdSeconds => {
    const input = request(); input.binding.holdSeconds = holdSeconds;
    expect(held(input).holdUntil).toEqual(later(holdSeconds));
  });
  it("非法预留 ID 或无效当前时间不进入授权计算", () => {
    expect(planQuotaReservation({ ...request(), id: "bad" }).allowed).toBe(false);
    expect(planQuotaReservation({ ...request(), now: new Date(NaN) }).allowed).toBe(false);
  });
});

describe("累计与并发额度分别检查", () => {
  it.each([0, 1])("圈级和服务者第 %s 份额度均能独立拒绝", index => {
    const input = request("VIDEO_QUESTION"); input.usage[index].committed = 10;
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "QUOTA_EXHAUSTED" });
    input.usage[index] = { grantId: input.usage[index].grantId, committed: 2, held: 0, active: 2 };
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "CONCURRENCY_LIMIT" });
  });
  it("最后一次额度可预留；HELD 同时占累计和并发余量", () => {
    const input = request(); input.usage[0] = { grantId: id(10), committed: 8, held: 1, active: 0 };
    expect(planQuotaReservation(input).allowed).toBe(true);
    input.usage[0].committed = 9;
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "QUOTA_EXHAUSTED" });
    input.usage[0] = { grantId: id(10), committed: 0, held: 2, active: 0 };
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "CONCURRENCY_LIMIT" });
  });
  it.each([{ committed: -1 }, { held: 0.5 }, { active: NaN }, { committed: Number.MAX_SAFE_INTEGER + 1 }, { active: 1 }, { grantId: id(99) }])("损坏额度快照拒绝 %#", change => {
    const input = request(); Object.assign(input.usage[0], change);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "INVALID_USAGE_SNAPSHOT" });
  });
  it("缺失、额外或重复快照不做乐观放行", () => {
    const input = request("VIDEO_QUESTION"); input.usage.pop();
    expect(planQuotaReservation(input).allowed).toBe(false);
    input.usage.push({ ...input.usage[0] });
    expect(planQuotaReservation(input).allowed).toBe(false);
    input.usage.push({ grantId: id(11), committed: 0, held: 0, active: 0 });
    expect(planQuotaReservation(input).allowed).toBe(false);
  });
  it("安全整数相加不溢出放行", () => {
    const input = request(); input.usage[0].committed = Number.MAX_SAFE_INTEGER;
    input.usage[0].held = Number.MAX_SAFE_INTEGER;
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "QUOTA_EXHAUSTED" });
  });
});

describe("预留幂等键同时绑定一次业务和请求", () => {
  function retry(): QuotaReserveInput { const input = request(); const r = held(input); return { ...input, existingByRequest: r, existingByBusiness: reread(r) }; }
  it("相同请求重试仅返回已有记录，即使额度已满也不再消费", () => {
    const input = retry(); input.usage[0].committed = 10;
    expect(planQuotaReservation(input)).toMatchObject({ allowed: true, effect: "NONE", reservation: { id: id(20) } });
  });
  it.each(["existingByRequest", "existingByBusiness"] as const)("只有 %s 命中不生成第二条", key => {
    const input = retry(); input[key] = null;
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it.each([{ businessId: id(80) }, { requestKey: id(81) }, { holdSeconds: 90 }])("不能换业务、key 或期限重用幂等结果 %#", change => {
    const input = retry(); Object.assign(input.binding, change);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it.each([{ id: id(99) }, { revision: 2 }, { circleGrantRevision: 4 }, { holdUntil: later(30) }, { updatedAt: later(1) }])("两个主库索引回读不同快照必须停止 %#", change => {
    const input = retry(); Object.assign(input.existingByBusiness!, change);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it("过期占位不能用旧请求重新激活，授权修订变化也不能续用", () => {
    const input = retry(); input.now = later(60);
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "HOLD_EXPIRED" });
    input.now = now; input.authorization.circleGrant!.revision++;
    expect(planQuotaReservation(input)).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it("完成后的同一业务只读返回，不生成新任务", () => {
    const input = retry(); const r = active(); const complete = planQuotaTransition(r, operation(r, { action: "COMPLETE", now: later(2) }));
    if (!complete.allowed) throw new Error(complete.reason);
    input.existingByRequest = complete.reservation; input.existingByBusiness = reread(complete.reservation); input.now = later(3);
    expect(planQuotaReservation(input)).toMatchObject({ allowed: true, effect: "NONE", reservation: { state: "COMPLETED" } });
  });
});

describe("额度状态转换与不可重复外部动作", () => {
  it("开始前再次核权；完成保留累计消费但释放并发", () => {
    const r = held(); const original = structuredClone(r);
    expect(quotaContribution(r, now)).toEqual({ allowed: true, held: 1, committed: 0, active: 0 });
    const start = planQuotaTransition(r, operation(r));
    expect(start).toMatchObject({ allowed: true, effect: "UPDATE", reservation: { state: "ACTIVE", revision: 2 } });
    if (!start.allowed) return;
    expect(quotaContribution(start.reservation, later(1))).toEqual({ allowed: true, held: 0, committed: 1, active: 1 });
    const end = planQuotaTransition(start.reservation, operation(start.reservation, { action: "COMPLETE", operationKey: id(31), now: later(2), authorization: undefined }));
    expect(end).toMatchObject({ allowed: true, effect: "UPDATE", reservation: { state: "COMPLETED", revision: 3 } });
    if (!end.allowed) return;
    expect(quotaContribution(end.reservation, later(2))).toEqual({ allowed: true, held: 0, committed: 1, active: 0 });
    expect(r).toEqual(original);
  });
  it("ACTIVATE 缺授权或授权已撤销均拒绝", () => {
    const r = held(); expect(planQuotaTransition(r, operation(r, { authorization: undefined }))).toEqual({ allowed: false, reason: "AUTHORIZATION_REQUIRED" });
    const input = operation(r); input.authorization!.circleGrant!.state = "REVOKED";
    expect(planQuotaTransition(r, input).allowed).toBe(false);
  });
  it.each(["circleGrant", "providerGrant"] as const)("%s 修订后旧预留不能开始", field => {
    const input = request("AUDIO_QUESTION"); const r = held(input); input.authorization[field]!.revision++;
    expect(planQuotaTransition(r, operation(r, { authorization: input.authorization }))).toEqual({ allowed: false, reason: "GRANT_CHANGED" });
  });
  it("开始时使用当前策略，旧策略授权不能混用", () => {
    const r = held(); const op = operation(r);
    op.authorization!.policy = readCircleCapabilityRule({ version: 1, rules: { LIVE: { ...rule, revision: 3 } } }, "LIVE");
    expect(planQuotaTransition(r, op).allowed).toBe(false);
  });
  it("到期前一毫秒可开始，恰好到期拒绝并可回收", () => {
    const r = held(); expect(planQuotaTransition(r, operation(r, { now: new Date(later(60).getTime() - 1) })).allowed).toBe(true);
    expect(planQuotaTransition(r, operation(r, { now: later(60) }))).toEqual({ allowed: false, reason: "HOLD_EXPIRED" });
    expect(quotaContribution(r, later(60))).toEqual({ allowed: true, held: 0, committed: 0, active: 0 });
    expect(planQuotaTransition(r, operation(r, { action: "EXPIRE", now: later(59), authorization: undefined }))).toEqual({ allowed: false, reason: "HOLD_NOT_EXPIRED" });
    expect(planQuotaTransition(r, operation(r, { action: "EXPIRE", now: later(60), authorization: undefined }))).toMatchObject({ allowed: true, reservation: { state: "EXPIRED" } });
  });
  it("未开始的失败释放不需要重新授权，不消耗累计次数", () => {
    const r = held(); const result = planQuotaTransition(r, operation(r, { action: "RELEASE", authorization: undefined }));
    expect(result.allowed).toBe(true); if (!result.allowed) return;
    expect(quotaContribution(result.reservation, later(1))).toEqual({ allowed: true, held: 0, committed: 0, active: 0 });
    expect(planQuotaTransition(result.reservation, operation(result.reservation, { now: later(2) }))).toEqual({ allowed: false, reason: "INVALID_TRANSITION" });
  });
  it.each(["RELEASE", "EXPIRE"] as const)("已经开始的资源不能用 %s 释放并发或返还次数", action => {
    const r = active(); expect(quotaContribution(r, later(36000))).toEqual({ allowed: true, held: 0, committed: 1, active: 1 });
    expect(planQuotaTransition(r, operation(r, { action, now: later(36000), authorization: undefined }))).toEqual({ allowed: false, reason: "INVALID_TRANSITION" });
  });
  it("完成和重复开始必须符合当前状态", () => {
    const r = held(); expect(planQuotaTransition(r, operation(r, { action: "COMPLETE" })).allowed).toBe(false);
    const a = active(); expect(planQuotaTransition(a, operation(a, { now: later(2) })).allowed).toBe(false);
  });
  it("已有成功回执在后续完成或撤权后重放仍为 NONE，不再次启动 SDK", () => {
    const r = held(); const op = operation(r); const started = planQuotaTransition(r, op);
    if (!started.allowed) throw new Error(started.reason);
    const end = planQuotaTransition(started.reservation, operation(started.reservation, { action: "COMPLETE", operationKey: id(31), now: later(2) }));
    if (!end.allowed) throw new Error(end.reason);
    const replay = planQuotaTransition(end.reservation, { ...op, now: later(3), authorization: undefined, priorReceipt: started.receipt });
    expect(replay).toMatchObject({ allowed: true, effect: "NONE", reservation: { state: "COMPLETED", revision: 3 } });
  });
  it.each([{ operationKey: id(99) }, { reservationId: id(99) }, { action: "COMPLETE" }, { appliedRevision: 1 }, { appliedRevision: 3 }])("不同操作或伪造版本回执拒绝 %#", change => {
    const r = active(); const receipt: QuotaOperationReceipt = { reservationId: r.id, operationKey: id(30), action: "ACTIVATE", binding: r.binding, appliedRevision: 2 };
    Object.assign(receipt, change);
    expect(planQuotaTransition(r, operation(r, { priorReceipt: receipt }))).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it("回执也必须绑定完整业务，不能凭 operationKey 冒领", () => {
    const r = active(); const receipt: QuotaOperationReceipt = { reservationId: r.id, operationKey: id(30), action: "ACTIVATE", binding: { ...r.binding, businessId: id(99) }, appliedRevision: 2 };
    expect(planQuotaTransition(r, operation(r, { priorReceipt: receipt }))).toEqual({ allowed: false, reason: "IDEMPOTENCY_CONFLICT" });
  });
  it.each([{ expectedRevision: 0 }, { expectedRevision: 2 }])("CAS 不匹配拒绝 %#", change => {
    const r = held(); expect(planQuotaTransition(r, operation(r, change))).toEqual({ allowed: false, reason: "STALE_REVISION" });
  });
  it("版本溢出不更新；时间倒退不记账", () => {
    const r = held(); r.revision = 2147483647;
    expect(planQuotaTransition(r, operation(r))).toEqual({ allowed: false, reason: "STALE_REVISION" });
    expect(planQuotaTransition(held(), operation(held(), { now: later(-1) })).allowed).toBe(false);
    expect(quotaContribution(held(), later(-1)).allowed).toBe(false);
  });
  it.each([{ state: "OTHER" }, { activatedAt: now }, { terminalAt: now }, { holdUntil: now }, { holdUntil: later(61) },
    { createdAt: new Date(NaN) }, { updatedAt: later(-1) }, { providerGrantId: id(11) }, { circleGrantRevision: 0 }])("损坏预留不能参与计数或迁移 %#", change => {
    const r = held(); Object.assign(r, change);
    expect(quotaContribution(r, now).allowed).toBe(false);
    expect(planQuotaTransition(r, operation(r)).allowed).toBe(false);
  });
  it("操作绑定或 key 错误不执行", () => {
    const r = held(); const op = operation(r); op.binding = { ...r.binding, businessId: id(99) };
    expect(planQuotaTransition(r, op).allowed).toBe(false);
    expect(planQuotaTransition(r, operation(r, { operationKey: "bad" })).allowed).toBe(false);
  });
});
