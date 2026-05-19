import { Test } from "@nestjs/testing";
import { MarketingService } from "./marketing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const makeMockPrisma = () => {
  const mock: any = {
    $transaction: jest.fn((arg: any) => {
      if (typeof arg === "function") return arg(mock);
      return Promise.all(arg);
    }),
    flashSale: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(), count: jest.fn(),
    },
    flashSaleItem: {
      create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    groupBuy: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
    groupBuyParticipant: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    couponTemplate: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
    couponRecord: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    discountActivity: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(), count: jest.fn(),
    },
    marketingPage: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(),
    },
    marketingPageComponent: {
      create: jest.fn(), findFirst: jest.fn(), update: jest.fn(),
      delete: jest.fn(),
    },
    configVersion: { create: jest.fn(), findMany: jest.fn() },
    activity: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
    fullReductionRule: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(), count: jest.fn(),
    },
  };
  return mock;
};

describe("MarketingService", () => {
  let svc: MarketingService;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = makeMockPrisma();
    const mod = await Test.createTestingModule({
      providers: [
        MarketingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(MarketingService);
  });

  beforeEach(() => {
    const fresh = makeMockPrisma();
    Object.assign(mockPrisma, fresh);
  });

  // ─── 秒杀管理 ───

  describe("createFlashSale", () => {
    it("创建秒杀成功", async () => {
      mockPrisma.flashSale.create.mockResolvedValue({ id: "fs1", items: [] });
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1", items: [] });
      const result: any = await svc.createFlashSale({ name: "测试秒杀", startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-02T00:00:00Z" });
      expect(result.id).toBe("fs1");
    });

    it("开始时间晚于结束时间抛出异常", async () => {
      await expect(svc.createFlashSale({ name: "测试秒杀", startTime: "2026-06-02T00:00:00Z", endTime: "2026-06-01T00:00:00Z" })).rejects.toThrow(BusinessException);
    });
  });

  describe("listFlashSales", () => {
    it("分页查询秒杀列表", async () => {
      mockPrisma.flashSale.findMany.mockResolvedValue([]);
      mockPrisma.flashSale.count.mockResolvedValue(0);
      const result = await svc.listFlashSales({});
      expect(result.items).toHaveLength(0);
    });
  });

  describe("updateFlashSale", () => {
    it("更新秒杀成功", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1", startTime: new Date("2026-06-01"), endTime: new Date("2026-06-02") });
      mockPrisma.flashSale.update.mockResolvedValue({ id: "fs1", items: [] });
      const result: any = await svc.updateFlashSale("fs1", { warmupMinutes: 10 });
      expect(result.id).toBe("fs1");
    });

    it("秒杀不存在抛出异常", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue(null);
      await expect(svc.updateFlashSale("invalid", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteFlashSale", () => {
    it("删除秒杀成功", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1" });
      mockPrisma.flashSale.delete.mockResolvedValue({});
      const result = await svc.deleteFlashSale("fs1");
      expect(result.success).toBe(true);
    });
  });

  describe("addFlashSaleItem", () => {
    it("添加秒杀商品成功", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1" });
      mockPrisma.flashSaleItem.create.mockResolvedValue({ id: "fi1", flashPrice: 9.9 });
      const result = await svc.addFlashSaleItem("fs1", { productId: "p1", flashPrice: 9.9, stock: 100 });
      expect(result.flashPrice).toBe(9.9);
    });

    it("秒杀活动不存在抛出异常", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue(null);
      await expect(svc.addFlashSaleItem("invalid", { productId: "p1", flashPrice: 9.9, stock: 100 })).rejects.toThrow(BusinessException);
    });
  });

  describe("startFlashSale", () => {
    it("启动秒杀成功", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1", items: [{ id: "fi1" }] });
      mockPrisma.flashSale.update.mockResolvedValue({ id: "fs1", status: "ACTIVE", items: [] });
      const result = await svc.startFlashSale("fs1");
      expect(result.status).toBe("ACTIVE");
    });

    it("无商品无法启动", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1", items: [] });
      await expect(svc.startFlashSale("fs1")).rejects.toThrow(BusinessException);
    });
  });

  describe("endFlashSale", () => {
    it("结束秒杀成功", async () => {
      mockPrisma.flashSale.findUnique.mockResolvedValue({ id: "fs1" });
      mockPrisma.flashSale.update.mockResolvedValue({ id: "fs1", status: "ENDED", items: [] });
      const result = await svc.endFlashSale("fs1");
      expect(result.status).toBe("ENDED");
    });
  });

  // ─── 拼团管理 ───

  describe("createGroupBuy", () => {
    it("创建拼团成功", async () => {
      mockPrisma.groupBuy.create.mockResolvedValue({ id: "gb1", groupPrice: 79 });
      const result = await svc.createGroupBuy({ productId: "p1", groupPrice: 79 });
      expect(result.groupPrice).toBe(79);
    });
  });

  describe("getGroupBuyParticipants", () => {
    it("查询拼团参与者", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1" });
      mockPrisma.groupBuyParticipant.findMany.mockResolvedValue([{ id: "p1", userId: "u1" }]);
      const result = await svc.getGroupBuyParticipants("gb1");
      expect(result).toHaveLength(1);
    });
  });

  // ─── 优惠券管理 ───

  describe("createCouponTemplate", () => {
    it("创建优惠券模板成功", async () => {
      mockPrisma.couponTemplate.create.mockResolvedValue({ id: "ct1", name: "新人券", faceValue: 10 });
      const result = await svc.createCouponTemplate({
        name: "新人券", type: "FIXED", faceValue: 10, startTime: "2026-06-01T00:00:00Z", endTime: "2026-07-01T00:00:00Z",
      });
      expect(result.faceValue).toBe(10);
    });

    it("领取时间校验失败", async () => {
      await expect(svc.createCouponTemplate({
        name: "x", type: "FIXED", faceValue: 10, startTime: "2026-07-01T00:00:00Z", endTime: "2026-06-01T00:00:00Z",
      })).rejects.toThrow(BusinessException);
    });
  });

  describe("grantCoupon", () => {
    it("发放优惠券成功", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({ id: "ct1", totalCount: 0, claimedCount: 0 });
      mockPrisma.couponRecord.create.mockResolvedValue({ id: "cr1", couponId: "ct1", userId: "u1", status: "UNUSED" });
      const result = await svc.grantCoupon("ct1", { userId: "u1" });
      expect(result.status).toBe("UNUSED");
    });

    it("已领完抛出异常", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({ id: "ct1", totalCount: 100, claimedCount: 100 });
      await expect(svc.grantCoupon("ct1", { userId: "u1" })).rejects.toThrow(BusinessException);
    });
  });

  describe("batchGrantCoupon", () => {
    it("批量发放优惠券", async () => {
      mockPrisma.couponTemplate.findUnique
        .mockResolvedValueOnce({ id: "ct1", totalCount: 0, claimedCount: 0 })
        .mockResolvedValue({ id: "ct1", claimedCount: 0 });
      mockPrisma.couponTemplate.update.mockResolvedValue({ id: "ct1", claimedCount: 2 });
      mockPrisma.couponRecord.createMany.mockResolvedValue({ count: 2 });
      const result = await svc.batchGrantCoupon("ct1", { userIds: ["u1", "u2"] });
      expect(result.success).toBe(2);
    });
  });

  describe("getCouponRecords", () => {
    it("查询优惠券领取记录", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({ id: "ct1" });
      mockPrisma.couponRecord.findMany.mockResolvedValue([]);
      mockPrisma.couponRecord.count.mockResolvedValue(0);
      const result = await svc.getCouponRecords("ct1", {});
      expect(result.items).toHaveLength(0);
    });
  });

  // ─── 限时折扣 ───

  describe("createDiscount", () => {
    it("创建限时折扣成功", async () => {
      mockPrisma.discountActivity.create.mockResolvedValue({ id: "d1", name: "618大促", discountPct: 80 });
      const result = await svc.createDiscount({
        name: "618大促", discountPct: 80, startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-18T00:00:00Z", productIds: ["p1"],
      });
      expect(result.discountPct).toBe(80);
    });

    it("时间校验失败", async () => {
      await expect(svc.createDiscount({
        name: "x", discountPct: 80, startTime: "2026-06-18T00:00:00Z", endTime: "2026-06-01T00:00:00Z", productIds: ["p1"],
      })).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteDiscount", () => {
    it("删除限时折扣成功", async () => {
      mockPrisma.discountActivity.findUnique.mockResolvedValue({ id: "d1" });
      mockPrisma.discountActivity.delete.mockResolvedValue({});
      const result = await svc.deleteDiscount("d1");
      expect(result.success).toBe(true);
    });
  });

  // ─── 微页面 ───

  describe("createPage", () => {
    it("创建微页面成功", async () => {
      mockPrisma.marketingPage.create.mockResolvedValue({ id: "mp1", name: "首页", route: "/home" });
      const result = await svc.createPage({ name: "首页", route: "/home" });
      expect(result.route).toBe("/home");
    });
  });

  describe("addPageComponent", () => {
    it("添加页面组件成功", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue({ id: "mp1" });
      mockPrisma.marketingPageComponent.create.mockResolvedValue({ id: "c1", type: "banner", title: "横幅" });
      const result = await svc.addPageComponent("mp1", { type: "banner", title: "横幅" });
      expect(result.type).toBe("banner");
    });
  });

  describe("sortPageComponents", () => {
    it("组件排序成功", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue({ id: "mp1" });
      mockPrisma.marketingPageComponent.update.mockResolvedValue({});
      const result = await svc.sortPageComponents("mp1", { componentIds: ["c1", "c2"] });
      expect(result.success).toBe(true);
    });
  });

  describe("publishPage", () => {
    it("发布微页面成功", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue({ id: "mp1", version: 1, components: [] });
      mockPrisma.configVersion.create.mockResolvedValue({});
      mockPrisma.marketingPage.update.mockResolvedValue({ id: "mp1", status: "PUBLISHED" });
      const result = await svc.publishPage("mp1");
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ─── 活动管理 ───

  describe("createActivity", () => {
    it("创建活动成功", async () => {
      mockPrisma.activity.create.mockResolvedValue({ id: "a1", name: "春节活动" });
      const result = await svc.createActivity({
        name: "春节活动", startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-15T00:00:00Z",
      });
      expect(result.name).toBe("春节活动");
    });

    it("关联微页面时校验页面存在", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue(null);
      await expect(svc.createActivity({
        name: "x", startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-15T00:00:00Z", pageId: "invalid",
      })).rejects.toThrow(BusinessException);
    });
  });

  describe("getActivityMetrics", () => {
    it("返回活动指标", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: "a1", metrics: { pv: 100, uv: 50, conversions: 10, revenue: 5000 },
      });
      const result = await svc.getActivityMetrics("a1");
      expect(result.uv).toBe(50);
    });

    it("无指标返回默认值", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({ id: "a1", metrics: null });
      const result = await svc.getActivityMetrics("a1");
      expect(result.pv).toBe(0);
    });
  });

  // ─── 满减送 ───

  describe("createFullReduction", () => {
    it("创建满减送成功", async () => {
      mockPrisma.fullReductionRule.create.mockResolvedValue({ id: "fr1", name: "满100减20", threshold: 100, reduction: 20 });
      const result = await svc.createFullReduction({
        name: "满100减20", threshold: 100, reduction: 20, startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-30T00:00:00Z",
      });
      expect(result.reduction).toBe(20);
    });

    it("减金额不小于满金额抛出异常", async () => {
      await expect(svc.createFullReduction({
        name: "x", threshold: 100, reduction: 100, startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-30T00:00:00Z",
      })).rejects.toThrow(BusinessException);
    });
  });

  describe("getActiveFullReductions", () => {
    it("返回进行中的满减送", async () => {
      mockPrisma.fullReductionRule.findMany.mockResolvedValue([{ id: "fr1", name: "满100减20" }]);
      const result = await svc.getActiveFullReductions();
      expect(result).toHaveLength(1);
    });
  });
});
