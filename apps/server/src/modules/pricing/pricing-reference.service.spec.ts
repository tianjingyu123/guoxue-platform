import { Test } from "@nestjs/testing";
import { PricingReferenceService } from "./pricing-reference.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PricingBizType } from "./pricing-reference.dto";

/** 构造课程样本行（含评价与学习人数），仅用于聚合，无任何用户维度 */
function course(price: number, studentCount: number, ratings: number[]) {
  return { price, studentCount, reviews: ratings.map((rating) => ({ rating })) };
}
function product(price: number, salesCount: number, ratings: number[]) {
  return { price, salesCount, reviews: ratings.map((rating) => ({ rating })) };
}

describe("PricingReferenceService（T3 供给侧定价顾问）", () => {
  let service: PricingReferenceService;
  let prisma: { course: { findMany: jest.Mock }; product: { findMany: jest.Mock } };
  let cacheStore: Map<string, unknown>;

  beforeEach(async () => {
    cacheStore = new Map();
    prisma = {
      course: { findMany: jest.fn() },
      product: { findMany: jest.fn() },
    };
    const redis = {
      // 真实缓存语义的 mock：命中直接返回，未命中执行 factory 并写入
      getOrSet: jest.fn(async (key: string, _ttl: number, factory: () => Promise<unknown>) => {
        if (cacheStore.has(key)) return cacheStore.get(key);
        const v = await factory();
        cacheStore.set(key, v);
        return v;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingReferenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(PricingReferenceService);
  });

  it("COURSE 分布聚合：均价/中位/分位/min/max 正确", async () => {
    // 价格 [10,20,30,40,50]
    prisma.course.findMany.mockResolvedValue([
      course(10, 5, [3]),
      course(20, 10, [5, 5]),
      course(30, 100, [4]),
      course(40, 20, []),
      course(50, 200, [4, 4]),
    ]);

    const res = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
    });

    expect(res.sampleSize).toBe(5);
    expect(res.distribution).toEqual({
      avg: 30,
      median: 30,
      min: 10,
      max: 50,
      p25: 20,
      p75: 40,
    });
    expect(res.suggestion.range).toEqual([20, 40]);
    expect(res.suggestion.text).toContain("均价 ¥30");
    expect(res.disclaimer).toContain("不按用户差别定价");
  });

  it("PRODUCT 分布聚合：走 product 表 + status=ON_SALE", async () => {
    prisma.product.findMany.mockResolvedValue([
      product(100, 1, [5]),
      product(200, 2, [4]),
      product(300, 3, [3]),
      product(400, 4, [4]),
      product(500, 5, [5]),
    ]);

    const res = await service.getReference({
      bizType: PricingBizType.PRODUCT,
      categoryLevel1: "文房四宝",
    });

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.course.findMany).not.toHaveBeenCalled();
    expect(res.distribution?.avg).toBe(300);
    expect(res.distribution?.median).toBe(300);
    // 上架态断言
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("ON_SALE");
  });

  it("样本 < 5 时降级：distribution/band 全 null + 谨慎提示", async () => {
    prisma.course.findMany.mockResolvedValue([course(10, 1, [5]), course(20, 2, [4])]);

    const res = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "冷门类目",
    });

    expect(res.sampleSize).toBe(2);
    expect(res.distribution).toBeNull();
    expect(res.qualityBand).toBeNull();
    expect(res.salesBand).toBeNull();
    expect(res.suggestion.range).toBeNull();
    expect(res.suggestion.text).toContain("样本较少");
  });

  it("currentPriceHint 三态判定：LOW / IN_RANGE / HIGH", async () => {
    const rows = [
      course(10, 5, [3]),
      course(20, 10, [5]),
      course(30, 100, [4]),
      course(40, 20, []),
      course(50, 200, [4]),
    ];
    // p25=20, p75=40
    prisma.course.findMany.mockResolvedValue(rows);

    const low = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
      currentPrice: 15,
    });
    const inRange = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
      currentPrice: 30,
    });
    const high = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
      currentPrice: 45,
    });

    expect(low.currentPriceHint).toBe("OFFERED_LOW");
    expect(inRange.currentPriceHint).toBe("IN_RANGE");
    expect(high.currentPriceHint).toBe("OFFERED_HIGH");

    // 未传 currentPrice → null
    const none = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
    });
    expect(none.currentPriceHint).toBeNull();
  });

  it("qualityBand（评分≥4）与 salesBand（销量 top30%）价格带计算", async () => {
    // 价格/学习人数/评价：
    // 10 / 5   / [3]      → 非高评分
    // 20 / 10  / [5,5]    → 高评分
    // 30 / 100 / [4]      → 高评分 + 高销量
    // 40 / 20  / []       → 无评价
    // 50 / 200 / [4,4]    → 高评分 + 高销量
    prisma.course.findMany.mockResolvedValue([
      course(10, 5, [3]),
      course(20, 10, [5, 5]),
      course(30, 100, [4]),
      course(40, 20, []),
      course(50, 200, [4, 4]),
    ]);

    const res = await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
    });

    // 高评分价格 {20,30,50}
    expect(res.qualityBand).toEqual({ min: 20, max: 50 });
    // 销量阈值 p0.7 ≈ 84，命中 {price30(100), price50(200)}
    expect(res.salesBand).toEqual({ min: 30, max: 50 });
  });

  it("【R2 合规】聚合 where 只含类目/上架/软删/价格维度，绝无任何用户维度", async () => {
    prisma.course.findMany.mockResolvedValue([
      course(10, 5, [3]),
      course(20, 10, [5]),
      course(30, 100, [4]),
      course(40, 20, [4]),
      course(50, 200, [4]),
    ]);

    await service.getReference({
      bizType: PricingBizType.COURSE,
      categoryLevel1: "国学经典",
      categoryLevel2: "论语",
      currentPrice: 30,
    });

    const where = prisma.course.findMany.mock.calls[0][0].where as Record<string, unknown>;
    const keys = Object.keys(where);

    // 只允许出现这些字段
    const allowed = new Set(["categoryLevel1", "categoryLevel2", "auditStatus", "deletedAt", "price"]);
    for (const k of keys) {
      expect(allowed.has(k)).toBe(true);
    }

    // 显式断言：绝对不含任何用户/购买者/消费能力维度（禁大数据杀熟红线）
    const forbidden = [
      "userId", "buyerId", "buyer", "user", "wealth", "segment",
      "income", "vipLevel", "memberLevel", "profile", "consumption",
    ];
    for (const f of forbidden) {
      expect(keys).not.toContain(f);
    }
    const serialized = JSON.stringify(where);
    for (const f of forbidden) {
      expect(serialized).not.toContain(f);
    }
  });

  it("类目分布缓存命中：同类目二次请求不再查库", async () => {
    prisma.course.findMany.mockResolvedValue([
      course(10, 5, [3]),
      course(20, 10, [5]),
      course(30, 100, [4]),
      course(40, 20, [4]),
      course(50, 200, [4]),
    ]);

    await service.getReference({ bizType: PricingBizType.COURSE, categoryLevel1: "国学经典" });
    // 不同 currentPrice，但类目相同 → 命中缓存
    await service.getReference({ bizType: PricingBizType.COURSE, categoryLevel1: "国学经典", currentPrice: 99 });

    expect(prisma.course.findMany).toHaveBeenCalledTimes(1);
  });
});
