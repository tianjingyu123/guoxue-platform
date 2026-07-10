import { Test, TestingModule } from "@nestjs/testing";
import { CircleGovernanceService } from "./circle-governance.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { NotificationService } from "../../notification/notification.service";
import { CircleSharedService } from "../services/circle-shared.service";
import { BusinessException } from "../../../common/business.exception";
import { OFFICIAL_RULE_TEMPLATE, resolvePermission } from "./circle-governance.constants";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const mockPrisma: any = {
  circle: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  circleMember: { findUnique: jest.fn(), delete: jest.fn() },
  circleGovernanceConfig: { findUnique: jest.fn(), upsert: jest.fn(), create: jest.fn() },
  circleRule: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
  circleRuleAck: { upsert: jest.fn(), findUnique: jest.fn() },
  circleViolation: { create: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  circleAppeal: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  user: { findMany: jest.fn() },
  post: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const mockRedis = {
  del: jest.fn().mockResolvedValue(1),
  runExclusive: jest.fn(async (_n: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
};

const mockShared = {
  checkOwnership: jest.fn().mockResolvedValue(undefined),
  checkAdmin: jest.fn().mockResolvedValue(undefined),
  ensureMember: jest.fn().mockResolvedValue(undefined),
  checkPermission: jest.fn().mockResolvedValue(undefined),
};

const mockNotification = { send: jest.fn().mockResolvedValue({}) };

/** 默认配置行（未特殊指定时 getEffectiveConfig 回落默认） */
function resetMocks() {
  jest.clearAllMocks();
  mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(null); // 回落默认配置
  mockPrisma.circle.findUnique.mockResolvedValue({ name: "测试圈" });
  mockPrisma.circleMember.findUnique.mockResolvedValue({ circleId: "c1", userId: "u1", role: "MEMBER" });
  mockPrisma.circleViolation.count.mockResolvedValue(0);
  mockPrisma.circleViolation.findFirst.mockResolvedValue(null);
  mockPrisma.circleViolation.create.mockImplementation(async ({ data }: any) => ({ id: "v-new", createdAt: new Date(), ...data }));
  mockPrisma.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma)));
  mockRedis.runExclusive.mockImplementation(async (_n: string, _ttl: number, fn: () => Promise<unknown>) => fn());
}

describe("CircleGovernanceService", () => {
  let svc: CircleGovernanceService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CircleGovernanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CircleSharedService, useValue: mockShared },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(CircleGovernanceService);
  });

  beforeEach(resetMocks);

  // ═════════ 违规阶梯状态机（#10） ═════════

  describe("sanction 警告", () => {
    it("警告：创建 ACTIVE 记录（90 天清零期）并通知本人，未满阈值不自动禁言", async () => {
      const res = await svc.sanction("c1", "owner", { userId: "u1", type: "WARNING" } as any);
      expect(mockShared.checkPermission).toHaveBeenCalledWith("c1", "owner", "member.discipline");
      expect(res.strikeCount).toBe(1);
      expect(res.autoMuted).toBe(false);
      const created = mockPrisma.circleViolation.create.mock.calls[0][0].data;
      expect(created.type).toBe("WARNING");
      expect(created.status).toBe("ACTIVE");
      // 90 天清零期（允许秒级误差）
      const diff = created.expiresAt.getTime() - Date.now();
      expect(Math.abs(diff - 90 * DAY)).toBeLessThan(60 * 1000);
      expect(mockNotification.send).toHaveBeenCalledTimes(1);
      expect(mockNotification.send.mock.calls[0][1].title).toContain("警告");
    });

    it("第 3 次警告：自动升级禁言 7 天（auto=true·再发一条禁言通知）", async () => {
      mockPrisma.circleViolation.count.mockResolvedValue(2); // 已有 2 次生效警告
      const res = await svc.sanction("c1", "owner", { userId: "u1", type: "WARNING" } as any);
      expect(res.strikeCount).toBe(3);
      expect(res.autoMuted).toBe(true);
      expect(mockPrisma.circleViolation.create).toHaveBeenCalledTimes(2);
      const mute = mockPrisma.circleViolation.create.mock.calls[1][0].data;
      expect(mute.type).toBe("MUTE");
      expect(mute.auto).toBe(true);
      expect(mute.operatorId).toBe("system");
      const diff = mute.expiresAt.getTime() - Date.now();
      expect(Math.abs(diff - 7 * DAY)).toBeLessThan(60 * 1000);
      expect(mockNotification.send).toHaveBeenCalledTimes(2);
    });

    it("满阈值但已在禁言中：不重复叠加禁言", async () => {
      mockPrisma.circleViolation.count.mockResolvedValue(2);
      mockPrisma.circleViolation.findFirst.mockResolvedValue({ id: "mute-1", expiresAt: new Date(Date.now() + DAY) });
      const res = await svc.sanction("c1", "owner", { userId: "u1", type: "WARNING" } as any);
      expect(res.autoMuted).toBe(false);
      expect(mockPrisma.circleViolation.create).toHaveBeenCalledTimes(1); // 只有警告本身
    });

    it("不能处理圈主", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "OWNER" });
      await expect(svc.sanction("c1", "admin", { userId: "u1", type: "WARNING" } as any)).rejects.toThrow(BusinessException);
    });

    it("不能处理自己", async () => {
      await expect(svc.sanction("c1", "u1", { userId: "u1", type: "WARNING" } as any)).rejects.toThrow("不能处理自己");
    });
  });

  describe("sanction 禁言", () => {
    it("手动禁言：默认取圈子配置天数并通知", async () => {
      const res = await svc.sanction("c1", "owner", { userId: "u1", type: "MUTE" } as any);
      const created = mockPrisma.circleViolation.create.mock.calls[0][0].data;
      expect(created.type).toBe("MUTE");
      expect(created.auto).toBe(false);
      expect(res.autoMuted).toBe(false);
      expect(mockNotification.send.mock.calls[0][1].title).toContain("禁言 7 天");
    });

    it("禁言天数仅支持 1/3/7/30", async () => {
      await expect(svc.sanction("c1", "owner", { userId: "u1", type: "MUTE", muteDays: 5 } as any)).rejects.toThrow("1/3/7/30");
    });

    it("已在禁言中不可重复禁言", async () => {
      mockPrisma.circleViolation.findFirst.mockResolvedValue({ id: "mute-1", expiresAt: new Date(Date.now() + DAY) });
      await expect(svc.sanction("c1", "owner", { userId: "u1", type: "MUTE" } as any)).rejects.toThrow("已在禁言中");
    });
  });

  describe("sanction 移出（不动钱·只状态+通知）", () => {
    it("移出须填写理由", async () => {
      await expect(svc.sanction("c1", "owner", { userId: "u1", type: "REMOVE" } as any)).rejects.toThrow("理由");
    });

    it("移出：走 member.remove 锁定权限·建 ACTIVE 禁入记录·删成员·memberCount-1·通知含退款说明", async () => {
      await svc.sanction("c1", "owner", { userId: "u1", type: "REMOVE", reason: "屡次违规" } as any);
      expect(mockShared.checkPermission).toHaveBeenCalledWith("c1", "owner", "member.remove");
      const created = mockPrisma.circleViolation.create.mock.calls[0][0].data;
      expect(created.type).toBe("REMOVE");
      expect(created.status).toBe("ACTIVE"); // 默认 removeBanRejoin=true → 禁入
      expect(mockPrisma.circleMember.delete).toHaveBeenCalledWith({ where: { circleId_userId: { circleId: "c1", userId: "u1" } } });
      expect(mockPrisma.circle.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { memberCount: { decrement: 1 } } });
      expect(mockNotification.send.mock.calls[0][1].content).toContain("退款规则");
    });

    it("removeBanRejoin=false：移出仅记录在案（EXPIRED）不禁入", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({
        requireRuleAck: true, warningThreshold: 3, warningResetDays: 90, muteDays: 7,
        removeBanRejoin: false, newMemberReviewEnabled: false, newMemberReviewDays: 7,
        sensitiveWordsEnabled: true, sensitiveWords: [], postIntervalSeconds: 0,
        reportAutoHideEnabled: true, reportAutoHideThreshold: 3, rolePermissions: null,
      });
      await svc.sanction("c1", "owner", { userId: "u1", type: "REMOVE", reason: "违规" } as any);
      expect(mockPrisma.circleViolation.create.mock.calls[0][0].data.status).toBe("EXPIRED");
    });
  });

  // ═════════ 申诉流（#12） ═════════

  describe("申诉", () => {
    it("72h 内申诉成功：PENDING·48h 答复期限", async () => {
      mockPrisma.circleViolation.findUnique.mockResolvedValue({ id: "v1", userId: "u1", circleId: "c1", status: "ACTIVE", createdAt: new Date(Date.now() - HOUR) });
      mockPrisma.circleAppeal.findUnique.mockResolvedValue(null);
      mockPrisma.circleAppeal.create.mockImplementation(async ({ data }: any) => ({ id: "a1", ...data }));
      const res = await svc.createAppeal("v1", "u1", { content: "内容被误判了" });
      expect(res.replyHours).toBe(48);
      const deadline = mockPrisma.circleAppeal.create.mock.calls[0][0].data.deadlineAt;
      expect(Math.abs(deadline.getTime() - Date.now() - 48 * HOUR)).toBeLessThan(60 * 1000);
    });

    it("超过 72 小时不可申诉", async () => {
      mockPrisma.circleViolation.findUnique.mockResolvedValue({ id: "v1", userId: "u1", circleId: "c1", status: "ACTIVE", createdAt: new Date(Date.now() - 73 * HOUR) });
      await expect(svc.createAppeal("v1", "u1", { content: "太迟了的申诉" })).rejects.toThrow("72");
    });

    it("每次处理仅可申诉一次", async () => {
      mockPrisma.circleViolation.findUnique.mockResolvedValue({ id: "v1", userId: "u1", circleId: "c1", status: "ACTIVE", createdAt: new Date() });
      mockPrisma.circleAppeal.findUnique.mockResolvedValue({ id: "a-exist" });
      await expect(svc.createAppeal("v1", "u1", { content: "再申诉一次" })).rejects.toThrow("一次");
    });

    it("非本人的处理不可申诉", async () => {
      mockPrisma.circleViolation.findUnique.mockResolvedValue({ id: "v1", userId: "other", circleId: "c1", status: "ACTIVE", createdAt: new Date() });
      await expect(svc.createAppeal("v1", "u1", { content: "替别人申诉" })).rejects.toThrow(BusinessException);
    });

    it("仲裁成立：appeal UPHELD + violation REVOKED（撤销处理清记录）+ 通知成员", async () => {
      mockPrisma.circleAppeal.findUnique.mockResolvedValue({ id: "a1", violationId: "v1", circleId: "c1", userId: "u1", status: "PENDING" });
      const res = await svc.resolveAppeal("a1", "reviewer", { uphold: true, resolution: "证据不足，撤销处理" });
      expect(res.status).toBe("UPHELD");
      expect(mockPrisma.circleAppeal.update.mock.calls[0][0].data.status).toBe("UPHELD");
      expect(mockPrisma.circleViolation.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { status: "REVOKED" } });
      expect(mockNotification.send.mock.calls[0][1].title).toContain("成立");
    });

    it("仲裁不成立：处理维持·violation 不动·说明同步成员", async () => {
      mockPrisma.circleAppeal.findUnique.mockResolvedValue({ id: "a1", violationId: "v1", circleId: "c1", userId: "u1", status: "PENDING" });
      const res = await svc.resolveAppeal("a1", "reviewer", { uphold: false, resolution: "违规事实清楚" });
      expect(res.status).toBe("REJECTED");
      expect(mockPrisma.circleViolation.update).not.toHaveBeenCalled();
      expect(mockNotification.send.mock.calls[0][1].content).toContain("违规事实清楚");
    });

    it("已裁决的申诉不可重复裁决", async () => {
      mockPrisma.circleAppeal.findUnique.mockResolvedValue({ id: "a1", status: "UPHELD" });
      await expect(svc.resolveAppeal("a1", "reviewer", { uphold: false, resolution: "重复裁决" })).rejects.toThrow("已裁决");
    });
  });

  // ═════════ Cron 状态机 ═════════

  describe("cron", () => {
    it("警告 90 天自动清零（ACTIVE→EXPIRED·静默）", async () => {
      mockPrisma.circleViolation.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.circleViolation.findMany.mockResolvedValue([]);
      await svc.processExpiredViolations();
      const warnCall = mockPrisma.circleViolation.updateMany.mock.calls[0][0];
      expect(warnCall.where.type).toBe("WARNING");
      expect(warnCall.data.status).toBe("EXPIRED");
    });

    it("禁言到期自动解除并通知恢复发言", async () => {
      mockPrisma.circleViolation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.circleViolation.findMany.mockResolvedValue([{ id: "m1", userId: "u1", circleId: "c1" }]);
      await svc.processExpiredViolations();
      // 第二次 updateMany 是禁言解除
      const muteCall = mockPrisma.circleViolation.updateMany.mock.calls[1][0];
      expect(muteCall.where.id.in).toEqual(["m1"]);
      expect(muteCall.data.status).toBe("EXPIRED");
      expect(mockNotification.send.mock.calls[0][1].title).toContain("解除");
    });

    it("申诉 48h 超时未裁：按承诺自动成立并撤销处理", async () => {
      mockPrisma.circleAppeal.findMany.mockResolvedValue([
        { id: "a1", violationId: "v1", circleId: "c1", userId: "u1", status: "PENDING" },
      ]);
      mockPrisma.circleAppeal.updateMany.mockResolvedValue({ count: 1 });
      await svc.processOverdueAppeals();
      const upd = mockPrisma.circleAppeal.updateMany.mock.calls[0][0];
      expect(upd.where).toEqual({ id: "a1", status: "PENDING" });
      expect(upd.data.status).toBe("UPHELD");
      expect(upd.data.reviewerId).toBe("system");
      expect(mockPrisma.circleViolation.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { status: "REVOKED" } });
      expect(mockNotification.send.mock.calls[0][1].title).toContain("成立");
    });

    it("cron 均走 redis 互斥锁（多实例防重复）", async () => {
      mockPrisma.circleViolation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.circleViolation.findMany.mockResolvedValue([]);
      mockPrisma.circleAppeal.findMany.mockResolvedValue([]);
      await svc.processExpiredViolations();
      await svc.processOverdueAppeals();
      expect(mockRedis.runExclusive).toHaveBeenCalledWith("circle_governance_expire", 600, expect.any(Function));
      expect(mockRedis.runExclusive).toHaveBeenCalledWith("circle_governance_appeals", 600, expect.any(Function));
    });
  });

  // ═════════ 发帖闸门（#11） ═════════

  describe("checkPostGate", () => {
    it("禁言中发帖被拒", async () => {
      mockPrisma.circleViolation.findFirst.mockResolvedValue({ id: "m1", expiresAt: new Date(Date.now() + DAY) });
      await expect(svc.checkPostGate("c1", "u1", ["标题", "内容"])).rejects.toThrow("禁言");
    });

    it("刷屏间隔内被限流", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({
        requireRuleAck: true, warningThreshold: 3, warningResetDays: 90, muteDays: 7,
        removeBanRejoin: true, newMemberReviewEnabled: false, newMemberReviewDays: 7,
        sensitiveWordsEnabled: true, sensitiveWords: [], postIntervalSeconds: 300,
        reportAutoHideEnabled: true, reportAutoHideThreshold: 3, rolePermissions: null,
      });
      mockPrisma.post.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 60 * 1000) }); // 1 分钟前刚发过
      await expect(svc.checkPostGate("c1", "u1", ["又一帖"])).rejects.toThrow("频繁");
    });

    it("圈内敏感词命中：不拒绝·返回 forceAudit 转人工审核", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({
        requireRuleAck: true, warningThreshold: 3, warningResetDays: 90, muteDays: 7,
        removeBanRejoin: true, newMemberReviewEnabled: false, newMemberReviewDays: 7,
        sensitiveWordsEnabled: true, sensitiveWords: ["清仓特价"], postIntervalSeconds: 0,
        reportAutoHideEnabled: true, reportAutoHideThreshold: 3, rolePermissions: null,
      });
      const res = await svc.checkPostGate("c1", "u1", ["开光摆件清仓特价", "加微信看图册"]);
      expect(res.forceAudit).toBe(true);
      expect(res.hitWords).toEqual(["清仓特价"]);
    });

    it("无禁言/无命中/无限流：正常放行", async () => {
      const res = await svc.checkPostGate("c1", "u1", ["正常内容"]);
      expect(res.forceAudit).toBe(false);
    });
  });

  // ═════════ 新成员 7 天先审（TODO#2·2026-07-11） ═════════

  /** 完整配置行（按需覆盖字段） */
  const cfgRow = (overrides: Record<string, unknown> = {}) => ({
    requireRuleAck: true, warningThreshold: 3, warningResetDays: 90, muteDays: 7,
    removeBanRejoin: true, newMemberReviewEnabled: false, newMemberReviewDays: 7,
    sensitiveWordsEnabled: true, sensitiveWords: [], postIntervalSeconds: 0,
    reportAutoHideEnabled: true, reportAutoHideThreshold: 3, rolePermissions: null,
    ...overrides,
  });

  describe("checkPostGate 新成员先审", () => {
    it("开启后加入不足 N 天的普通成员发帖：forceAudit=NEW_MEMBER_REVIEW", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(cfgRow({ newMemberReviewEnabled: true, newMemberReviewDays: 7 }));
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER", joinedAt: new Date(Date.now() - 2 * DAY) });
      const res = await svc.checkPostGate("c1", "u1", ["新人第一帖"]);
      expect(res.forceAudit).toBe(true);
      expect(res.auditReason).toBe("NEW_MEMBER_REVIEW");
    });

    it("加入已满 N 天：不转审", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(cfgRow({ newMemberReviewEnabled: true, newMemberReviewDays: 7 }));
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER", joinedAt: new Date(Date.now() - 8 * DAY) });
      const res = await svc.checkPostGate("c1", "u1", ["老成员发帖"]);
      expect(res.forceAudit).toBe(false);
    });

    it("管理角色不受新成员先审限制（仅普通 MEMBER）", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(cfgRow({ newMemberReviewEnabled: true, newMemberReviewDays: 7 }));
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "ADMIN", joinedAt: new Date(Date.now() - 1 * DAY) });
      const res = await svc.checkPostGate("c1", "u1", ["管理员发帖"]);
      expect(res.forceAudit).toBe(false);
    });
  });

  describe("待审帖子审核（content.review 矩阵位）", () => {
    it("listPendingPosts：只查 AUDITING·按 content.review 鉴权", async () => {
      mockPrisma.post.findMany.mockResolvedValue([{ id: "p1", status: "AUDITING" }]);
      mockPrisma.post.count.mockResolvedValue(1);
      const res = await svc.listPendingPosts("c1", "admin1", 1, 20);
      expect(mockShared.checkPermission).toHaveBeenCalledWith("c1", "admin1", "content.review");
      expect(mockPrisma.post.findMany.mock.calls[0][0].where).toEqual({ circleId: "c1", status: "AUDITING" });
      expect(res.total).toBe(1);
    });

    it("审核通过：PUBLISHED+postCount+1+通知作者", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "AUDITING", userId: "u1", title: "待审帖" });
      const res = await svc.reviewPost("c1", "admin1", "p1", { approve: true });
      expect(mockShared.checkPermission).toHaveBeenCalledWith("c1", "admin1", "content.review");
      expect(res.status).toBe("PUBLISHED");
      expect(mockPrisma.post.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "PUBLISHED" } });
      expect(mockPrisma.circle.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { postCount: { increment: 1 } } });
      expect(mockNotification.send).toHaveBeenCalledTimes(1);
      expect(mockNotification.send.mock.calls[0][0]).toBe("u1");
      expect(mockNotification.send.mock.calls[0][1].title).toContain("通过");
    });

    it("审核驳回：HIDDEN+通知作者（附理由）", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "AUDITING", userId: "u1", title: "待审帖" });
      const res = await svc.reviewPost("c1", "admin1", "p1", { approve: false, reason: "疑似广告" });
      expect(res.status).toBe("HIDDEN");
      expect(mockPrisma.post.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "HIDDEN" } });
      expect(mockPrisma.circle.update).not.toHaveBeenCalled(); // 驳回不计数
      expect(mockNotification.send.mock.calls[0][1].content).toContain("疑似广告");
    });

    it("非待审状态/跨圈帖子拒绝审核", async () => {
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c1", status: "PUBLISHED", userId: "u1" });
      await expect(svc.reviewPost("c1", "admin1", "p1", { approve: true })).rejects.toThrow("待审");
      mockPrisma.post.findUnique.mockResolvedValue({ id: "p1", circleId: "c2", status: "AUDITING", userId: "u1" });
      await expect(svc.reviewPost("c1", "admin1", "p1", { approve: true })).rejects.toThrow("不存在");
    });
  });

  // ═════════ requireRuleAck 服务端强制（TODO#5·2026-07-11） ═════════

  describe("assertRuleAck", () => {
    it("开启确认+有圈规+未确认：拦截（RULE_ACK_REQUIRED）", async () => {
      // 默认配置 requireRuleAck=true
      mockPrisma.circleRule.count.mockResolvedValue(3);
      mockPrisma.circleRuleAck.findUnique.mockResolvedValue(null);
      await expect(svc.assertRuleAck("c1", "u1")).rejects.toThrow("RULE_ACK_REQUIRED");
    });

    it("已确认圈规：放行", async () => {
      mockPrisma.circleRule.count.mockResolvedValue(3);
      mockPrisma.circleRuleAck.findUnique.mockResolvedValue({ id: "ack1" });
      await expect(svc.assertRuleAck("c1", "u1")).resolves.toBeUndefined();
    });

    it("无生效圈规：不强制", async () => {
      mockPrisma.circleRule.count.mockResolvedValue(0);
      await expect(svc.assertRuleAck("c1", "u1")).resolves.toBeUndefined();
      expect(mockPrisma.circleRuleAck.findUnique).not.toHaveBeenCalled();
    });

    it("关闭 requireRuleAck：不强制", async () => {
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(cfgRow({ requireRuleAck: false }));
      await expect(svc.assertRuleAck("c1", "u1")).resolves.toBeUndefined();
      expect(mockPrisma.circleRule.count).not.toHaveBeenCalled();
    });

    it("ackRules 允许未入圈用户确认（加入确认页在建成员前调用）", async () => {
      mockPrisma.circleRule.findMany.mockResolvedValue([{ id: "r1", text: "第一条" }]);
      mockPrisma.circleRuleAck.upsert.mockImplementation(async ({ create }: any) => ({ ackAt: new Date(), ...create }));
      const res = await svc.ackRules("c1", "outsider");
      expect(res.ruleCount).toBe(1);
      expect(mockShared.ensureMember).not.toHaveBeenCalled();
    });
  });

  // ═════════ 圈规模板与确认（#9/#14） ═════════

  describe("圈规模板与加入确认", () => {
    it("首次套用：官方模板 6 条全建", async () => {
      mockPrisma.circleRule.findMany.mockResolvedValue([]);
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue(null);
      const res = await svc.applyTemplate("c1", "owner");
      expect(res.created).toBe(OFFICIAL_RULE_TEMPLATE.length);
      expect(mockPrisma.circleRule.create).toHaveBeenCalledTimes(OFFICIAL_RULE_TEMPLATE.length);
      // 从未保存过配置 → 落模板默认（须确认圈规 + 新帖先审）
      expect(mockPrisma.circleGovernanceConfig.create).toHaveBeenCalled();
    });

    it("再次套用：手改条目跳过不覆盖·未手改条目同步官方文案", async () => {
      mockPrisma.circleRule.findMany.mockResolvedValue([
        { id: "r1", templateKey: "official-1", text: "圈主自己改过的第一条", editedAt: new Date(), sortOrder: 1 },
        { id: "r2", templateKey: "official-2", text: "旧版官方文案", editedAt: null, sortOrder: 2 },
      ]);
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValue({ id: "cfg1" });
      const res = await svc.applyTemplate("c1", "owner");
      expect(res.skipped).toBe(1); // official-1 手改过
      expect(res.updated).toBe(1); // official-2 同步为官方文案
      expect(res.created).toBe(OFFICIAL_RULE_TEMPLATE.length - 2);
      expect(mockPrisma.circleRule.update).toHaveBeenCalledWith({
        where: { id: "r2" },
        data: { text: OFFICIAL_RULE_TEMPLATE[1].text },
      });
      expect(mockPrisma.circleGovernanceConfig.create).not.toHaveBeenCalled(); // 已有配置不覆盖
    });

    it("加入确认：记录全部条文快照（重复确认覆盖为最新）", async () => {
      mockPrisma.circleRule.findMany.mockResolvedValue([
        { id: "r1", text: "第一条" },
        { id: "r2", text: "第二条" },
      ]);
      mockPrisma.circleRuleAck.upsert.mockImplementation(async ({ create }: any) => ({ ackAt: new Date(), ...create }));
      const res = await svc.ackRules("c1", "u1");
      expect(res.ruleCount).toBe(2);
      const upsert = mockPrisma.circleRuleAck.upsert.mock.calls[0][0];
      expect(upsert.create.ruleIds).toEqual(["r1", "r2"]);
      expect(upsert.create.rulesSnapshot).toEqual([{ id: "r1", text: "第一条" }, { id: "r2", text: "第二条" }]);
    });
  });

  // ═════════ 权限矩阵纯函数（#8） ═════════

  describe("resolvePermission", () => {
    it("圈主恒有全部权限（含锁定项）", () => {
      expect(resolvePermission("OWNER", "funds.manage", null)).toBe(true);
      expect(resolvePermission("OWNER", "member.remove", null)).toBe(true);
    });

    it("锁定项（资金/移出）非圈主恒 false·覆盖位也抬不动", () => {
      expect(resolvePermission("ADMIN", "funds.manage", { ADMIN: { "funds.manage": true } })).toBe(false);
      expect(resolvePermission("PARTNER", "member.remove", { PARTNER: { "member.remove": true } })).toBe(false);
    });

    it("默认矩阵位：管理员可警告禁言·合伙人/嘉宾不可·嘉宾可置顶加精", () => {
      expect(resolvePermission("ADMIN", "member.discipline", null)).toBe(true);
      expect(resolvePermission("PARTNER", "member.discipline", null)).toBe(false);
      expect(resolvePermission("GUEST", "member.discipline", null)).toBe(false);
      expect(resolvePermission("GUEST", "content.pin", null)).toBe(true);
    });

    it("覆盖位生效：圈主可收回/授予非锁定项", () => {
      expect(resolvePermission("ADMIN", "content.pin", { ADMIN: { "content.pin": false } })).toBe(false);
      expect(resolvePermission("GUEST", "content.review", { GUEST: { "content.review": true } })).toBe(true);
    });

    it("普通成员/未知角色无管理权限", () => {
      expect(resolvePermission("MEMBER", "content.pin", null)).toBe(false);
      expect(resolvePermission("VOLUNTEER", "content.moderate", null)).toBe(false);
    });
  });
});
