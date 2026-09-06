import { PrismaService } from "../../prisma/prisma.service";
import { CircleCapabilityEligibilityService } from "./circle-capability-eligibility.service";
import { CIRCLE_CAPABILITY_CONFIG_KEY } from "./circle-capability.policy";

// 只用于测试资格边界，不作为实际开通配置。
const rule = { revision: 1, enabled: true, minIdentity: "L1", minOperatingDays: 10, minValidMembers: 5,
  minPublishedPosts: 4, minRecentPosts: 2, recentWindowDays: 7, maxActiveViolations: 0, reapplyCooldownHours: 24,
  maxValidityDays: 30, maxUnits: 100, maxConcurrent: 2, providerRoles: ["OWNER", "GUEST"], approverRoles: ["SUPER_ADMIN"] };
const configValue = JSON.stringify({ version: 1, rules: { LIVE: rule } });
const now = new Date("2026-09-05T00:00:00Z");
const circle = { id: "c1", ownerId: "owner", status: "ACTIVE", createdAt: new Date("2026-08-01T00:00:00Z"), memberCount: 99999,
  owner: { status: "ACTIVE", deletedAt: null, identityLevel: "L1" } };
const createPrisma = () => ({
  circle: { findFirst: jest.fn().mockResolvedValue(circle) },
  configSystem: { findUnique: jest.fn().mockResolvedValue({ configValue }) },
  circleMember: { findFirst: jest.fn().mockResolvedValue({ id: "m1" }), count: jest.fn().mockResolvedValue(5) },
  post: { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2) },
  circleViolation: { count: jest.fn().mockResolvedValue(0) },
});

describe("圈内能力资格事实只读采集", () => {
  let prisma: ReturnType<typeof createPrisma>;
  let service: CircleCapabilityEligibilityService;
  beforeEach(() => { jest.useFakeTimers().setSystemTime(now); prisma = createPrisma(); service = new CircleCapabilityEligibilityService(prisma as unknown as PrismaService); });
  afterEach(() => jest.useRealTimers());

  it("有效圈主达标；响应仅为资格预检而非授权/可使用状态", async () => {
    const result = await service.evaluateOwner("c1", "owner", "LIVE");
    expect(result).toMatchObject({ capability: "LIVE", evaluatedAt: now.toISOString(), policyRevision: 1, metricSchema: "valid-circle-posts-v1", eligibility: { eligible: true } });
    expect(result).not.toHaveProperty("canUse"); expect(result).not.toHaveProperty("grant"); expect(result).not.toHaveProperty("canApply");
    expect(prisma.circle.findFirst.mock.calls[0][0].where).toEqual({ id: "c1", ownerId: "owner", deletedAt: null });
    expect(prisma.configSystem.findUnique).toHaveBeenCalledWith({ where: { configKey: CIRCLE_CAPABILITY_CONFIG_KEY } });
  });
  it("使用真实有效成员数，不取页面冗余 memberCount 较大值", async () => {
    prisma.circleMember.count.mockResolvedValue(1);
    const result = await service.evaluateOwner("c1", "owner", "LIVE");
    expect(result.eligibility.eligible).toBe(false);
    expect(result.eligibility.progress).toContainEqual({ key: "validMembers", current: 1, required: 5, passed: false });
    expect(prisma.circleMember.count.mock.calls[0][0].where).toEqual({ circleId: "c1", user: { status: "ACTIVE", deletedAt: null }, OR: [{ expireAt: null }, { expireAt: { gt: now } }] });
  });
  it("内容与违规计数显式排除无效状态和时间", async () => {
    await service.evaluateOwner("c1", "owner", "LIVE");
    const base = { circleId: "c1", status: "PUBLISHED", auditStatus: { not: "REJECTED" }, user: { status: "ACTIVE", deletedAt: null },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] };
    expect(prisma.post.count.mock.calls[0][0].where).toEqual(base);
    expect(prisma.post.count.mock.calls[1][0].where).toEqual({ ...base, createdAt: { gte: new Date("2026-08-29T00:00:00Z"), lte: now } });
    expect(prisma.circleViolation.count.mock.calls[0][0].where).toEqual({ circleId: "c1", status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
  });
  it.each([null, { configValue: "{" }, { configValue: JSON.stringify({ version: 1, rules: {} }) }])("缺失或坏配置不做资格放行：%j", row => {
    prisma.configSystem.findUnique.mockResolvedValue(row);
    return service.evaluateOwner("c1", "owner", "LIVE").then(result => {
      expect(result.eligibility.eligible).toBe(false); expect(prisma.circleMember.count).not.toHaveBeenCalled();
    });
  });
  it("每次重读新配置，不复用已启用缓存", async () => {
    expect((await service.evaluateOwner("c1", "owner", "LIVE")).eligibility.eligible).toBe(true);
    prisma.configSystem.findUnique.mockResolvedValue({ configValue: JSON.stringify({ version: 1, rules: { LIVE: { ...rule, enabled: false } } }) });
    expect((await service.evaluateOwner("c1", "owner", "LIVE")).eligibility.reason).toBe("POLICY_DISABLED");
    expect(prisma.configSystem.findUnique).toHaveBeenCalledTimes(2); expect(prisma.post.count).toHaveBeenCalledTimes(2);
  });
  it.each([{ ...circle, status: "DISABLED" }, { ...circle, owner: { ...circle.owner, status: "DISABLED" } }, { ...circle, owner: { ...circle.owner, deletedAt: now } }])("圈子/账号失效即停止：%j", row => {
    prisma.circle.findFirst.mockResolvedValue(row);
    return service.evaluateOwner("c1", "owner", "LIVE").then(result => {
      expect(result.eligibility.eligible).toBe(false); expect(prisma.post.count).not.toHaveBeenCalled();
    });
  });
  it("过期或缺失 OWNER 成员记录不能申请", async () => {
    prisma.circleMember.findFirst.mockResolvedValue(null);
    expect((await service.evaluateOwner("c1", "owner", "LIVE")).eligibility.reason).toBe("SUBJECT_UNAVAILABLE");
    expect(prisma.circleMember.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "owner", role: "OWNER" });
    expect(prisma.post.count).not.toHaveBeenCalled();
  });
  it("越权不存在的圈子先拒绝，不读取配置和运营指标", async () => {
    prisma.circle.findFirst.mockResolvedValue(null);
    await expect(service.evaluateOwner("c1", "other", "LIVE")).rejects.toThrow("只有当前圈主");
    expect(prisma.configSystem.findUnique).not.toHaveBeenCalled();
  });
  it("数据库失败直接失败，不能编造达标结果", async () => {
    prisma.post.count.mockReset().mockRejectedValue(new Error("TEST_DB_UNAVAILABLE"));
    await expect(service.evaluateOwner("c1", "owner", "LIVE")).rejects.toThrow("TEST_DB_UNAVAILABLE");
  });
});
