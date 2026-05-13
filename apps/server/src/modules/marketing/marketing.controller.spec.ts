import { Test } from "@nestjs/testing";
import { MarketingController } from "./marketing.controller";
import { MarketingService } from "./marketing.service";
import { RolesGuard } from "../../common/roles.guard";

const mockSvc = {
  createFlashSale: jest.fn().mockResolvedValue({ id: "fs1" }),
  listFlashSales: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  updateFlashSale: jest.fn().mockResolvedValue({ id: "fs1" }),
  deleteFlashSale: jest.fn().mockResolvedValue({ success: true }),
  addFlashSaleItem: jest.fn().mockResolvedValue({ id: "fi1", flashPrice: 9.9 }),
  updateFlashSaleItem: jest.fn().mockResolvedValue({ id: "fi1" }),
  deleteFlashSaleItem: jest.fn().mockResolvedValue({ success: true }),
  startFlashSale: jest.fn().mockResolvedValue({ id: "fs1", status: "ACTIVE" }),
  endFlashSale: jest.fn().mockResolvedValue({ id: "fs1", status: "ENDED" }),

  createGroupBuy: jest.fn().mockResolvedValue({ id: "gb1" }),
  listGroupBuys: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  updateGroupBuy: jest.fn().mockResolvedValue({ id: "gb1" }),
  getGroupBuyParticipants: jest.fn().mockResolvedValue([]),

  createCouponTemplate: jest.fn().mockResolvedValue({ id: "ct1", faceValue: 10 }),
  listCouponTemplates: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  updateCouponTemplate: jest.fn().mockResolvedValue({ id: "ct1" }),
  grantCoupon: jest.fn().mockResolvedValue({ id: "cr1", status: "UNUSED" }),
  batchGrantCoupon: jest.fn().mockResolvedValue({ total: 3, success: 3, failed: 0, results: [] }),
  getCouponRecords: jest.fn().mockResolvedValue({ items: [], total: 0 }),

  createDiscount: jest.fn().mockResolvedValue({ id: "d1", discountPct: 80 }),
  listDiscounts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  updateDiscount: jest.fn().mockResolvedValue({ id: "d1" }),
  deleteDiscount: jest.fn().mockResolvedValue({ success: true }),

  createPage: jest.fn().mockResolvedValue({ id: "mp1" }),
  listPages: jest.fn().mockResolvedValue([]),
  updatePage: jest.fn().mockResolvedValue({ id: "mp1" }),
  addPageComponent: jest.fn().mockResolvedValue({ id: "c1", type: "banner" }),
  updatePageComponent: jest.fn().mockResolvedValue({ id: "c1" }),
  deletePageComponent: jest.fn().mockResolvedValue({ success: true }),
  sortPageComponents: jest.fn().mockResolvedValue({ success: true }),
  publishPage: jest.fn().mockResolvedValue({ id: "mp1", status: "PUBLISHED" }),
  getPageVersions: jest.fn().mockResolvedValue([]),

  createActivity: jest.fn().mockResolvedValue({ id: "a1", name: "春节活动" }),
  listActivities: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  updateActivity: jest.fn().mockResolvedValue({ id: "a1" }),
  getActivityMetrics: jest.fn().mockResolvedValue({ pv: 0, uv: 0, conversions: 0, revenue: 0 }),

  createFullReduction: jest.fn().mockResolvedValue({ id: "fr1", name: "满100减20" }),
  updateFullReduction: jest.fn().mockResolvedValue({ id: "fr1" }),
  deleteFullReduction: jest.fn().mockResolvedValue({ success: true }),
  getFullReductions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getFullReduction: jest.fn().mockResolvedValue({ id: "fr1", name: "满100减20" }),
  getActiveFullReductions: jest.fn().mockResolvedValue([]),
};

describe("MarketingController", () => {
  let ctrl: MarketingController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MarketingController],
      providers: [{ provide: MarketingService, useValue: mockSvc }],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MarketingController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ─── 秒杀 ───

  it("POST /marketing/flash-sales — 创建秒杀", async () => {
    const result: any = await ctrl.createFlashSale({ name: "测试秒杀", startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-02T00:00:00Z" });
    expect(result.id).toBe("fs1");
  });

  it("GET /marketing/flash-sales — 秒杀列表", async () => {
    const result = await ctrl.listFlashSales({});
    expect(result.items).toHaveLength(0);
  });

  it("POST /marketing/flash-sales/:id/start — 启动秒杀", async () => {
    const result = await ctrl.startFlashSale("fs1");
    expect(result.status).toBe("ACTIVE");
  });

  it("POST /marketing/flash-sales/:id/end — 结束秒杀", async () => {
    const result = await ctrl.endFlashSale("fs1");
    expect(result.status).toBe("ENDED");
  });

  it("POST /marketing/flash-sales/:id/items — 添加秒杀商品", async () => {
    const result = await ctrl.addFlashSaleItem("fs1", { productId: "p1", flashPrice: 9.9, stock: 100 });
    expect(result.flashPrice).toBe(9.9);
  });

  // ─── 拼团 ───

  it("POST /marketing/group-buys — 创建拼团", async () => {
    const result: any = await ctrl.createGroupBuy({ productId: "p1", groupPrice: 79 });
    expect(result.id).toBe("gb1");
  });

  it("GET /marketing/group-buys/:id/participants — 参与者列表", async () => {
    const result = await ctrl.getGroupBuyParticipants("gb1");
    expect(result).toHaveLength(0);
  });

  // ─── 优惠券 ───

  it("POST /marketing/coupons — 创建优惠券", async () => {
    const result = await ctrl.createCouponTemplate({
      name: "新人券", type: "FIXED", faceValue: 10, startTime: "2026-06-01T00:00:00Z", endTime: "2026-07-01T00:00:00Z",
    });
    expect(result.faceValue).toBe(10);
  });

  it("POST /marketing/coupons/:id/grant — 发放优惠券", async () => {
    const result = await ctrl.grantCoupon("ct1", { userId: "u1" });
    expect(result.status).toBe("UNUSED");
  });

  it("POST /marketing/coupons/:id/batch-grant — 批量发放", async () => {
    const result = await ctrl.batchGrantCoupon("ct1", { userIds: ["u1", "u2", "u3"] });
    expect(result.success).toBe(3);
  });

  it("GET /marketing/coupons/:id/records — 领取记录", async () => {
    const result = await ctrl.getCouponRecords("ct1", {});
    expect(result.items).toHaveLength(0);
  });

  // ─── 限时折扣 ───

  it("POST /marketing/discounts — 创建折扣", async () => {
    const result = await ctrl.createDiscount({
      name: "618大促", discountPct: 80, startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-18T00:00:00Z", productIds: ["p1"],
    });
    expect(result.discountPct).toBe(80);
  });

  it("DELETE /marketing/discounts/:id — 删除折扣", async () => {
    const result = await ctrl.deleteDiscount("d1");
    expect(result.success).toBe(true);
  });

  // ─── 微页面 ───

  it("POST /marketing/pages — 创建微页面", async () => {
    const result: any = await ctrl.createPage({ name: "首页", route: "/home" });
    expect(result.id).toBe("mp1");
  });

  it("GET /marketing/pages — 微页面列表", async () => {
    const result = await ctrl.listPages();
    expect(result).toHaveLength(0);
  });

  it("POST /marketing/pages/:id/components — 添加组件", async () => {
    const result = await ctrl.addPageComponent("mp1", { type: "banner", title: "横幅" });
    expect(result.type).toBe("banner");
  });

  it("POST /marketing/pages/:id/publish — 发布页面", async () => {
    const result = await ctrl.publishPage("mp1");
    expect(result.status).toBe("PUBLISHED");
  });

  // ─── 活动 ───

  it("POST /marketing/activities — 创建活动", async () => {
    const result = await ctrl.createActivity({
      name: "春节活动", startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-15T00:00:00Z",
    });
    expect(result.name).toBe("春节活动");
  });

  it("GET /marketing/activities/:id/metrics — 活动指标", async () => {
    const result = await ctrl.getActivityMetrics("a1");
    expect(result.pv).toBe(0);
  });

  // ─── 满减送 ───

  it("POST /marketing/full-reductions — 创建满减", async () => {
    const result = await ctrl.createFullReduction({
      name: "满100减20", threshold: 100, reduction: 20, startTime: "2026-06-01T00:00:00Z", endTime: "2026-06-30T00:00:00Z",
    });
    expect(result.name).toBe("满100减20");
  });

  it("GET /marketing/full-reductions/active — 有效满减(公开)", async () => {
    const result = await ctrl.getActiveFullReductions();
    expect(result).toHaveLength(0);
  });

  it("GET /marketing/full-reductions/:id — 满减详情", async () => {
    const result = await ctrl.getFullReduction("fr1");
    expect(result.name).toBe("满100减20");
  });
});
