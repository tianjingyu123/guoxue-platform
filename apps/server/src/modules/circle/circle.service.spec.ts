import { Test } from "@nestjs/testing";
import { CircleService } from "./circle.service";
import { CircleSharedService } from "./services/circle-shared.service";
import { CircleCoreService } from "./services/circle-core.service";
import { CircleMembershipService } from "./services/circle-membership.service";
import { CirclePostService } from "./services/circle-post.service";
import { CircleExpertService } from "./services/circle-expert.service";
import { CircleGovernanceService } from "./governance/circle-governance.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { AuditService } from "../audit/audit.service";
import { BusinessException } from "../../common/business.exception";
import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine";

const mockPrisma = {
  circle: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  circleMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  post: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userRole: { upsert: jest.fn() },
  // 治理 #10：加入前禁入校验（默认无移出禁入记录）
  circleViolation: { findFirst: jest.fn().mockResolvedValue(null) },
  // 邀请码入圈（治理旁路禁入拦截测试用）
  circleInviteCode: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  circleInvitation: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  circleAnnouncement: { findFirst: jest.fn() },
  circleAnnouncementRead: { findUnique: jest.fn() },
  $transaction: jest.fn((arg: any) => (typeof arg === "function" ? arg(mockPrisma) : Promise.all(arg))),
  // 圈子 needApproval 列绕过 Prisma generate 锁，service 用原生 SQL 读写（默认非审批制）
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ needApproval: false }]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

// 治理 service mock：requireRuleAck 强制/发帖闸门（默认放行·单测可按用例覆盖）
const mockGovernance = {
  assertRuleAck: jest.fn().mockResolvedValue(undefined),
  checkPostGate: jest.fn().mockResolvedValue({ forceAudit: false, hitWords: [] }),
};

describe("CircleService", () => {
  let svc: CircleService;
  let coreSvc: CircleCoreService;

  beforeAll(async () => {
    const mockUnifiedPricing = {
      calculateTargetPrice: jest.fn().mockResolvedValue({
        targetId: "c1",
        targetType: "CIRCLE",
        effectivePrice: 99,
        originalPrice: 99,
        hasPromotion: false,
        appliedPromotion: null,
        activePromotions: [],
      }),
      invalidateTargetCache: jest.fn().mockResolvedValue(undefined),
    };

    const mod = await Test.createTestingModule({
      providers: [
        CircleService,
        // 拆分后 facade 委托的 4 内聚子域 + 1 共享叶子（纯搬家零行为变化）
        CircleSharedService,
        CircleCoreService,
        CircleMembershipService,
        CirclePostService,
        CircleExpertService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        // 内容审核：默认放行（resolve），拦截逻辑由 audit 模块自身测试覆盖
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined), moderateImageOrThrow: jest.fn().mockResolvedValue(undefined) } },
        // 治理：requireRuleAck 强制/发帖闸门（默认放行）
        { provide: CircleGovernanceService, useValue: mockGovernance },
      ],
    }).compile();
    svc = mod.get(CircleService);
    coreSvc = mod.get(CircleCoreService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("create", () => {
    it("创建圈子并设置圈主角色", async () => {
      mockPrisma.circle.create.mockResolvedValue({ id: "c1", name: "国学圈", memberCount: 1 });
      mockPrisma.userRole.upsert.mockResolvedValue({});
      const result = await svc.create("u1", { name: "国学圈", intro: "交流国学", tags: ["国学"], type: "FREE" });
      expect(result).toHaveProperty("id", "c1");
      expect(mockPrisma.circle.create).toHaveBeenCalled();
      expect(mockRedis.delByPattern).toHaveBeenCalledWith("circles:list:*");
    });
  });

  describe("getDetail", () => {
    it("返回圈子详情含成员状态", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({
        id: "c1", name: "国学圈", owner: { id: "u1", nickname: "圈主" },
        _count: { posts: 5, articles: 3, courses: 2 },
      });
      mockPrisma.circleMember.findUnique.mockResolvedValue({ userId: "u3", role: "MEMBER" });
      const result = await svc.getDetail("c1", "u3");
      expect(result).toHaveProperty("membership");
      expect(result.membership.role).toBe("MEMBER");
    });

    it("圈子不存在时抛 NotFoundException", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue(null);
      await expect(svc.getDetail("c99")).rejects.toThrow(BusinessException);
    });

    it("缓存命中直接返回", async () => {
      const cached = { id: "c1", name: "国学圈" };
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.getDetail("c1");
      expect(result).toEqual(cached);
      expect(mockPrisma.circle.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("listCircles", () => {
    it("返回分页圈子列表", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.circle.findMany.mockResolvedValue([{ id: "c1", name: "国学圈" }]);
      mockPrisma.circle.count.mockResolvedValue(10);
      const result = await svc.listCircles({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("circles");
      expect(result.circles).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(mockPrisma.circle.findMany.mock.calls.at(-1)![0].where.id).toEqual({
        notIn: [...PUBLIC_QUARANTINED_IDS.circle],
      });
    });
  });

  describe("getAnnouncementById", () => {
    it("无置顶公告时仍返回最新公告 ID，供已读上报使用", async () => {
      mockPrisma.circleAnnouncement.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "a2", circleId: "c1", content: "普通公告", updatedAt: new Date("2026-09-22T08:00:00Z") });
      await expect(svc.getAnnouncement("c1")).resolves.toHaveProperty("id", "a2");
    });

    it("按圈子和公告 ID 同时限定，避免跨圈读取", async () => {
      mockPrisma.circleAnnouncement.findFirst.mockResolvedValue({ id: "a1", circleId: "c1", content: "公告正文" });
      await expect(svc.getAnnouncementById("c1", "a1")).resolves.toHaveProperty("content", "公告正文");
      expect(mockPrisma.circleAnnouncement.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "a1", circleId: "c1" },
      }));
    });

    it("不属于该圈子的公告返回不存在", async () => {
      mockPrisma.circleAnnouncement.findFirst.mockResolvedValue(null);
      await expect(svc.getAnnouncementById("c2", "a1")).rejects.toThrow(BusinessException);
    });

    it("只读取当前成员本人在该圈公告的已读状态", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ circleId: "c1", userId: "u1" });
      mockPrisma.circleAnnouncement.findFirst.mockResolvedValue({ id: "a1" });
      mockPrisma.circleAnnouncementRead.findUnique.mockResolvedValue({ id: "r1" });
      await expect(svc.getAnnouncementReadStatus("c1", "a1", "u1")).resolves.toEqual({ isRead: true });
      expect(mockPrisma.circleAnnouncementRead.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { announcementId_userId: { announcementId: "a1", userId: "u1" } },
      }));
    });

    it("非成员或跨圈公告无法查询个人已读状态", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.getAnnouncementReadStatus("c1", "a1", "u1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.circleAnnouncementRead.findUnique).not.toHaveBeenCalled();
      mockPrisma.circleMember.findUnique.mockResolvedValue({ circleId: "c1", userId: "u1" });
      mockPrisma.circleAnnouncement.findFirst.mockResolvedValue(null);
      await expect(svc.getAnnouncementReadStatus("c1", "other", "u1")).rejects.toThrow(BusinessException);
      expect(mockPrisma.circleAnnouncementRead.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("join", () => {
    it("成功加入圈子", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockPrisma.circleMember.create.mockResolvedValue({ id: "m1", circleId: "c1", userId: "u2", role: "MEMBER" });
      mockPrisma.circle.update.mockResolvedValue({});
      const result = await svc.join("c1", "u2");
      expect(result).toHaveProperty("role", "MEMBER");
      expect(mockPrisma.circle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { memberCount: { increment: 1 } } }),
      );
    });

    it("圈子不存在抛 NotFoundException", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue(null);
      await expect(svc.join("c99", "u2")).rejects.toThrow(BusinessException);
    });

    it("重复加入抛 ConflictException", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue({ userId: "u2", role: "MEMBER" });
      await expect(svc.join("c1", "u2")).rejects.toThrow(BusinessException);
    });

    // 治理 TODO#5（2026-07-11）：requireRuleAck 服务端强制
    it("requireRuleAck 未确认圈规：免费加入被拦且不建成员", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockGovernance.assertRuleAck.mockRejectedValueOnce(new Error("RULE_ACK_REQUIRED：请先阅读并确认圈规"));
      await expect(svc.join("c1", "u2")).rejects.toThrow("RULE_ACK_REQUIRED");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
    });
  });

  // 治理 #10 旁路补全（2026-07-11）：邀请码入圈的禁入拦截
  describe("generateInviteCode 免费圈边界", () => {
    it("无到期日的现有邀请码可复用，不重复生成", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ id: "member-1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ type: "FREE" });
      mockPrisma.circleInviteCode.findFirst.mockResolvedValue({ id: "code-1", code: "ABC123" });
      const result = await coreSvc.generateInviteCode("c1", "u1");
      expect(result.code).toBe("ABC123");
      expect(mockPrisma.circleInviteCode.findFirst.mock.calls[0][0].where.OR).toContainEqual({ expiredAt: null });
      expect(mockPrisma.circleInviteCode.create).not.toHaveBeenCalled();
    });

    it("付费圈不生成会绕过付款的入圈码", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ id: "member-1" });
      mockPrisma.circle.findUnique.mockResolvedValue({ type: "YEARLY" });
      await expect(coreSvc.generateInviteCode("c1", "u1")).rejects.toThrow("请分享预览页");
      expect(mockPrisma.circleInviteCode.create).not.toHaveBeenCalled();
    });
  });

  describe("joinByInviteCode 禁入拦截", () => {
    const inviteCode = { id: "ic1", code: "ABC123", circleId: "c1", userId: "inviter", expiredAt: null, maxUses: 0, useCount: 0 };

    it("被移出且禁入者不能靠邀请码绕回", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue(inviteCode);
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockPrisma.circleViolation.findFirst.mockResolvedValueOnce({ id: "v1" });
      await expect(coreSvc.joinByInviteCode("ABC123", "banned-user")).rejects.toThrow("限制重新加入");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
      // 查询限定 REMOVE ACTIVE（禁入态）
      expect(mockPrisma.circleViolation.findFirst.mock.calls[0][0].where).toMatchObject({
        circleId: "c1", userId: "banned-user", type: "REMOVE", status: "ACTIVE",
      });
    });

    it("无禁入记录：邀请码正常入圈", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue(inviteCode);
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockPrisma.circleMember.create.mockResolvedValue({ id: "m1" });
      const res = await coreSvc.joinByInviteCode("ABC123", "u9");
      expect(res.success).toBe(true);
      expect(mockPrisma.circleMember.create).toHaveBeenCalled();
      expect(mockPrisma.circleInviteCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: "ic1" }),
      }));
    });

    it("付费圈的邀请码不能绕过付款建成员", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue(inviteCode);
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "PAID" });
      await expect(coreSvc.joinByInviteCode("ABC123", "u9", "c1")).rejects.toThrow("先完成支付");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
    });

    it("邀请链接中的圈子与邀请码不一致时不加入任何圈子", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue(inviteCode);
      await expect(coreSvc.joinByInviteCode("ABC123", "u9", "other-circle")).rejects.toThrow("不属于当前圈子");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
    });

    it("需要确认圈规时，邀请码也不能跳过确认", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue(inviteCode);
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockGovernance.assertRuleAck.mockRejectedValueOnce(new Error("RULE_ACK_REQUIRED"));
      await expect(coreSvc.joinByInviteCode("ABC123", "u9", "c1")).rejects.toThrow("RULE_ACK_REQUIRED");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
    });

    it("限次邀请码在事务内抢占失败时不建成员", async () => {
      mockPrisma.circleInviteCode.findUnique.mockResolvedValue({ ...inviteCode, maxUses: 1 });
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", type: "FREE" });
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      mockPrisma.circleInviteCode.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(coreSvc.joinByInviteCode("ABC123", "u9", "c1")).rejects.toThrow("已过期或已达使用上限");
      expect(mockPrisma.circleMember.create).not.toHaveBeenCalled();
    });
  });

  describe("leave", () => {
    it("成功退出圈子", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ userId: "u2", role: "MEMBER" });
      mockPrisma.circleMember.delete.mockResolvedValue({});
      mockPrisma.circle.update.mockResolvedValue({});
      const result = await svc.leave("c1", "u2");
      expect(result.success).toBe(true);
    });

    it("圈主不能退出", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ userId: "u1", role: "OWNER" });
      await expect(svc.leave("c1", "u1")).rejects.toThrow(BusinessException);
    });

    it("未加入抛 NotFoundException", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.leave("c1", "u2")).rejects.toThrow(BusinessException);
    });
  });

  describe("createPost", () => {
    it("圈成员发帖成功", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ userId: "u2", role: "MEMBER" });
      mockPrisma.post.create.mockResolvedValue({ id: "p1", title: "新帖子", circleId: "c1" });
      mockPrisma.circle.update.mockResolvedValue({});
      const result = await svc.createPost("c1", "u2", { title: "新帖子", content: "内容", type: "TEXT" });
      expect(result.id).toBe("p1");
    });

    it("非成员发帖抛 ForbiddenException", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(
        svc.createPost("c1", "u2", { title: "帖子", content: "内容", type: "TEXT" }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("getPosts", () => {
    it("返回帖子列表按置顶和时间排序", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", title: "置顶帖", isTop: true },
        { id: "p2", title: "普通帖", isTop: false },
      ]);
      mockPrisma.post.count.mockResolvedValue(2);
      const result = await svc.getPosts("c1", {});
      expect(result.posts).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("removeMember", () => {
    it("管理员移除成员成功", async () => {
      mockPrisma.circleMember.findUnique
        .mockResolvedValueOnce({ userId: "u1", role: "OWNER" }) // checkAdmin
        .mockResolvedValueOnce({ userId: "u3", role: "MEMBER" }); // target
      mockPrisma.circleMember.delete.mockResolvedValue({});
      mockPrisma.circle.update.mockResolvedValue({});
      const result = await svc.removeMember("c1", "u1", "u3");
      expect(result.success).toBe(true);
    });

    it("非管理员无法移除", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.removeMember("c1", "u2", "u3")).rejects.toThrow(BusinessException);
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("listCircles: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.circle.count.mockResolvedValue(0);
      await svc.listCircles({ page: "abc" as any, pageSize: 10 });
      const arg = mockPrisma.circle.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
    });
  });
});
