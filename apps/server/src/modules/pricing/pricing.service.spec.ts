import { Test } from "@nestjs/testing";
import { PricingService } from "./pricing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

describe("PricingService", () => {
  let svc: PricingService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      pricingRule: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pricingDemand: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      userBehavior: {
        groupBy: jest.fn(),
      },
    };

    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };

    const mod = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    svc = mod.get(PricingService);
  });

  describe("calculatePrice", () => {
    it("缓存命中直接返回", async () => {
      redis.getJson.mockResolvedValue({ price: 99, ruleName: "测试规则", strategy: "FIXED" });

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(99);
      expect(prisma.pricingRule.findMany).not.toHaveBeenCalled();
    });

    it("无匹配规则返回默认价格", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([]);

      const result = await svc.calculatePrice("course", "c1", undefined, 50);
      expect(result.price).toBe(50);
      expect(result.ruleName).toBe("默认");
      expect(result.strategy).toBe("FIXED");
    });

    it("FIXED策略返回固定价格", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r1", name: "固定价", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "FIXED", basePrice: 199, minPrice: null, maxPrice: null, strategyConfig: {} },
      ]);

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(199);
      expect(result.ruleName).toBe("固定价");
    });

    it("TIME_DISCOUNT时段折扣", async () => {
      const discountConfig = { discountPercent: 80, startHour: 8, endHour: 22 };
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r2", name: "时段折扣", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "TIME_DISCOUNT", basePrice: 200, minPrice: null, maxPrice: null, strategyConfig: discountConfig },
      ]);

      const currentHour = new Date().getHours();
      const result = await svc.calculatePrice("course", "c1");

      if (currentHour >= 8 && currentHour <= 22) {
        expect(result.price).toBe(160);
      } else {
        expect(result.price).toBe(200);
      }
    });

    it("DEMAND_BASED需求定价 HIGH", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r3", name: "需求定价", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "DEMAND_BASED", basePrice: 100, minPrice: null, maxPrice: null,
          strategyConfig: { highMultiplier: 1.5, lowMultiplier: 0.7 } },
      ]);
      prisma.pricingDemand.findFirst.mockResolvedValue({ demandLevel: "HIGH" });

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(150);
    });

    it("DEMAND_BASED需求定价 LOW", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r4", name: "需求定价LOW", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "DEMAND_BASED", basePrice: 100, minPrice: null, maxPrice: null,
          strategyConfig: { highMultiplier: 1.5, lowMultiplier: 0.7 } },
      ]);
      prisma.pricingDemand.findFirst.mockResolvedValue({ demandLevel: "LOW" });

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(70);
    });

    it("价格受minPrice/maxPrice限制", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r5", name: "限价规则", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "FIXED", basePrice: 10, minPrice: 29, maxPrice: 199, strategyConfig: {} },
      ]);

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(29);
    });

    it("匹配指定targetId的规则", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r6", name: "专属价格", targetType: "course", targetIds: ["c1"], isActive: true, priority: 10,
          strategy: "FIXED", basePrice: 399, minPrice: null, maxPrice: null, strategyConfig: {} },
      ]);

      const result = await svc.calculatePrice("course", "c1");
      expect(result.price).toBe(399);
    });

    it("结果缓存到Redis", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([
        { id: "r1", name: "缓存测试", targetType: "course", targetIds: [], isActive: true, priority: 10,
          strategy: "FIXED", basePrice: 199, minPrice: null, maxPrice: null, strategyConfig: {} },
      ]);

      await svc.calculatePrice("course", "c1");
      expect(redis.setJson).toHaveBeenCalledWith(
        "pricing:course:c1",
        expect.objectContaining({ price: 199 }),
        300,
      );
    });
  });

  describe("trackDemand", () => {
    it("统计需求并记录HIGH/MEDIUM/LOW", async () => {
      prisma.userBehavior.groupBy.mockResolvedValue([
        { targetType: "course", _count: 200 },
        { targetType: "article", _count: 50 },
        { targetType: "ebook", _count: 10 },
      ]);
      prisma.pricingDemand.create.mockResolvedValue({});

      await svc.trackDemand();

      expect(prisma.pricingDemand.create).toHaveBeenCalledTimes(3);
      expect(prisma.pricingDemand.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ demandLevel: "HIGH", viewCount24h: 200 }) }),
      );
    });

    it("空结果不记录", async () => {
      prisma.userBehavior.groupBy.mockResolvedValue([]);
      await svc.trackDemand();
      expect(prisma.pricingDemand.create).not.toHaveBeenCalled();
    });
  });

  describe("listRules", () => {
    it("返回定价规则列表", async () => {
      prisma.pricingRule.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
      const result = await svc.listRules();
      expect(result).toHaveLength(2);
    });
  });

  describe("createRule", () => {
    it("创建定价规则", async () => {
      prisma.pricingRule.create.mockResolvedValue({ id: "r1", name: "新规则" });
      const result = await svc.createRule({ name: "新规则", strategy: "FIXED" });
      expect(result.id).toBe("r1");
    });
  });

  describe("updateRule", () => {
    it("更新定价规则", async () => {
      prisma.pricingRule.update.mockResolvedValue({ id: "r1", name: "已更新" });
      const result = await svc.updateRule("r1", { name: "已更新" });
      expect(result.name).toBe("已更新");
    });
  });

  describe("deleteRule", () => {
    it("删除定价规则", async () => {
      prisma.pricingRule.delete.mockResolvedValue({ id: "r1" });
      const result = await svc.deleteRule("r1");
      expect(result.success).toBe(true);
    });
  });

  describe("getDemandHeatmap", () => {
    it("返回需求热力图数据", async () => {
      prisma.pricingDemand.findMany.mockResolvedValue([{ targetType: "course", demandLevel: "HIGH" }]);
      const result = await svc.getDemandHeatmap();
      expect(result).toHaveLength(1);
    });
  });
});
