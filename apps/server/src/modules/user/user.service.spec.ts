import { Test } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  userRole: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  memberPurchase: {
    findMany: jest.fn(),
  },
};

describe("UserService", () => {
  let svc: UserService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
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
});
