import { Test } from "@nestjs/testing";
import { TouchpointService, TOUCHPOINTS } from "./touchpoint.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  configSystem: { findMany: jest.fn() },
  course: { findFirst: jest.fn() },
  courseProgress: { findMany: jest.fn() },
  product: { findFirst: jest.fn() },
};
const mockRedis = { incrWithTtl: jest.fn() };

describe("TouchpointService（无痕商业化触点·克制引擎）", () => {
  let svc: TouchpointService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        TouchpointService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(TouchpointService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 默认：首次曝光 + 开关未配置（视为开）
    mockRedis.incrWithTtl.mockResolvedValue({ count: 1, ttl: 86400 });
    mockPrisma.configSystem.findMany.mockResolvedValue([]);
    mockPrisma.courseProgress.findMany.mockResolvedValue([]);
  });

  it("频控：24h 内第二次请求 show:false（不再查开关与 SKU）", async () => {
    mockRedis.incrWithTtl.mockResolvedValue({ count: 2, ttl: 3600 });
    const res = await svc.getTouchpoint("levelup_course", "u1");
    expect(res).toEqual({ show: false });
    expect(mockPrisma.configSystem.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.course.findFirst).not.toHaveBeenCalled();
  });

  it("全局开关配置为 false 时 show:false", async () => {
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "touchpoint.enabled", configValue: "false" },
    ]);
    const res = await svc.getTouchpoint("levelup_course", "u1");
    expect(res).toEqual({ show: false });
    expect(mockPrisma.course.findFirst).not.toHaveBeenCalled();
  });

  it("单触点开关配置为 false 时 show:false", async () => {
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "touchpoint.levelup_course.enabled", configValue: "false" },
    ]);
    const res = await svc.getTouchpoint("levelup_course", "u1");
    expect(res).toEqual({ show: false });
  });

  it("无匹配 SKU 时 show:false（相关性硬门槛·宁缺勿滥）", async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null);
    const res = await svc.getTouchpoint("levelup_course", "u1");
    expect(res).toEqual({ show: false });
  });

  it("levelup_course 正常返回触点卡（排除已学课程·按分类进阶）", async () => {
    mockPrisma.courseProgress.findMany.mockResolvedValue([{ courseId: "learned-1" }]);
    mockPrisma.course.findFirst.mockResolvedValue({
      id: "c1",
      title: "易学进阶：六爻实战",
      cover: "https://cdn.example.com/c1.webp",
      categoryLevel1: "易学",
    });

    const res = await svc.getTouchpoint("levelup_course", "u1", "u1", { category: "易学" });

    expect(res.show).toBe(true);
    expect(res.card).toEqual({
      skuType: "course",
      skuId: "c1",
      title: "易学进阶：六爻实战",
      reason: expect.stringContaining("易学"),
      cover: "https://cdn.example.com/c1.webp",
      link: "/courses/c1",
    });
    // 已学课程被排除、分类条件生效
    const where = mockPrisma.course.findFirst.mock.calls[0][0].where;
    expect(where.id).toEqual({ notIn: ["learned-1"] });
    expect(where.categoryLevel1).toBe("易学");
    expect(where.auditStatus).toBe("APPROVED");
  });

  it("未注册场景 show:false（不消耗频控）", async () => {
    const res = await svc.getTouchpoint("not_a_scene", "u1");
    expect(res).toEqual({ show: false });
    expect(mockRedis.incrWithTtl).not.toHaveBeenCalled();
  });

  it("已登记未实现的场景诚实降级 show:false（如 classic_course）", async () => {
    expect(TOUCHPOINTS.classic_course.status).toBe("pending");
    const res = await svc.getTouchpoint("classic_course", "u1");
    expect(res).toEqual({ show: false });
    expect(mockPrisma.course.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
  });

  describe("jieqi_gift（供-P1 场景取货已接线）", () => {
    it("status 已落为 implemented", () => {
      expect(TOUCHPOINTS.jieqi_gift.status).toBe("implemented");
    });

    it("取「节气时令」在售商品 1 个（销量优先）·reason=「{节气名}·应时雅物」·链接商品详情", async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: "p1",
        title: "冬至暖香礼盒",
        images: ["https://cdn.example.com/p1.webp", "https://cdn.example.com/p1-2.webp"],
      });

      const res = await svc.getTouchpoint("jieqi_gift", "u1", "u1", { term: "冬至" });

      expect(res.show).toBe(true);
      expect(res.card).toEqual({
        skuType: "product",
        skuId: "p1",
        title: "冬至暖香礼盒",
        reason: "冬至·应时雅物",
        cover: "https://cdn.example.com/p1.webp",
        link: "/pkg-shop/detail?id=p1",
      });
      // 召回条件：在售 + 未删 + sceneTags 含「节气时令」·销量优先
      const args = mockPrisma.product.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ status: "ON_SALE", deletedAt: null, sceneTags: { has: "节气时令" } });
      expect(args.orderBy[0]).toEqual({ salesCount: "desc" });
    });

    it("ctx 无节气名时 reason 回落「节气·应时雅物」", async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: "p2", title: "节气香囊", images: [] });
      const res = await svc.getTouchpoint("jieqi_gift", "u1");
      expect(res.show).toBe(true);
      expect(res.card?.reason).toBe("节气·应时雅物");
      expect(res.card?.cover).toBe("");
    });

    it("无「节气时令」在售商品时 show:false（相关性硬门槛·宁缺勿滥）", async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const res = await svc.getTouchpoint("jieqi_gift", "u1", "u1", { term: "小雪" });
      expect(res).toEqual({ show: false });
    });
  });

  it("匿名用户（无 userId）不查已学课程，仍可召回", async () => {
    mockPrisma.course.findFirst.mockResolvedValue({
      id: "c2",
      title: "国学入门",
      cover: null,
      categoryLevel1: null,
    });
    const res = await svc.getTouchpoint("levelup_course", "anon:abc123");
    expect(res.show).toBe(true);
    expect(res.card?.cover).toBe("");
    expect(mockPrisma.courseProgress.findMany).not.toHaveBeenCalled();
  });
});
