import { Test } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { BusinessException } from "../../common/business.exception";

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  userRole: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  memberPurchase: {
    findMany: jest.fn(),
  },
  teacherCertification: { findUnique: jest.fn() },
  article: { count: jest.fn() },
  course: { count: jest.fn() },
  circle: { count: jest.fn() },
  like: { count: jest.fn() },
  collect: { count: jest.fn() },
  follow: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  notification: { createMany: jest.fn(), updateMany: jest.fn() },
  userBehaviorLog: { groupBy: jest.fn(), findMany: jest.fn() },
  order: { aggregate: jest.fn() },
  virtualCoinAccount: { findUnique: jest.fn() },
  circleMember: { count: jest.fn(), deleteMany: jest.fn() },
  courseProgress: { findMany: jest.fn() },
  deviceFingerprint: { findMany: jest.fn() },
  userInterest: { groupBy: jest.fn() },
  searchHistory: { deleteMany: jest.fn() },
  readingProgress: { deleteMany: jest.fn() },
  bookmark: { deleteMany: jest.fn() },
  auditLog: { create: jest.fn() },
  auth: { deleteMany: jest.fn() },
  $transaction: jest.fn().mockImplementation((fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

describe("UserService", () => {
  let svc: UserService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined), moderateImageOrThrow: jest.fn().mockResolvedValue(undefined) } },
        { provide: AuthService, useValue: { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    svc = mod.get(UserService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getUserById", () => {
    it("获取用户成功", async () => {
      const mockUser = {
        id: "u1", nickname: "测试用户", avatar: null, gender: null,
        memberLevel: null, memberExpire: null, createdAt: new Date(),
        roles: [], station: null, operator: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await svc.getUserById("u1");
      expect(result.id).toBe("u1");
      expect(result.nickname).toBe("测试用户");
    });

    it("用户不存在抛出 NotFoundException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getUserById("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("listUsers", () => {
    it("列出用户（无过滤）", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      const result = await svc.listUsers({ page: 1, pageSize: 20 });
      expect(result).toHaveProperty("users");
      expect(result.total).toBe(0);
    });

    it("按关键词搜索", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await svc.listUsers({ page: 1, pageSize: 20, keyword: "测试" });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { nickname: { contains: "测试" } },
              { phone: { contains: "测试" } },
            ],
          }),
        }),
      );
    });

    it("按角色过滤", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await svc.listUsers({ page: 1, pageSize: 20, roleType: "STATION_MASTER" as any });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roles: { some: { roleType: "STATION_MASTER" } },
          }),
        }),
      );
    });

    it("支持分页参数", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await svc.listUsers({ page: 2, pageSize: 10 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe("assignRole", () => {
    it("分配角色成功", async () => {
      mockPrisma.userRole.upsert.mockResolvedValue({ userId: "u1", roleType: "STATION_MASTER", bindId: null });
      const result = await svc.assignRole("u1", "STATION_MASTER" as any);
      expect(result).toBeTruthy();
    });

    it("分配角色带 bindId", async () => {
      mockPrisma.userRole.upsert.mockResolvedValue({ userId: "u1", roleType: "CIRCLE_OWNER", bindId: "c1" });
      const result = await svc.assignRole("u1", "CIRCLE_OWNER" as any, "c1");
      expect(result.bindId).toBe("c1");
    });
  });

  describe("removeRole", () => {
    it("移除角色成功", async () => {
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      const result = await svc.removeRole("u1", "STATION_MASTER" as any);
      expect(result.success).toBe(true);
    });

    it("移除带 bindId 的角色", async () => {
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      await svc.removeRole("u1", "CIRCLE_OWNER" as any, "c1");
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith(
        { where: { userId: "u1", roleType: "CIRCLE_OWNER", bindId: "c1" } },
      );
    });
  });

  describe("getMemberPurchases", () => {
    it("获取会员购买记录", async () => {
      mockPrisma.memberPurchase.findMany.mockResolvedValue([{ id: "mp1", userId: "u1", paidAt: new Date() }]);
      const result = await svc.getMemberPurchases("u1");
      expect(result).toHaveLength(1);
    });

    it("无购买记录时返回空数组", async () => {
      mockPrisma.memberPurchase.findMany.mockResolvedValue([]);
      const result = await svc.getMemberPurchases("u1");
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════ updateProfile ═══════════════════

  describe("updateProfile", () => {
    it("更新完整资料", async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: "u1", nickname: "新昵称", avatar: "av.jpg", bio: "简介", gender: 1,
      });
      const result = await svc.updateProfile("u1", { nickname: "新昵称", avatar: "av.jpg", bio: "简介", gender: 1 });
      expect(result.nickname).toBe("新昵称");
      expect(result.bio).toBe("简介");
    });

    it("部分字段更新", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: "u1", nickname: "张三", avatar: null, bio: "only", gender: 0 });
      const result = await svc.updateProfile("u1", { bio: "only" });
      expect(result.bio).toBe("only");
    });
  });

  // ═══════════════════ updateUserStatus ═══════════════════

  describe("updateUserStatus", () => {
    it("禁用用户", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "张三", status: "ACTIVE" });
      mockPrisma.user.update.mockResolvedValue({ id: "u1", nickname: "张三", status: "DISABLED" });
      const result = await svc.updateUserStatus("u1", "DISABLED");
      expect(result.status).toBe("DISABLED");
    });

    it("启用用户", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "张三", status: "DISABLED" });
      mockPrisma.user.update.mockResolvedValue({ id: "u1", nickname: "张三", status: "ACTIVE" });
      const result = await svc.updateUserStatus("u1", "ACTIVE");
      expect(result.status).toBe("ACTIVE");
    });
  });

  // ═══════════════════ getUserStats ═══════════════════

  describe("getUserStats", () => {
    it("返回全维度统计数据", async () => {
      mockPrisma.article.count.mockResolvedValue(5);
      mockPrisma.course.count.mockResolvedValue(3);
      mockPrisma.circle.count.mockResolvedValue(2);
      mockPrisma.follow.count.mockResolvedValueOnce(50);  // followers count
      mockPrisma.follow.count.mockResolvedValueOnce(20);  // following count
      mockPrisma.like.count.mockResolvedValue(100);
      mockPrisma.collect.count.mockResolvedValue(30);

      const stats = await svc.getUserStats("u1");
      expect(stats.articles).toBe(5);
      expect(stats.courses).toBe(3);
      expect(stats.circles).toBe(2);
      expect(stats.followers).toBe(50);
      expect(stats.following).toBe(20);
      expect(stats.totalLikes).toBe(100);
      expect(stats.totalCollects).toBe(30);
    });
  });

  // ═══════════════════ getPublicProfile（C端公开主页·脱敏） ═══════════════════

  describe("getPublicProfile", () => {
    /** getUserStats 内部依赖的 7 个 count，统一置 0，避免污染断言 */
    function stubStatsCounts() {
      mockPrisma.article.count.mockResolvedValue(0);
      mockPrisma.course.count.mockResolvedValue(0);
      mockPrisma.circle.count.mockResolvedValue(0);
      mockPrisma.follow.count.mockResolvedValue(0);
      mockPrisma.like.count.mockResolvedValue(0);
      mockPrisma.collect.count.mockResolvedValue(0);
    }

    it("只返回公开安全字段，不含手机号/会员等级/角色/状态等敏感信息", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1", nickname: "测试用户", avatar: "a.jpg", bio: "简介",
      });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      stubStatsCounts();

      const res = await svc.getPublicProfile("u1");

      // 断言：select 只请求了公开字段
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { id: true, nickname: true, avatar: true, bio: true },
      });
      // 断言：返回的 profile 不含任何敏感字段
      expect(res.profile).toEqual({
        id: "u1", nickname: "测试用户", avatar: "a.jpg", bio: "简介",
        verified: false, verifiedTitle: undefined,
      });
      expect(res.profile).not.toHaveProperty("phone");
      expect(res.profile).not.toHaveProperty("memberLevel");
      expect(res.profile).not.toHaveProperty("roles");
      expect(res.profile).not.toHaveProperty("status");
      expect(res.profile).not.toHaveProperty("gender");
    });

    it("认证徽章：APPROVED + verifiedTitle 时 verified=true 并带头衔", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "老师", avatar: null, bio: null });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "APPROVED", verifiedTitle: "国学讲师" });
      stubStatsCounts();

      const res = await svc.getPublicProfile("u1");
      expect(res.profile.verified).toBe(true);
      expect(res.profile.verifiedTitle).toBe("国学讲师");
    });

    it("认证徽章：PENDING 或无认证时 verified=false 且不泄露 verifiedTitle", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "老师", avatar: null, bio: null });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue({ status: "PENDING", verifiedTitle: "国学讲师" });
      stubStatsCounts();

      const res = await svc.getPublicProfile("u1");
      expect(res.profile.verified).toBe(false);
      expect(res.profile.verifiedTitle).toBeUndefined();
    });

    it("互相关注：双向 follow 存在时 isMutualFollow=true", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "甲", avatar: null, bio: null });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      stubStatsCounts();
      // 两次 follow.findUnique：viewer→target、target→viewer 均命中
      mockPrisma.follow.findUnique.mockResolvedValueOnce({ id: "f1" }).mockResolvedValueOnce({ id: "f2" });

      const res = await svc.getPublicProfile("u1", "viewer");
      expect(res.isFollowing).toBe(true);
      expect(res.isMutualFollow).toBe(true);
      expect(res.isSelf).toBe(false);
    });

    it("看自己主页 isSelf=true，且不查关注关系", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", nickname: "我", avatar: null, bio: null });
      mockPrisma.teacherCertification.findUnique.mockResolvedValue(null);
      stubStatsCounts();

      const res = await svc.getPublicProfile("u1", "u1");
      expect(res.isSelf).toBe(true);
      expect(res.isFollowing).toBe(false);
      expect(mockPrisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it("用户不存在抛出 BusinessException", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getPublicProfile("nope")).rejects.toThrow(BusinessException);
    });
  });

  // ═══════════════════ 关注/取消关注 ═══════════════════

  describe("follow", () => {
    it("关注成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", status: "ACTIVE" });
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue({ id: "f1", userId: "u1", followedUserId: "u2" });

      const result = await svc.follow("u1", "u2");
      expect(result.userId).toBe("u1");
      expect(result.followedUserId).toBe("u2");
    });

    it("不能关注自己", async () => {
      await expect(svc.follow("u1", "u1")).rejects.toThrow(BusinessException);
    });

    it("目标用户不存在", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.follow("u1", "no-user")).rejects.toThrow(BusinessException);
    });

    it("重复关注抛出错误", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", status: "ACTIVE" });
      mockPrisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      await expect(svc.follow("u1", "u2")).rejects.toThrow(BusinessException);
    });

  });

  describe("unfollow", () => {
    it("取消关注成功", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({ id: "f1", userId: "u1", followedUserId: "u2" });
      mockPrisma.follow.delete.mockResolvedValue({});
      const result = await svc.unfollow("u1", "u2");
      expect(result.success).toBe(true);
    });

    it("未关注时取消返回错误", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      await expect(svc.unfollow("u1", "u2")).rejects.toThrow(BusinessException);
    });
  });

  describe("getFollowers/getFollowing", () => {
    it("获取粉丝列表含分页", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([
        { user: { id: "u2", nickname: "粉丝1", avatar: null } },
      ]);
      mockPrisma.follow.count.mockResolvedValue(1);

      const result = await svc.getFollowers("u1", 1, 20);
      expect(result.followers).toHaveLength(1);
      expect(result.followers[0].nickname).toBe("粉丝1");
    });

    it("获取关注列表含分页", async () => {
      mockPrisma.follow.findMany.mockResolvedValue([
        { followedUser: { id: "u2", nickname: "关注1", avatar: null } },
      ]);
      mockPrisma.follow.count.mockResolvedValue(1);

      const result = await svc.getFollowing("u1", 1, 20);
      expect(result.following).toHaveLength(1);
      expect(result.following[0].nickname).toBe("关注1");
    });
  });

  describe("isFollowing", () => {
    it("已关注返回 true", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      const result = await svc.isFollowing("u1", "u2");
      expect(result.following).toBe(true);
    });

    it("未关注返回 false", async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      const result = await svc.isFollowing("u1", "u2");
      expect(result.following).toBe(false);
    });
  });

  // ═══════════════════ pushByTag ═══════════════════

  describe("pushByTag", () => {
    it("按会员等级推送（无活跃天数筛选）", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await svc.pushByTag("国学", "GOLD", 0, "推送标题", "推送内容");
      expect(result.matchedCount).toBe(2);
      expect(result.tag).toBe("国学");
      expect(result.memberLevel).toBe("GOLD");
    });

    it("按会员等级 + 活跃天数筛选", async () => {
      mockPrisma.userBehaviorLog.groupBy.mockResolvedValue([{ userId: "u1" }]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await svc.pushByTag("国学", "GOLD", 7, "推送标题", "推送内容");
      expect(result.matchedCount).toBe(1);
    });

    it("全部等级推送", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await svc.pushByTag("易经", "ALL", 0, "推送标题", "推送内容");
      expect(result.matchedCount).toBe(3);
    });

    it("无匹配用户时不创建通知", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await svc.pushByTag("不存在", "ALL", 0, "推送标题", "推送内容");
      expect(result.matchedCount).toBe(0);
    });
  });

  // ═══════════════════ batchUpdateStatus ═══════════════════

  describe("batchUpdateStatus", () => {
    it("批量禁用用户", async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 3 });
      const result = await svc.batchUpdateStatus(["u1", "u2", "u3"], "DISABLED");
      expect(result.updated).toBe(3);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["u1", "u2", "u3"] } },
        data: { status: "DISABLED" },
      });
    });

    it("批量启用用户", async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
      const result = await svc.batchUpdateStatus(["u1", "u2"], "ACTIVE");
      expect(result.updated).toBe(2);
    });
  });

  // ═══════════════════ 白名单管理 ═══════════════════

  describe("getWhitelist", () => {
    it("获取白名单（空列表）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      const result = await svc.getWhitelist(1, 20);
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("获取白名单（有数据含分页）", async () => {
      mockRedis.getJson.mockResolvedValue(["u1", "u2", "u3", "u4"]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "用户1", avatar: null, phone: "138****8001", createdAt: new Date() },
        { id: "u2", nickname: "用户2", avatar: null, phone: "138****8002", createdAt: new Date() },
      ]);
      const result = await svc.getWhitelist(1, 2);
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.pageSize).toBe(2);
    });
  });

  describe("addWhitelist", () => {
    it("添加用户到白名单", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockRedis.getJson.mockResolvedValue([]);
      const result = await svc.addWhitelist("u1");
      expect(result.success).toBe(true);
      expect(result.userId).toBe("u1");
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.addWhitelist("no-user")).rejects.toThrow(BusinessException);
    });

    it("重复添加不重复写入", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockRedis.getJson.mockResolvedValue(["u1", "u2"]);
      const result = await svc.addWhitelist("u1");
      expect(result.success).toBe(true);
      expect(mockRedis.setJson).not.toHaveBeenCalled();
    });
  });

  describe("removeWhitelist", () => {
    it("从白名单移除用户", async () => {
      mockRedis.getJson.mockResolvedValue(["u1", "u2"]);
      const result = await svc.removeWhitelist("u1");
      expect(result.success).toBe(true);
      expect(mockRedis.setJson).toHaveBeenCalledWith("admin:whitelist", ["u2"]);
    });

    it("移除不在白名单中的用户", async () => {
      mockRedis.getJson.mockResolvedValue(["u1"]);
      const result = await svc.removeWhitelist("u3");
      expect(result.success).toBe(true);
      expect(mockRedis.setJson).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════ getUserProfile ═══════════════════

  describe("getUserProfile", () => {
    it("返回完整用户画像", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1", nickname: "张三", avatar: null, bio: null, gender: null,
        birthday: new Date("1990-01-01"), phone: "13800138000", email: null,
        status: "ACTIVE", createdAt: new Date(),
      });
      mockPrisma.order.aggregate.mockResolvedValue({ _count: 5, _sum: { amount: 999 } });
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ balance: 300 });
      mockPrisma.circleMember.count.mockResolvedValue(2);
      mockPrisma.courseProgress.findMany.mockResolvedValue([]);
      mockPrisma.userBehaviorLog.findMany.mockResolvedValue([]);
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([]);

      const result = await svc.getUserProfile("u1");
      expect(result.userInfo.id).toBe("u1");
      expect(result.userInfo.birthday).toBe("1990-01");
      expect(result.orderStats.totalOrders).toBe(5);
      expect(result.orderStats.totalAmount).toBe(999);
      expect(result.coinBalance).toBe(300);
      expect(result.circleCount).toBe(2);
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.getUserProfile("no-user")).rejects.toThrow(BusinessException);
    });
  });

  // ═══════════════════ getInterestStats ═══════════════════

  describe("getInterestStats", () => {
    it("返回兴趣品类统计", async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue([
        { interestCategories: ["国学", "八字"] },
        { interestCategories: ["国学", "风水"] },
        { interestCategories: ["八字"] },
      ]);
      mockPrisma.userInterest.groupBy.mockResolvedValue([
        { tag: "国学", _count: { tag: 50 }, _avg: { score: 0.85 } },
      ]);

      const result = await svc.getInterestStats();
      expect(result.totalUsers).toBe(100);
      expect(result.usersWithInterests).toBe(3);
      expect(result.coverageRate).toBe(3);
      expect(result.distribution).toHaveLength(3);
    });

    it("无活跃用户时覆盖率0", async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userInterest.groupBy.mockResolvedValue([]);

      const result = await svc.getInterestStats();
      expect(result.totalUsers).toBe(0);
      expect(result.coverageRate).toBe(0);
    });
  });

  // ═══════════════════ 账户注销 ═══════════════════

  describe("requestAccountDeletion", () => {
    it("申请注销成功进入7天冷静期", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE", deleteRequestedAt: null });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.requestAccountDeletion("u1");
      expect(result.message).toContain("7天冷静期");
      expect(result.scheduledAt).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleteRequestedAt: expect.any(Date) }) }),
      );
    });

    it("用户不存在抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.requestAccountDeletion("no-user")).rejects.toThrow(BusinessException);
    });

    it("已封禁用户无法申请注销", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ status: "DISABLED" });
      await expect(svc.requestAccountDeletion("u1")).rejects.toThrow("已被封禁");
    });
  });

  describe("cancelAccountDeletion", () => {
    it("取消注销申请成功", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deleteRequestedAt: new Date() });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await svc.cancelAccountDeletion("u1");
      expect(result.message).toContain("已取消");
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deleteRequestedAt: null, deleteScheduledAt: null } }),
      );
    });

    it("没有待处理申请时抛出异常", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deleteRequestedAt: null });
      await expect(svc.cancelAccountDeletion("u1")).rejects.toThrow("没有待处理");
    });
  });

  describe("executeAccountDeletion", () => {
    it("执行注销——匿名化数据并清理关联", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deleteRequestedAt: new Date(), status: "ACTIVE" });
      const result = await svc.executeAccountDeletion("u1");
      expect(result.message).toContain("已注销");
    });

    it("用户未申请注销不能执行", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deleteRequestedAt: null, status: "ACTIVE" });
      await expect(svc.executeAccountDeletion("u1")).rejects.toThrow("未申请注销");
    });
  });
});
