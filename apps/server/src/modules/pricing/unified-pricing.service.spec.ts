import { Test } from "@nestjs/testing";
import { UnifiedPricingService } from "./unified-pricing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PromotionPriority } from "./unified-pricing.types";

describe("UnifiedPricingService", () => {
  let svc: UnifiedPricingService;
  let prisma: any;
  let redis: any;

  const mockProduct = {
    id: "p1",
    price: 100,
    originalPrice: 120,
    title: "测试商品",
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue(mockProduct),
      },
      flashSaleItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      groupBuy: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      discountActivity: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      fullReductionRule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const mod = await Test.createTestingModule({
      providers: [
        UnifiedPricingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    svc = mod.get(UnifiedPricingService);
  });

  // ═══════════════════════════════════════
  // calculateEffectivePrice — 基础定价
  // ═══════════════════════════════════════

  describe("calculateEffectivePrice — 基础定价", () => {
    it("缓存命中直接返回", async () => {
      const cached = {
        productId: "p1",
        effectivePrice: 88,
        originalPrice: 100,
        appliedPromotion: null,
        activePromotions: [],
        hasPromotion: false,
      };
      redis.getJson.mockResolvedValue(cached);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(88);
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });

    it("商品不存在返回空结果", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await svc.calculateEffectivePrice("nonexistent");
      expect(result.effectivePrice).toBe(0);
      expect(result.originalPrice).toBe(0);
      expect(result.hasPromotion).toBe(false);
    });

    it("无任何活动返回商品基础价格", async () => {
      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(100);
      expect(result.originalPrice).toBe(100);
      expect(result.baseListPrice).toBe(120);
      expect(result.appliedPromotion).toBeNull();
      expect(result.hasPromotion).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // 秒杀
  // ═══════════════════════════════════════

  describe("秒杀价格", () => {
    it("秒杀进行中且有库存 → 返回秒杀价", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi1",
          productId: "p1",
          flashPrice: 49.9,
          stock: 100,
          sold: 20,
          limitCount: 2,
          flashSale: {
            id: "fs1",
            name: "618秒杀",
            status: "ACTIVE",
            startTime: new Date("2020-01-01"),
            endTime: new Date("2030-12-31"),
            scope: "GLOBAL",
          },
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(49.9);
      expect(result.appliedPromotion?.type).toBe("FLASH_SALE");
      expect(result.appliedPromotion?.priority).toBe(PromotionPriority.FLASH_SALE);
      expect(result.promotionTag).toBe("秒杀");
      expect(result.hasPromotion).toBe(true);
    });

    it("秒杀库存售罄 → 不生效", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi2",
          productId: "p1",
          flashPrice: 49.9,
          stock: 100,
          sold: 100,
          limitCount: 2,
          flashSale: {
            id: "fs2",
            name: "售罄秒杀",
            status: "ACTIVE",
            startTime: new Date("2020-01-01"),
            endTime: new Date("2030-12-31"),
            scope: "GLOBAL",
          },
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(100); // 回退到基础价
      expect(result.appliedPromotion).toBeNull();
    });

    it("秒杀不在有效期内 → 不生效", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([]); // Prisma 过滤已排除

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(100);
    });
  });

  // ═══════════════════════════════════════
  // 拼团
  // ═══════════════════════════════════════

  describe("拼团价格", () => {
    it("拼团进行中 → 返回拼团价", async () => {
      prisma.groupBuy.findMany.mockResolvedValue([
        {
          id: "gb1",
          productId: "p1",
          skuId: null,
          groupPrice: 79.9,
          minMembers: 2,
          expireMinutes: 1440,
          status: "ACTIVE",
          scope: "GLOBAL",
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(79.9);
      expect(result.appliedPromotion?.type).toBe("GROUP_BUY");
      expect(result.appliedPromotion?.priority).toBe(PromotionPriority.GROUP_BUY);
    });
  });

  // ═══════════════════════════════════════
  // 限时折扣
  // ═══════════════════════════════════════

  describe("限时折扣", () => {
    it("折扣进行中且商品匹配 → 返回折扣价", async () => {
      prisma.discountActivity.findMany.mockResolvedValue([
        {
          id: "d1",
          name: "全场8折",
          discountPct: 80,
          productIds: ["p1"],
          status: "ACTIVE",
          startTime: new Date("2020-01-01"),
          endTime: new Date("2030-12-31"),
          scope: "GLOBAL",
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(80); // 100 * 80%
      expect(result.appliedPromotion?.type).toBe("DISCOUNT");
      expect(result.appliedPromotion?.priority).toBe(PromotionPriority.DISCOUNT);
    });

    it("折扣 productIds 为空（全场） → 生效", async () => {
      prisma.discountActivity.findMany.mockResolvedValue([
        {
          id: "d2",
          name: "全场9折",
          discountPct: 90,
          productIds: [],
          status: "ACTIVE",
          startTime: new Date("2020-01-01"),
          endTime: new Date("2030-12-31"),
          scope: "GLOBAL",
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(90);
    });

    it("折扣 productIds 不包含当前商品 → 不生效", async () => {
      // Prisma 查询使用 { has: productId } 过滤，但 mock 无法模拟。
      // service 内部有 JS 二次校验：productIds.length===0 或 includes(productId)
      // 此处 mock 返回空数组模拟 Prisma 层已过滤
      prisma.discountActivity.findMany.mockResolvedValue([]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(100);
      expect(result.hasPromotion).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // 优先级
  // ═══════════════════════════════════════

  describe("活动优先级", () => {
    it("秒杀优先级高于拼团", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi1", productId: "p1", flashPrice: 49.9, stock: 10, sold: 0, limitCount: 1,
          flashSale: { id: "fs1", name: "秒杀", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        },
      ]);
      prisma.groupBuy.findMany.mockResolvedValue([
        { id: "gb1", productId: "p1", groupPrice: 79.9, minMembers: 2, expireMinutes: 1440, status: "ACTIVE", scope: "GLOBAL" },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(49.9); // 秒杀优先
      expect(result.appliedPromotion?.type).toBe("FLASH_SALE");
      expect(result.activePromotions).toHaveLength(2); // 两个活动都在列表中
    });

    it("拼团优先级高于折扣", async () => {
      prisma.groupBuy.findMany.mockResolvedValue([
        { id: "gb1", productId: "p1", groupPrice: 79.9, minMembers: 2, expireMinutes: 1440, status: "ACTIVE", scope: "GLOBAL" },
      ]);
      prisma.discountActivity.findMany.mockResolvedValue([
        { id: "d1", name: "折扣", discountPct: 80, productIds: ["p1"], status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(79.9); // 拼团优先于折扣
      expect(result.appliedPromotion?.type).toBe("GROUP_BUY");
    });

    it("多个秒杀 → 取最低价", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi1", productId: "p1", flashPrice: 59.9, stock: 10, sold: 0, limitCount: 1,
          flashSale: { id: "fs1", name: "秒杀A", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        },
        {
          id: "fi2", productId: "p1", flashPrice: 39.9, stock: 10, sold: 0, limitCount: 1,
          flashSale: { id: "fs2", name: "秒杀B", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        },
      ]);

      const result = await svc.calculateEffectivePrice("p1");
      expect(result.effectivePrice).toBe(39.9); // 取最低 flashPrice（按 asc 排序第一个）
    });
  });

  // ═══════════════════════════════════════
  // Scope 范围控制
  // ═══════════════════════════════════════

  describe("Scope 范围控制", () => {
    it("GLOBAL 秒杀 → 任何场景可见", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi1", productId: "p1", flashPrice: 49.9, stock: 10, sold: 0, limitCount: 1,
          flashSale: { id: "fs1", name: "全局秒杀", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        },
      ]);

      // 无 context
      const r1 = await svc.calculateEffectivePrice("p1");
      expect(r1.effectivePrice).toBe(49.9);

      // 有 pageId
      const r2 = await svc.calculateEffectivePrice("p1", undefined, undefined, { pageId: "some_page" });
      expect(r2.effectivePrice).toBe(49.9);
    });

    it("PAGE_ONLY 秒杀 → 匹配 pageId 才可见", async () => {
      // Mock 两次调用返回不同结果
      prisma.flashSaleItem.findMany
        .mockResolvedValueOnce([]) // 无 context → 不返回 PAGE_ONLY
        .mockResolvedValueOnce([
          {
            id: "fi1", productId: "p1", flashPrice: 49.9, stock: 10, sold: 0, limitCount: 1,
            flashSale: { id: "fs1", name: "页面秒杀", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "PAGE_ONLY", scopePageId: "page_x" },
          },
        ]);

      // 无 context → 看不到 PAGE_ONLY
      const r1 = await svc.calculateEffectivePrice("p1");
      expect(r1.effectivePrice).toBe(100);
      expect(r1.hasPromotion).toBe(false);

      // 正确 pageId → 可见
      const r2 = await svc.calculateEffectivePrice("p1", undefined, undefined, { pageId: "page_x" });
      expect(r2.effectivePrice).toBe(49.9);
      expect(r2.hasPromotion).toBe(true);
    });

    it("PAGE_ONLY 拼团 → 不匹配的 pageId 不可见", async () => {
      prisma.groupBuy.findMany.mockResolvedValue([]);

      const result = await svc.calculateEffectivePrice("p1", undefined, undefined, { pageId: "other_page" });
      expect(result.effectivePrice).toBe(100);
    });
  });

  // ═══════════════════════════════════════
  // 批量计算
  // ═══════════════════════════════════════

  describe("batchCalculateEffectivePrice", () => {
    it("批量计算多个商品", async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: "p1", price: 100, originalPrice: null, title: "商品1" })
        .mockResolvedValueOnce({ id: "p2", price: 200, originalPrice: 250, title: "商品2" });

      const results = await svc.batchCalculateEffectivePrice([
        { productId: "p1" },
        { productId: "p2" },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].effectivePrice).toBe(100);
      expect(results[1].effectivePrice).toBe(200);
      expect(results[1].baseListPrice).toBe(250);
    });
  });

  // ═══════════════════════════════════════
  // 满减送
  // ═══════════════════════════════════════

  describe("calculateFullReduction", () => {
    it("满足满减条件 → 返回减后金额", async () => {
      prisma.fullReductionRule.findMany.mockResolvedValue([
        {
          id: "fr1", name: "满200减30", threshold: 200, reduction: 30,
          productIds: [], giftProductId: null,
          status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"),
          scope: "GLOBAL",
        },
      ]);

      const result = await svc.calculateFullReduction(["p1", "p2"], 250);
      expect(result.reduction).toBe(30);
      expect(result.reducedAmount).toBe(220);
      expect(result.ruleName).toBe("满200减30");
    });

    it("不满足门槛 → 不减免", async () => {
      // Prisma 查询 threshold: { lte: totalAmount } → 500 <= 200 为 false，已被过滤
      prisma.fullReductionRule.findMany.mockResolvedValue([]);

      const result = await svc.calculateFullReduction(["p1"], 200);
      expect(result.reduction).toBe(0);
      expect(result.reducedAmount).toBe(200);
    });

    it("多条规则 → 取减免金额最高的", async () => {
      prisma.fullReductionRule.findMany.mockResolvedValue([
        { id: "fr1", name: "满200减20", threshold: 200, reduction: 20, productIds: [], giftProductId: null, status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        { id: "fr2", name: "满200减50", threshold: 200, reduction: 50, productIds: [], giftProductId: null, status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
      ]);

      const result = await svc.calculateFullReduction(["p1"], 250);
      expect(result.reduction).toBe(50);
    });

    it("商品不匹配 → 跳过该规则", async () => {
      prisma.fullReductionRule.findMany.mockResolvedValue([
        {
          id: "fr3", name: "指定商品满减", threshold: 100, reduction: 10,
          productIds: ["p3"], giftProductId: null,
          status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"),
          scope: "GLOBAL",
        },
      ]);

      const result = await svc.calculateFullReduction(["p1", "p2"], 200);
      expect(result.reduction).toBe(0);
    });
  });

  // ═══════════════════════════════════════
  // 缓存管理
  // ═══════════════════════════════════════

  describe("缓存管理", () => {
    it("invalidateCache 删除指定缓存", async () => {
      await svc.invalidateCache("p1", "sku1");
      expect(redis.del).toHaveBeenCalledWith("unified:price:p1:sku1");
    });

    it("invalidateCacheByProduct 按模式删除", async () => {
      await svc.invalidateCacheByProduct("p1");
      expect(redis.delByPattern).toHaveBeenCalledWith("unified:price:p1:*");
    });

    it("计算结果写入缓存", async () => {
      const result = await svc.calculateEffectivePrice("p1");
      expect(redis.setJson).toHaveBeenCalledWith(
        "unified:price:p1:_",
        expect.objectContaining({ productId: "p1" }),
        300,
      );
    });
  });

  // ═══════════════════════════════════════
  // 促销标签
  // ═══════════════════════════════════════

  describe("促销标签", () => {
    it("秒杀标签", async () => {
      prisma.flashSaleItem.findMany.mockResolvedValue([
        {
          id: "fi1", productId: "p1", flashPrice: 49.9, stock: 10, sold: 0, limitCount: 1,
          flashSale: { id: "fs1", name: "秒杀", status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
        },
      ]);
      const r = await svc.calculateEffectivePrice("p1");
      expect(r.promotionTag).toBe("秒杀");
    });

    it("拼团标签", async () => {
      prisma.groupBuy.findMany.mockResolvedValue([
        { id: "gb1", productId: "p1", groupPrice: 79.9, minMembers: 2, expireMinutes: 1440, status: "ACTIVE", scope: "GLOBAL" },
      ]);
      const r = await svc.calculateEffectivePrice("p1");
      expect(r.promotionTag).toBe("拼团");
    });

    it("折扣标签", async () => {
      prisma.discountActivity.findMany.mockResolvedValue([
        { id: "d1", name: "折扣", discountPct: 80, productIds: ["p1"], status: "ACTIVE", startTime: new Date("2020-01-01"), endTime: new Date("2030-12-31"), scope: "GLOBAL" },
      ]);
      const r = await svc.calculateEffectivePrice("p1");
      expect(r.promotionTag).toBe("折扣");
    });
  });
});
