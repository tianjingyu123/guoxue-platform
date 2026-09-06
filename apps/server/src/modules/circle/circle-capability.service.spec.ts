import { PrismaService } from "../../prisma/prisma.service";
import { CircleCapabilityEligibilityService } from "./circle-capability-eligibility.service";
import { CircleCapabilityRepository, CapabilityGrantRow, capabilitySubjectKey } from "./circle-capability.repository";
import { CircleCapabilityService } from "./circle-capability.service";
import { CircleCapability, CircleCapabilityRule } from "./circle-capability.policy";

// 仅为本地测试参数，不写入业务配置。事务模拟验证编排/回滚，不能证明 PostgreSQL 并发锁语义。
const now = new Date("2026-09-05T00:00:00Z");
const rule: CircleCapabilityRule = { revision: 2, enabled: true, minIdentity: "L1", minOperatingDays: 10,
  minValidMembers: 5, minPublishedPosts: 4, minRecentPosts: 2, recentWindowDays: 30, maxActiveViolations: 0,
  reapplyCooldownHours: 24, maxValidityDays: 30, maxUnits: 100, maxConcurrent: 2,
  providerRoles: ["OWNER", "GUEST"], approverRoles: ["SUPER_ADMIN", "OPERATION_ADMIN"] };
const human = (userId = "owner") => ({ userId, executor: "HUMAN" as const });
const approve = (revision = 1) => ({ action: "APPROVE" as const, expectedRevision: revision, reason: "独立人工核验",
  expiresAt: "2026-09-10T00:00:00Z", maxUnits: 50, maxConcurrent: 2 });

// 在当前 Jest realm 中重建日期，模拟 Prisma 返回 Date；原生 structuredClone 会跨 realm。
const clone = <T>(value: T): T => {
  if (Object.prototype.toString.call(value) === "[object Date]") return new Date(Number(value)) as T;
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, clone(v)])) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) as T;
  return value;
};

function harness() {
  const users = Object.fromEntries(["owner", "reviewer", "guest", "outsider"].map(id => [id, { id, status: "ACTIVE", deletedAt: null, identityLevel: "L1" }]));
  const roles: Record<string, string[]> = { reviewer: ["OPERATION_ADMIN"] };
  const circle = { id: "circle", ownerId: "owner", status: "ACTIVE", deletedAt: null };
  const flags = { ownerMember: true, providerMember: true, eligible: true };
  let config: unknown = { version: 1, rules: Object.fromEntries(["LIVE", "SHORT_VIDEO", "AUDIO_QUESTION", "VIDEO_QUESTION"].map(c => [c, { ...rule }])) };
  const rows = new Map<string, CapabilityGrantRow>();
  const audits: Array<{ actorId: string; action: string; grantId: string; revision: number }> = [];
  const lockState = () => ({ userIds: Object.keys(users), memberIds: ["member:owner", "member:guest"],
    roleIds: Object.entries(roles).flatMap(([userId, values]) => values.map(role => `role:${userId}:${role}`)) });
  const tx = {
    user: { findUnique: jest.fn(async ({ where }) => users[where.id] ?? null), findMany: jest.fn() },
    userRole: { findMany: jest.fn(async ({ where }) => (roles[where.userId] ?? [])
      .filter(role => !where.id || where.id.in.includes(`role:${where.userId}:${role}`)).map(roleType => ({ roleType }))) },
    circle: { findUnique: jest.fn(async () => circle), findMany: jest.fn() },
    circleMember: { findFirst: jest.fn(async ({ where }) => {
      if (where.id && !where.id.in.includes(`member:${where.userId}`)) return null;
      return where.role === "OWNER" ? (flags.ownerMember ? { id: "member:owner" } : null) :
        flags.providerMember ? { userId: where.userId, role: "GUEST", expireAt: null, user: users[where.userId] } : null;
    }) },
    configSystem: { findUnique: jest.fn(async () => config === null ? null : { configValue: config }) },
  };
  const repo = {
    lockCircle: jest.fn(async () => ({ circleId: "circle" as string | null, configId: config === null ? null : "config" })),
    lockPeople: jest.fn(async () => lockState()),
    byId: jest.fn(async (_tx, id) => clone(rows.get(id) ?? null)),
    latest: jest.fn(async (_tx, circleId, capability, subject) => clone([...rows.values()].filter(g =>
      g.circleId === circleId && g.capability === capability && g.subjectUserId === subject).sort((a, b) => b.sequence - a.sequence)[0] ?? null)),
    create: jest.fn(async (_tx, pending, sequence, eligibilitySnapshot, time) => {
      const row = { ...pending, subjectKey: capabilitySubjectKey(pending.subjectUserId), sequence, eligibilitySnapshot, createdAt: time, updatedAt: time };
      rows.set(row.id, clone(row)); return clone(row);
    }),
    compareAndSet: jest.fn(async (_tx, previous, next, time) => {
      const old = rows.get(previous.id);
      if (!old || old.revision !== previous.revision || old.state !== previous.state) return null;
      const row = { ...old, ...next, updatedAt: time }; rows.set(row.id, clone(row)); return clone(row);
    }),
    audit: jest.fn(async (_tx, actorId, action, _reason, _previous, next) => { audits.push({ actorId, action, grantId: next.id, revision: next.revision }); }),
    list: jest.fn(async (..._args: unknown[]) => ({ items: [], total: 0 })),
  };
  const prisma = { $transaction: jest.fn(async (callback, _options?: unknown) => {
    const before = clone(rows), auditCount = audits.length;
    try { return await callback(tx); } catch (error) {
      rows.clear(); for (const [key, value] of before) rows.set(key, value);
      audits.splice(auditCount); throw error;
    }
  }) };
  const eligibility = { evaluateOwner: jest.fn(async (_circle, _actor, capability) => ({ capability, evaluatedAt: new Date().toISOString(),
    eligibility: { eligible: flags.eligible, reason: flags.eligible ? "ELIGIBLE_TO_APPLY" : "THRESHOLD_NOT_MET", progress: [],
      scope: { circleId: circle.id, ownerId: circle.ownerId, capability, policyRevision: 2 } } })) };
  const service = new CircleCapabilityService(prisma as unknown as PrismaService, repo as unknown as CircleCapabilityRepository,
    eligibility as unknown as CircleCapabilityEligibilityService);
  const seed = (changes: Partial<CapabilityGrantRow> = {}) => {
    const row: CapabilityGrantRow = { id: "grant", circleId: "circle", ownerId: "owner", applicantId: "owner", subjectUserId: null,
      subjectKey: "circle", sequence: 1, capability: "LIVE", policyRevision: 2, revision: 1, state: "PENDING", enabled: false,
      expiresAt: null, maxUnits: null, maxConcurrent: null, eligibilitySnapshot: {}, createdAt: now, updatedAt: now, ...changes };
    rows.set(row.id, clone(row)); return row;
  };
  return { service, prisma, tx, repo, eligibility, rows, audits, users, roles, circle, flags, seed, lockState, setConfig: (value: unknown) => { config = value; } };
}

describe("圈内能力持久化编排（模拟事务）", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => { jest.useFakeTimers().setSystemTime(now); h = harness(); });
  afterEach(() => jest.useRealTimers());

  it("圈主申请预检与提交共用门槛，预检不创建记录", async () => {
    const context = await h.service.applicationContext("circle", human(), "AUDIO_QUESTION");
    expect(context).toMatchObject({ canApply: true, subjectUserId: null, grant: null });
    expect(h.repo.create).not.toHaveBeenCalled(); expect(h.repo.audit).not.toHaveBeenCalled();
    await h.service.apply("circle", human(), { capability: "AUDIO_QUESTION", reason: "合成申请" });
    expect((await h.service.applicationContext("circle", human(), "AUDIO_QUESTION"))).toMatchObject({ canApply: false, reason: "EXISTING_APPLICATION" });
    expect(h.repo.create).toHaveBeenCalledTimes(1);
  });
  it("个人问答申请预检先要求圈级开通，普通成员不可代圈主查询", async () => {
    expect(await h.service.applicationContext("circle", human(), "VIDEO_QUESTION", "guest")).toMatchObject({ canApply: false, reason: "CIRCLE_GRANT_UNAVAILABLE" });
    await expect(h.service.applicationContext("circle", human("guest"), "VIDEO_QUESTION", "owner")).rejects.toMatchObject({ status: 403 });
    expect(h.repo.create).not.toHaveBeenCalled();
  });

  it("当前授权按序号读取，不受历史分页或其他成员记录影响", async () => {
    for (let i = 1; i <= 60; i++) h.seed({ id: `history-${i}`, sequence: i });
    h.seed({ id: "personal", sequence: 100, subjectUserId: "guest", subjectKey: "user:guest" });
    const owner = await h.service.currentOwn("circle", human(), "LIVE");
    expect(owner.grant?.id).toBe("history-60");
    const member = await h.service.currentOwn("circle", human("guest"), "LIVE");
    expect(member.grant?.id).toBe("personal");
    expect(Object.keys(member.grant!).sort()).toEqual(["id", "revision", "circleId", "capability", "subjectUserId", "state", "enabled", "expiresAt", "source"].sort());
    expect(h.repo.list).not.toHaveBeenCalled(); expect(h.repo.audit).not.toHaveBeenCalled();
  });
  it("当前问答授权即使圈主也只读取其个人范围，失效成员不得读取", async () => {
    h.seed({ id: "circle-audio", capability: "AUDIO_QUESTION" });
    expect((await h.service.currentOwn("circle", human(), "AUDIO_QUESTION")).grant).toBeNull();
    h.flags.providerMember = false;
    await expect(h.service.currentOwn("circle", human("guest"), "LIVE")).rejects.toMatchObject({ status: 403 });
  });

  it("发布状态按当前主体查询，未授权不把历史批准当作可发布", async () => {
    expect(await h.service.getPublishUseStatus("circle", human(), "SHORT_VIDEO")).toEqual({ circleId: "circle", capability: "SHORT_VIDEO", canPublish: false });
    expect(h.repo.create).not.toHaveBeenCalled(); expect(h.repo.audit).not.toHaveBeenCalled();
  });
  it("发布状态不吞数据库故障，也不接受问答能力替代发布能力", async () => {
    h.tx.circle.findUnique.mockRejectedValueOnce(new Error("SYNTHETIC_DB_FAILURE"));
    await expect(h.service.getPublishUseStatus("circle", human(), "SHORT_VIDEO")).rejects.toThrow("SYNTHETIC_DB_FAILURE");
    await expect(h.service.getPublishUseStatus("circle", human(), "AUDIO_QUESTION")).rejects.toThrow("此入口仅查询");
  });

  it.each(["LIVE", "SHORT_VIDEO", "AUDIO_QUESTION", "VIDEO_QUESTION"] as CircleCapability[])("%s 申请仅待审，审批仍禁用，主体最后启用", async capability => {
    const pending = await h.service.apply("circle", human(), { capability, reason: "申请资格核对" });
    expect(pending).toMatchObject({ state: "PENDING", enabled: false, revision: 1, sequence: 1 });
    const approved = await h.service.review(pending.id, human("reviewer"), approve());
    expect(approved).toMatchObject({ state: "APPROVED", enabled: false, revision: 2 });
    const enabled = await h.service.setEnabled(pending.id, human(), { expectedRevision: 2, enabled: true, reason: "圈主确认启用" });
    expect(enabled).toMatchObject({ state: "APPROVED", enabled: true, revision: 3 });
    expect(h.audits.map(a => [a.action, a.revision])).toEqual([["APPLY", 1], ["APPROVE", 2], ["ENABLE", 3]]);
    expect(h.eligibility.evaluateOwner.mock.calls[0]).toEqual(["circle", "owner", capability, h.tx, now]);
    expect(h.prisma.$transaction.mock.calls[0][1]).toEqual({ maxWait: 5000, timeout: 15000 });
  });

  it("自动化调用在事务前被拒绝", async () => {
    await expect(h.service.apply("circle", { userId: "owner", executor: "AUTOMATION" }, { capability: "LIVE", reason: "自动申请" })).rejects.toMatchObject({ status: 403 });
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([null, "{", { version: 1, rules: {} }])("配置缺失或损坏不写申请：%#", async value => {
    h.setConfig(value);
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 403 });
    expect(h.rows.size).toBe(0); expect(h.audits).toHaveLength(0);
  });

  it("非圈主申请、空原因、未知能力全部拒绝", async () => {
    await expect(h.service.apply("circle", human("outsider"), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 403 });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "  " })).rejects.toMatchObject({ status: 400 });
    await expect(h.service.apply("circle", human(), { capability: "COURSE" as CircleCapability, reason: "申请" })).rejects.toMatchObject({ status: 400 });
    expect(h.rows.size).toBe(0);
  });

  it("重复申请冲突，不新增第二条历史或审计", async () => {
    await h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "重复申请" })).rejects.toMatchObject({ status: 409 });
    expect(h.rows.size).toBe(1); expect(h.audits).toHaveLength(1);
  });

  it("驳回后冷却未满不能重申请，冷却后保留旧历史并递增序号", async () => {
    h.seed({ state: "REJECTED" });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 409 });
    jest.setSystemTime(new Date(now.getTime() + 86400000));
    const pending = await h.service.apply("circle", human(), { capability: "LIVE", reason: "重新申请" });
    expect(pending.sequence).toBe(2); expect(h.rows.get("grant")?.state).toBe("REJECTED"); expect(h.rows.size).toBe(2);
  });

  it("当前圈主即使有平台角色仍不得自审批", async () => {
    h.roles.owner = ["SUPER_ADMIN"]; h.seed();
    await expect(h.service.review("grant", human(), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.rows.get("grant")?.revision).toBe(1); expect(h.audits).toHaveLength(0);
  });

  it("审核身份读取实时无绑定平台角色，不信任请求旧权限", async () => {
    h.seed(); h.roles.reviewer = [];
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.tx.userRole.findMany).toHaveBeenCalledWith({ where: { userId: "reviewer", bindId: null,
      roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] }, id: { in: [] } }, select: { roleType: true } });
  });

  it("取锁期间账号被停用，事务重新读取后拒绝", async () => {
    h.seed(); h.repo.lockPeople.mockImplementationOnce(async () => { h.users.reviewer.status = "DISABLED"; return h.lockState(); });
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });

  it("审批时重新校验资格，未达标不得沿用申请时快照", async () => {
    h.seed(); h.flags.eligible = false;
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.eligibility.evaluateOwner).toHaveBeenCalledWith("circle", "owner", "LIVE", h.tx, now);
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });

  it("审批期间圈主变化或策略升版，不继续旧审批", async () => {
    h.seed(); h.circle.ownerId = "guest";
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    h.circle.ownerId = "owner"; h.setConfig({ version: 1, rules: { LIVE: { ...rule, revision: 3 } } });
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
  });

  it("使用取锁后的时间，等待期间到期不能启用", async () => {
    h.seed({ state: "APPROVED", expiresAt: new Date(now.getTime() + 1000), maxUnits: 10, maxConcurrent: 1 });
    h.repo.lockPeople.mockImplementationOnce(async () => { jest.setSystemTime(new Date(now.getTime() + 1001)); return h.lockState(); });
    await expect(h.service.setEnabled("grant", human(), { expectedRevision: 1, enabled: true, reason: "启用" })).rejects.toMatchObject({ status: 403 });
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });

  it("旧版本更新返回冲突，CAS 零行也不能记录成功审计", async () => {
    h.seed();
    await expect(h.service.review("grant", human("reviewer"), approve(2))).rejects.toMatchObject({ status: 409 });
    h.repo.compareAndSet.mockResolvedValueOnce(null);
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 409 });
    expect(h.audits).toHaveLength(0); expect(h.rows.get("grant")?.revision).toBe(1);
  });

  it("被后续申请替代的历史不能再审核", async () => {
    h.seed({ id: "old", state: "REJECTED" }); h.seed({ id: "new", sequence: 2 });
    await expect(h.service.review("old", human("reviewer"), approve())).rejects.toMatchObject({ status: 409 });
  });

  it("申请审计失败，申请行与审计一起回滚", async () => {
    h.repo.audit.mockRejectedValueOnce(new Error("AUDIT_FAILED"));
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toThrow("AUDIT_FAILED");
    expect(h.rows.size).toBe(0); expect(h.audits).toHaveLength(0);
  });

  it("审批审计失败，已更新授权也回滚为原状态", async () => {
    h.seed(); h.repo.audit.mockRejectedValueOnce(new Error("AUDIT_FAILED"));
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toThrow("AUDIT_FAILED");
    expect(h.rows.get("grant")).toMatchObject({ state: "PENDING", revision: 1, enabled: false }); expect(h.audits).toHaveLength(0);
  });

  it("圈级问答获准且启用后，嘉宾仍须独立申请审核并亲自启用", async () => {
    const capability = "AUDIO_QUESTION";
    await expect(h.service.apply("circle", human(), { capability, subjectUserId: "guest", reason: "邀请嘉宾" })).rejects.toMatchObject({ status: 403 });
    h.seed({ state: "APPROVED", enabled: true, capability, expiresAt: new Date("2026-09-10T00:00:00Z"), maxUnits: 50, maxConcurrent: 2 });
    const pending = await h.service.apply("circle", human(), { capability, subjectUserId: "guest", reason: "邀请嘉宾" });
    await h.service.review(pending.id, human("reviewer"), approve());
    await expect(h.service.setEnabled(pending.id, human(), { expectedRevision: 2, enabled: true, reason: "代嘉宾启用" })).rejects.toMatchObject({ status: 403 });
    const enabled = await h.service.setEnabled(pending.id, human("guest"), { expectedRevision: 2, enabled: true, reason: "本人同意" });
    expect(enabled).toMatchObject({ subjectUserId: "guest", enabled: true, revision: 3 });
  });

  it("服务者审批前圈级授权撤回则拒绝", async () => {
    h.seed({ capability: "VIDEO_QUESTION", state: "REVOKED" });
    h.seed({ id: "provider", capability: "VIDEO_QUESTION", subjectUserId: "guest", subjectKey: "user:guest" });
    await expect(h.service.review("provider", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
  });

  it("停用配置后仍能安全暂停/撤销，但不能恢复启用", async () => {
    h.seed({ state: "APPROVED", enabled: true, expiresAt: new Date("2026-09-10T00:00:00Z"), maxUnits: 50, maxConcurrent: 2 });
    h.setConfig(null);
    const suspended = await h.service.review("grant", human("reviewer"), { action: "SUSPEND", expectedRevision: 1, reason: "收回能力" });
    expect(suspended).toMatchObject({ state: "SUSPENDED", enabled: false });
    await expect(h.service.review("grant", human("reviewer"), { action: "RESUME", expectedRevision: 2, reason: "恢复" })).rejects.toMatchObject({ status: 403 });
    expect((await h.service.review("grant", human("reviewer"), { action: "REVOKE", expectedRevision: 2, reason: "撤销" })).state).toBe("REVOKED");
  });

  it("历史查询圈主可看本圈，其他账号只看自身服务者记录", async () => {
    await h.service.listOwn("circle", human("guest"), { page: 1, pageSize: 20 });
    expect(h.repo.list.mock.calls[0][1]).toMatchObject({ circleId: "circle", subjectUserId: "guest" });
    await h.service.listOwn("circle", human(), { page: 2, pageSize: 10, circleId: "foreign" });
    expect(h.repo.list.mock.calls[1][1]).toEqual({ circleId: "circle", capability: undefined, state: undefined });
    expect(h.repo.list.mock.calls[1].slice(2)).toEqual([10, 10]);
  });

  it("后台列表实时撤权与非法分页拒绝", async () => {
    await expect(h.service.listAdmin(human("outsider"), { page: 1, pageSize: 20 })).rejects.toMatchObject({ status: 403 });
    await expect(h.service.listAdmin(human("reviewer"), { page: 1, pageSize: 51 })).rejects.toMatchObject({ status: 400 });
    await expect(h.service.listAdmin(human("reviewer"), { page: 1, pageSize: 20, state: "UNKNOWN" })).rejects.toMatchObject({ status: 400 });
  });

  it("直授确认读取精确范围的最新版本，但不创建或修改授权", async () => {
    h.seed();
    const result = await h.service.directGrantContext("circle", human("reviewer"), "LIVE");
    expect(result).toMatchObject({ circleId: "circle", capability: "LIVE", subjectUserId: null, scope: "CIRCLE", expectedLatestId: "grant", expectedLatestRevision: 1 });
    expect(h.repo.latest).toHaveBeenCalledWith(h.tx, "circle", "LIVE", null);
    expect(h.repo.create).not.toHaveBeenCalled(); expect(h.repo.audit).not.toHaveBeenCalled();
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });
  it("首次个人直授确认返回零版本，不误用圈子整体授权", async () => {
    h.seed();
    const result = await h.service.directGrantContext("circle", human("reviewer"), "LIVE", "guest");
    expect(result).toMatchObject({ subjectUserId: "guest", scope: "PERSONAL", expectedLatestId: null, expectedLatestRevision: 0 });
    expect(h.repo.latest).toHaveBeenCalledWith(h.tx, "circle", "LIVE", "guest");
  });
  it("普通账号不能读取直授确认对象", async () => {
    await expect(h.service.directGrantContext("circle", human("outsider"), "LIVE")).rejects.toMatchObject({ status: 403 });
    expect(h.repo.lockCircle).not.toHaveBeenCalled(); expect(h.repo.latest).not.toHaveBeenCalled();
  });
  it("直授确认等待锁后失去审核角色时拒绝，不返回旧角色视图", async () => {
    h.repo.lockPeople.mockResolvedValueOnce({ ...h.lockState(), roleIds: [] });
    await expect(h.service.directGrantContext("circle", human("reviewer"), "LIVE")).rejects.toMatchObject({ status: 403 });
    expect(h.repo.latest).not.toHaveBeenCalled();
  });

  it("后台列表批量补齐圈子和授权对象名称，不索取账号敏感字段", async () => {
    h.seed();
    h.repo.list.mockResolvedValueOnce({ items: [h.rows.get("grant")], total: 1 } as never);
    h.tx.circle.findMany.mockResolvedValue([{ id: "circle", name: "测试圈" }]);
    h.tx.user.findMany.mockResolvedValue([{ id: "owner", nickname: "测试圈主" }]);
    const result = await h.service.listAdmin(human("reviewer"), { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ display: { circleName: "测试圈", ownerName: "测试圈主", applicantName: "测试圈主", subjectName: "圈子整体授权" } });
    expect(h.tx.user.findMany).toHaveBeenCalledWith({ where: { id: { in: ["owner"] } }, select: { id: true, nickname: true } });
    expect(h.tx.circle.findMany).toHaveBeenCalledTimes(1);
  });
  it("空列表不查账号；撤权账号不能获取展示名称", async () => {
    await h.service.listAdmin(human("reviewer"), { page: 1, pageSize: 20 });
    await expect(h.service.listAdmin(human("outsider"), { page: 1, pageSize: 20 })).rejects.toMatchObject({ status: 403 });
    expect(h.tx.user.findMany).not.toHaveBeenCalled(); expect(h.tx.circle.findMany).not.toHaveBeenCalled();
  });

  it("运行时授权检查不创建业务/额度，撤销后立即拒绝", async () => {
    h.seed({ state: "APPROVED", enabled: true, expiresAt: new Date("2026-09-10T00:00:00Z"), maxUnits: 50, maxConcurrent: 2 });
    expect((await h.service.assertAuthorizationInTransaction(h.tx as never, "circle", "LIVE", human(), null)).circleGrant?.id).toBe("grant");
    await expect(h.service.assertAuthorizationInTransaction(h.tx as never, "circle", "LIVE", human("outsider"), null)).rejects.toMatchObject({ status: 403 });
    h.rows.get("grant")!.state = "REVOKED";
    await expect(h.service.assertAuthorizationInTransaction(h.tx as never, "circle", "LIVE", human(), null)).rejects.toMatchObject({ status: 403 });
    expect(h.repo.create).not.toHaveBeenCalled(); expect(h.repo.compareAndSet).not.toHaveBeenCalled(); expect(h.audits).toHaveLength(0);
  });
  it("配置锁查询为空时，随后出现的配置不能混入当前申请", async () => {
    h.repo.lockCircle.mockResolvedValueOnce({ circleId: "circle", configId: null });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 403 });
    expect(h.tx.configSystem.findUnique).not.toHaveBeenCalled(); expect(h.rows.size).toBe(0);
  });
  it("圈子锁查询为空时不接纳后续刚创建的同ID圈子", async () => {
    h.repo.lockCircle.mockResolvedValueOnce({ circleId: null, configId: "config" });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 404 });
    expect(h.tx.circle.findUnique).not.toHaveBeenCalled();
  });
  it("未锁定的新角色不能用于当前审批", async () => {
    h.seed(); h.repo.lockPeople.mockResolvedValueOnce({ ...h.lockState(), roleIds: [] });
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });
  it("未锁定的新成员关系不能用于当前申请", async () => {
    h.repo.lockPeople.mockResolvedValueOnce({ ...h.lockState(), memberIds: [] });
    await expect(h.service.apply("circle", human(), { capability: "LIVE", reason: "申请" })).rejects.toMatchObject({ status: 403 });
    expect(h.rows.size).toBe(0);
  });
  it("未锁定的新账号不能用于当前审批", async () => {
    h.seed(); h.repo.lockPeople.mockResolvedValueOnce({ ...h.lockState(), userIds: ["owner", "guest"] });
    await expect(h.service.review("grant", human("reviewer"), approve())).rejects.toMatchObject({ status: 403 });
    expect(h.repo.compareAndSet).not.toHaveBeenCalled();
  });
});
