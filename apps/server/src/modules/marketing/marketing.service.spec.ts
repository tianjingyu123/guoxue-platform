import { Test } from "@nestjs/testing";
import { MarketingService } from "./marketing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopService } from "../shop/shop.service";
import { ShopCouponService } from "../shop/shop-coupon.service";
import { BusinessException } from "../../common/business.exception";

const mockShop = { createGroupBuyOrder: jest.fn() };
const mockShopCoupon = { grantCoupon: jest.fn(), batchGrantCoupon: jest.fn() };
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
    groupBuyParticipant: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), count: jest.fn() },
    couponTemplate: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), updateMany: jest.fn(), count: jest.fn(),
    },
    couponRecord: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    coupon: { findUnique: jest.fn() },
    userCoupon: { findFirst: jest.fn() },
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
        { provide: ShopService, useValue: mockShop },
        { provide: ShopCouponService, useValue: mockShopCoupon },
      ],
    }).compile();
    svc = mod.get(MarketingService);
  });

  beforeEach(() => {
    const fresh = makeMockPrisma();
    Object.assign(mockPrisma, fresh);
    mockShopCoupon.grantCoupon.mockReset();
    mockShopCoupon.batchGrantCoupon.mockReset();
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

    it("非法 page 参数不产生 skip:NaN", async () => {
      mockPrisma.flashSale.findMany.mockResolvedValue([]);
      mockPrisma.flashSale.count.mockResolvedValue(0);
      await svc.listFlashSales({ page: "abc" as any, pageSize: -5 as any });
      const callArg = mockPrisma.flashSale.findMany.mock.calls[0][0];
      expect(Number.isNaN(callArg.skip)).toBe(false);
      expect(callArg.skip).toBeGreaterThanOrEqual(0);
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

  describe("grantCoupon（券体系已统一→建可核销 UserCoupon）", () => {
    const future = () => new Date(Date.now() + 86_400_000);

    it("发放成功：委托商城发放口建 UserCoupon", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", validEnd: future() });
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null);
      mockShopCoupon.grantCoupon.mockResolvedValue({ id: "uc1", userId: "u1", couponId: "c1", used: false });
      const result = await svc.grantCoupon("c1", { userId: "u1" });
      expect(mockShopCoupon.grantCoupon).toHaveBeenCalledWith("c1", "u1");
      expect(result.used).toBe(false);
    });

    it("券不存在抛出异常（旧模板ID/无效ID）", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      await expect(svc.grantCoupon("c1", { userId: "u1" })).rejects.toThrow(BusinessException);
      expect(mockShopCoupon.grantCoupon).not.toHaveBeenCalled();
    });

    it("券已过期抛出异常", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", validEnd: new Date(Date.now() - 1000) });
      await expect(svc.grantCoupon("c1", { userId: "u1" })).rejects.toThrow(BusinessException);
      expect(mockShopCoupon.grantCoupon).not.toHaveBeenCalled();
    });

    it("幂等：已持有该券未使用则跳过重复发放", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: "c1", status: "ACTIVE", validEnd: future() });
      mockPrisma.userCoupon.findFirst.mockResolvedValue({ id: "uc-existing", used: false });
      const result = await svc.grantCoupon("c1", { userId: "u1" });
      expect(mockShopCoupon.grantCoupon).not.toHaveBeenCalled();
      expect(result.id).toBe("uc-existing");
    });
  });

  describe("batchGrantCoupon（委托商城统一批量发放口）", () => {
    it("批量发放委托 ShopCouponService.batchGrantCoupon", async () => {
      mockShopCoupon.batchGrantCoupon.mockResolvedValue({ granted: 2, skipped: 0 });
      const result = await svc.batchGrantCoupon("c1", { userIds: ["u1", "u2"] });
      expect(mockShopCoupon.batchGrantCoupon).toHaveBeenCalledWith("c1", ["u1", "u2"]);
      expect(result.granted).toBe(2);
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

  // ─── 优惠券中心（用户端·主动领券） ───

  describe("listAvailableCoupons", () => {
    it("只查进行中的上架模板并标记本人已领数", async () => {
      mockPrisma.couponTemplate.findMany.mockResolvedValue([
        {
          id: "ct1", name: "满100减20", type: "FIXED", faceValue: 20, threshold: 100,
          totalCount: 100, claimedCount: 40, validDays: 7, applicableScope: null,
          startTime: new Date("2026-01-01"), endTime: new Date("2099-01-01"),
        },
        {
          id: "ct2", name: "不限量券", type: "PERCENT", faceValue: 0.9, threshold: null,
          totalCount: 0, claimedCount: 5, validDays: 30, applicableScope: null,
          startTime: new Date("2026-01-01"), endTime: new Date("2099-01-01"),
        },
      ]);
      mockPrisma.couponRecord.groupBy.mockResolvedValue([{ couponId: "ct1", _count: { _all: 1 } }]);

      const result = await svc.listAvailableCoupons("u1");

      // 过滤条件：ACTIVE + 领取时间窗
      const where = mockPrisma.couponTemplate.findMany.mock.calls[0][0].where;
      expect(where.status).toBe("ACTIVE");
      expect(where.startTime.lte).toBeInstanceOf(Date);
      expect(where.endTime.gte).toBeInstanceOf(Date);

      expect(result.items).toHaveLength(2);
      const [c1, c2] = result.items;
      expect(c1.remaining).toBe(60);
      expect(c1.claimed).toBe(1);
      expect(c1.claimable).toBe(false); // 每人限领1张，已领1张 → 不可再领
      expect(c2.remaining).toBeNull(); // totalCount=0 不限量
      expect(c2.claimed).toBe(0);
      expect(c2.claimable).toBe(true);
    });
  });

  describe("claimCouponTemplate", () => {
    const activeTemplate = {
      id: "ct1", name: "满100减20", type: "FIXED", faceValue: 20, threshold: 100,
      totalCount: 100, claimedCount: 40, validDays: 7, status: "ACTIVE",
      startTime: new Date("2026-01-01"), endTime: new Date("2099-01-01"),
    };

    it("领取成功返回券记录 couponId", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue(activeTemplate);
      mockPrisma.couponRecord.count.mockResolvedValue(0);
      mockPrisma.couponTemplate.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.couponRecord.create.mockResolvedValue({
        id: "cr1", couponId: "ct1", userId: "u1", status: "UNUSED", claimedAt: new Date("2026-07-02"),
      });

      const result = await svc.claimCouponTemplate("u1", "ct1");

      expect(result.couponId).toBe("cr1");
      expect(result.expiresAt).toEqual(new Date(new Date("2026-07-02").getTime() + 7 * 86_400_000));
      // 原子 CAS：条件更新仅剩余>0 时扣减
      expect(mockPrisma.couponTemplate.updateMany).toHaveBeenCalledWith({
        where: { id: "ct1", claimedCount: { lt: 100 } },
        data: { claimedCount: { increment: 1 } },
      });
      // 与 grant 同一创建路径
      expect(mockPrisma.couponRecord.create).toHaveBeenCalledWith({
        data: { couponId: "ct1", userId: "u1", status: "UNUSED" },
      });
    });

    it("库存耗尽（条件更新未命中）拒绝领取", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue(activeTemplate);
      mockPrisma.couponRecord.count.mockResolvedValue(0);
      mockPrisma.couponTemplate.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow("优惠券已抢完");
      expect(mockPrisma.couponRecord.create).not.toHaveBeenCalled();
    });

    it("超每人限领拒绝领取", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue(activeTemplate);
      mockPrisma.couponRecord.count.mockResolvedValue(1);
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow("已达领取上限");
      expect(mockPrisma.couponTemplate.updateMany).not.toHaveBeenCalled();
    });

    it("领取期已结束拒绝领取", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({
        ...activeTemplate, startTime: new Date("2025-01-01"), endTime: new Date("2025-02-01"),
      });
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow("活动已结束");
    });

    it("活动未开始拒绝领取", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({
        ...activeTemplate, startTime: new Date("2099-01-01"), endTime: new Date("2099-02-01"),
      });
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow("活动未开始");
    });

    it("非 ACTIVE 状态模板拒绝领取", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue({ ...activeTemplate, status: "DRAFT" });
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow(BusinessException);
    });

    it("模板不存在抛出异常", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue(null);
      await expect(svc.claimCouponTemplate("u1", "nope")).rejects.toThrow("优惠券模板不存在");
    });

    it("并发双击唯一约束冲突（P2002）转已达领取上限", async () => {
      mockPrisma.couponTemplate.findUnique.mockResolvedValue(activeTemplate);
      mockPrisma.couponRecord.count.mockResolvedValue(0);
      mockPrisma.couponTemplate.updateMany.mockResolvedValue({ count: 1 });
      const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      mockPrisma.couponRecord.create.mockRejectedValue(p2002);
      await expect(svc.claimCouponTemplate("u1", "ct1")).rejects.toThrow("已达领取上限");
    });
  });

  describe("getMyCoupons", () => {
    it("返回我的券并派生时间过期为 EXPIRED，支持状态筛选", async () => {
      const tpl = { name: "满100减20", type: "FIXED", faceValue: 20, threshold: 100, validDays: 7, applicableScope: null };
      mockPrisma.couponRecord.findMany.mockResolvedValue([
        { id: "cr1", couponId: "ct1", userId: "u1", status: "UNUSED", usedAt: null, claimedAt: new Date(), coupon: tpl },
        { id: "cr2", couponId: "ct1", userId: "u1", status: "UNUSED", usedAt: null, claimedAt: new Date("2020-01-01"), coupon: tpl },
        { id: "cr3", couponId: "ct1", userId: "u1", status: "USED", usedAt: new Date(), claimedAt: new Date(), coupon: tpl },
      ]);

      const all = await svc.getMyCoupons("u1", {});
      expect(all.total).toBe(3);
      expect(all.items.map((i) => i.status)).toEqual(["UNUSED", "EXPIRED", "USED"]);
      expect(all.items[0].name).toBe("满100减20");
      expect(all.items[0].faceValue).toBe(20);
      expect(all.items[0].threshold).toBe(100);
      expect(all.items[0].expiresAt).toBeInstanceOf(Date);

      const unused = await svc.getMyCoupons("u1", { status: "UNUSED" });
      expect(unused.items).toHaveLength(1);
      expect(unused.items[0].id).toBe("cr1");

      const expired = await svc.getMyCoupons("u1", { status: "EXPIRED" });
      expect(expired.items).toHaveLength(1);
      expect(expired.items[0].id).toBe("cr2");
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

  describe("getPublishedPageByRoute", () => {
    it("未配置页面返回 null，C 端使用内建布局且不产生 404", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue(null);
      await expect(svc.getPublishedPageByRoute("home")).resolves.toBeNull();
    });

    it("草稿页面返回 null，不向 C 端泄露未发布配置", async () => {
      mockPrisma.marketingPage.findUnique.mockResolvedValue({ id: "mp1", route: "home", status: "DRAFT", components: [] });
      await expect(svc.getPublishedPageByRoute("home")).resolves.toBeNull();
    });

    it("已发布页面只返回展示时间范围内的组件", async () => {
      const active = { id: "c1", startTime: null, endTime: null };
      const future = { id: "c2", startTime: new Date(Date.now() + 60_000), endTime: null };
      mockPrisma.marketingPage.findUnique.mockResolvedValue({ id: "mp1", route: "home", status: "PUBLISHED", components: [active, future] });
      const result: any = await svc.getPublishedPageByRoute("home");
      expect(result.components).toEqual([active]);
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

  describe("joinGroupBuy（付费拼团）", () => {
    it("开新团：校验通过后委托 shop 用拼团价创建订单，返回 orderId/新 groupId", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", status: "ACTIVE", productId: "p1", skuId: null, groupPrice: 279.3, minMembers: 2 });
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null); // 未参与
      mockShop.createGroupBuyOrder.mockResolvedValue({ id: "gbo1", amount: 279.3 });
      const res: any = await svc.joinGroupBuy("u1", "gb1");
      expect(res.orderId).toBe("gbo1");
      expect(res.amount).toBe(279.3);
      expect(res.groupId).toBeTruthy(); // 新团 uuid
      const arg = mockShop.createGroupBuyOrder.mock.calls.at(-1)[1];
      expect(arg.groupPrice).toBe(279.3);
      expect(arg.groupBuyId).toBe("gb1");
    });

    it("加入已有团：未满则创建订单", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", status: "ACTIVE", productId: "p1", skuId: null, groupPrice: 279.3, minMembers: 3 });
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.groupBuyParticipant.count.mockResolvedValue(1); // 团内1人 < 3
      mockShop.createGroupBuyOrder.mockResolvedValue({ id: "gbo2", amount: 279.3 });
      const res: any = await svc.joinGroupBuy("u2", "gb1", "g-existing");
      expect(res.orderId).toBe("gbo2");
      expect(res.groupId).toBe("g-existing");
    });

    it("已参与（WAITING/SUCCESS）则拒绝", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", status: "ACTIVE", productId: "p1", groupPrice: 279.3, minMembers: 2 });
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue({ id: "p", status: "WAITING" });
      await expect(svc.joinGroupBuy("u1", "gb1")).rejects.toThrow(BusinessException);
    });

    it("加入已满团则拒绝", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", status: "ACTIVE", productId: "p1", groupPrice: 279.3, minMembers: 2 });
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.groupBuyParticipant.count.mockResolvedValue(2); // 已满
      await expect(svc.joinGroupBuy("u3", "gb1", "g-full")).rejects.toThrow(BusinessException);
    });

    it("非 ACTIVE 活动拒绝参与", async () => {
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", status: "ENDED", productId: "p1", groupPrice: 279.3, minMembers: 2 });
      await expect(svc.joinGroupBuy("u1", "gb1")).rejects.toThrow(BusinessException);
    });
  });
});
