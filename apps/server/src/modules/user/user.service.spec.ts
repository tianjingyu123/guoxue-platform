import { Test } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

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
  },
  userRole: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  memberPurchase: {
    findMany: jest.fn(),
  },
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
  notification: { createMany: jest.fn() },
  userBehaviorLog: { groupBy: jest.fn() },
};

describe("UserService", () => {
  let svc: UserService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
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
      await expect(svc.getUserById("invalid")).rejects.toThrow(NotFoundException);
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
      mockPrisma.user.update.mockResolvedValue({ id: "u1", nickname: "张三", status: "DISABLED" });
      const result = await svc.updateUserStatus("u1", "DISABLED");
      expect(result.status).toBe("DISABLED");
    });

    it("启用用户", async () => {
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
      await expect(svc.follow("u1", "u1")).rejects.toThrow(BadRequestException);
    });

    it("目标用户不存在", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.follow("u1", "no-user")).rejects.toThrow(NotFoundException);
    });

    it("重复关注抛出错误", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", status: "ACTIVE" });
      mockPrisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      await expect(svc.follow("u1", "u2")).rejects.toThrow(BadRequestException);
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
      await expect(svc.unfollow("u1", "u2")).rejects.toThrow(NotFoundException);
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
});
