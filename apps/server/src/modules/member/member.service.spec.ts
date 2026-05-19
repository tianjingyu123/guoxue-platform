import { Test } from "@nestjs/testing";
import { MemberService } from "./member.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

describe("MemberService", () => {
  let svc: MemberService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      memberConfig: { findMany: jest.fn(), findUnique: jest.fn() },
      memberPurchase: { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops.map(o => typeof o === "function" ? o() : o))),
    };

    const mod = await Test.createTestingModule({
      providers: [
        MemberService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(MemberService);
  });

  describe("getPlans", () => {
    it("返回启用的会员套餐，按价格升序", async () => {
      const plans = [
        { id: "p1", level: "MONTHLY", price: 29, isActive: true },
        { id: "p2", level: "YEARLY", price: 299, isActive: true },
      ];
      prisma.memberConfig.findMany.mockResolvedValue(plans);
      const result = await svc.getPlans();
      expect(result).toEqual(plans);
      expect(prisma.memberConfig.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: "asc" },
      });
    });
  });

  describe("purchase", () => {
    it("购买月卡会员成功", async () => {
      prisma.memberConfig.findUnique.mockResolvedValue({ id: "p1", level: "MONTHLY", price: 29, isActive: true });
      prisma.user.findUnique.mockResolvedValue({ id: "u1", memberLevel: "NONE" });
      prisma.$transaction.mockResolvedValue([{ id: "mp1" }]);

      const result = await svc.purchase("u1", "p1");
      expect(result.level).toBe("MONTHLY");
      expect(result.amount).toBe(29);
      expect(result.expireAt).toBeDefined();
    });

    it("购买终身会员 expireAt 为 null", async () => {
      prisma.memberConfig.findUnique.mockResolvedValue({ id: "p3", level: "LIFETIME", price: 999, isActive: true });
      prisma.user.findUnique.mockResolvedValue({ id: "u1", memberLevel: "NONE" });
      prisma.$transaction.mockResolvedValue([{ id: "mp2" }]);

      const result = await svc.purchase("u1", "p3");
      expect(result.level).toBe("LIFETIME");
      expect(result.expireAt).toBeNull();
    });

    it("套餐已下架时抛出异常", async () => {
      prisma.memberConfig.findUnique.mockResolvedValue(null);
      await expect(svc.purchase("u1", "invalid-plan")).rejects.toThrow(BusinessException);
    });

    it("用户不存在时抛出异常", async () => {
      prisma.memberConfig.findUnique.mockResolvedValue({ id: "p1", level: "MONTHLY", price: 29, isActive: true });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.purchase("u1", "p1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getStatus", () => {
    it("活跃会员返回 isActive=true", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 10);
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "MONTHLY", memberExpire: futureDate });
      const result = await svc.getStatus("u1");
      expect(result.isActive).toBe(true);
      expect(result.memberLevel).toBe("MONTHLY");
    });

    it("过期会员返回 isActive=false, remainingDays=0", async () => {
      const pastDate = new Date(Date.now() - 86400000);
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "MONTHLY", memberExpire: pastDate });
      const result = await svc.getStatus("u1");
      expect(result.isActive).toBe(false);
      expect(result.remainingDays).toBe(0);
    });

    it("终身会员返回 isActive=true, remainingDays=-1", async () => {
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "LIFETIME", memberExpire: null });
      const result = await svc.getStatus("u1");
      expect(result.isActive).toBe(true);
      expect(result.remainingDays).toBe(-1);
    });

    it("非会员返回 isActive=false", async () => {
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null });
      const result = await svc.getStatus("u1");
      expect(result.isActive).toBe(false);
    });
  });

  describe("renew", () => {
    it("续费成功", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", memberLevel: "MONTHLY" });
      prisma.memberConfig.findUnique.mockResolvedValue({ id: "p1", level: "MONTHLY", price: 29, isActive: true });
      prisma.$transaction.mockResolvedValue([{ id: "mp3" }]);

      const result = await svc.renew("u1", "p1");
      expect(result.level).toBe("MONTHLY");
    });

    it("非会员续费抛出异常", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", memberLevel: "NONE" });
      await expect(svc.renew("u1", "p1")).rejects.toThrow(BusinessException);
    });
  });

  describe("grantMember", () => {
    it("管理员授予指定天数会员", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1" });
      prisma.$transaction.mockResolvedValue([]);

      const result = await svc.grantMember("u1", "MONTHLY", 60);
      expect(result.level).toBe("MONTHLY");
      expect(result.expireAt).toBeDefined();
    });
  });

  describe("revokeMember", () => {
    it("管理员撤销会员", async () => {
      const result = await svc.revokeMember("u1");
      expect(result.revoked).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { memberLevel: "NONE", memberExpire: null },
      });
    });
  });

  describe("getAdminPurchases", () => {
    it("分页返回购买记录", async () => {
      prisma.memberPurchase.findMany.mockResolvedValue([{ id: "mp1", userId: "u1" }]);
      prisma.memberPurchase.count.mockResolvedValue(1);
      const result = await svc.getAdminPurchases(1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getMemberStats", () => {
    it("返回会员统计", async () => {
      prisma.user.groupBy.mockResolvedValue([{ memberLevel: "MONTHLY", _count: 5 }]);
      prisma.memberPurchase.aggregate.mockResolvedValue({ _sum: { amount: 1450 } });
      prisma.user.count.mockResolvedValue(5);

      const result = await svc.getMemberStats();
      expect(result.totalMembers).toBe(5);
      expect(result.totalRevenue).toBe(1450);
    });
  });

  describe("getBenefits", () => {
    it("返回会员权益", async () => {
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "MONTHLY", memberExpire: null });
      prisma.memberConfig.findUnique.mockResolvedValue({
        level: "MONTHLY", name: "月度会员", benefits: ["无广告", "优先参与"],
        coinBonus: 100, maxBorrowDays: 14,
      });

      const result = await svc.getBenefits("u1");
      expect(result.level).toBe("MONTHLY");
      expect(result.benefits).toEqual(["无广告", "优先参与"]);
    });

    it("非会员查询权益抛出异常", async () => {
      prisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null });
      await expect(svc.getBenefits("u1")).rejects.toThrow(BusinessException);
    });
  });
});
