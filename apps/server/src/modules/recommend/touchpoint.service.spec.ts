import { Test } from "@nestjs/testing";
import { TouchpointService, TOUCHPOINTS } from "./touchpoint.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  configSystem: { findMany: jest.fn() },
  course: { findFirst: jest.fn(), findUnique: jest.fn() },
  courseProgress: { findMany: jest.fn() },
  product: { findFirst: jest.fn() },
  productCategory: { findMany: jest.fn() },
  circle: { findFirst: jest.fn() },
  order: { findMany: jest.fn() },
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
    mockPrisma.productCategory.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
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

  describe("poetry_goods（触-P3 #3 诗词雅物）", () => {
    it("status 已落为 implemented", () => {
      expect(TOUCHPOINTS.poetry_goods.status).toBe("implemented");
    });

    it("雅物类目召回：一级类目命中连带二级子类目·取在售销量第一·reason=「读诗之余·案头雅物」", async () => {
      mockPrisma.productCategory.findMany
        .mockResolvedValueOnce([{ id: "cat-wenchuang" }, { id: "cat-xiangdao" }]) // 关键词命中的类目
        .mockResolvedValueOnce([{ id: "cat-fanbu" }, { id: "cat-xianxiang" }]); // 其二级子类目
      mockPrisma.product.findFirst.mockResolvedValue({
        id: "p-yw1",
        title: "松烟墨锭·文房套装",
        images: ["https://cdn.example.com/yw1.webp"],
      });

      const res = await svc.getTouchpoint("poetry_goods", "u1", "u1");

      expect(res.show).toBe(true);
      expect(res.card).toEqual({
        skuType: "product",
        skuId: "p-yw1",
        title: "松烟墨锭·文房套装",
        reason: "读诗之余·案头雅物",
        cover: "https://cdn.example.com/yw1.webp",
        link: "/pkg-shop/detail?id=p-yw1",
      });
      // 类目条件 = 命中类目 + 子类目并集·在售未删·销量优先
      const args = mockPrisma.product.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({
        status: "ON_SALE",
        deletedAt: null,
        categoryId: { in: ["cat-wenchuang", "cat-xiangdao", "cat-fanbu", "cat-xianxiang"] },
      });
      expect(args.orderBy[0]).toEqual({ salesCount: "desc" });
    });

    it("类目体系未命中时兜底 sceneTags 有任意场景标的商品", async () => {
      mockPrisma.productCategory.findMany.mockResolvedValue([]);
      mockPrisma.product.findFirst.mockResolvedValue({ id: "p-yw2", title: "节气香囊", images: [] });

      const res = await svc.getTouchpoint("poetry_goods", "u1");

      expect(res.show).toBe(true);
      expect(res.card?.skuId).toBe("p-yw2");
      expect(res.card?.cover).toBe("");
      // 只查了一次商品，条件为 sceneTags 非空兜底
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1);
      const args = mockPrisma.product.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ status: "ON_SALE", deletedAt: null, sceneTags: { isEmpty: false } });
    });

    it("类目与兜底均无货时 show:false（相关性硬门槛·宁缺勿滥）", async () => {
      mockPrisma.productCategory.findMany
        .mockResolvedValueOnce([{ id: "cat-wenchuang" }])
        .mockResolvedValueOnce([]);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const res = await svc.getTouchpoint("poetry_goods", "u1");

      expect(res).toEqual({ show: false });
      // 类目召回不中后走了 sceneTags 兜底，共两次商品查询
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe("circle_course（触-P3 #6 圈子课程）", () => {
    it("status 已落为 implemented", () => {
      expect(TOUCHPOINTS.circle_course.status).toBe("implemented");
    });

    it("取圈主 APPROVED 课程销量第一·reason=「圈主的系统课」", async () => {
      mockPrisma.circle.findFirst.mockResolvedValue({ ownerId: "owner-1" });
      mockPrisma.course.findFirst.mockResolvedValue({
        id: "c-owner",
        title: "圈主亲授：周易入门到精通",
        cover: "https://cdn.example.com/c-owner.webp",
      });

      const res = await svc.getTouchpoint("circle_course", "u1", "u1", { circleId: "circle-1", postAuthorId: "u9" });

      expect(res.show).toBe(true);
      expect(res.card).toEqual({
        skuType: "course",
        skuId: "c-owner",
        title: "圈主亲授：周易入门到精通",
        reason: "圈主的系统课",
        cover: "https://cdn.example.com/c-owner.webp",
        link: "/courses/c-owner",
      });
      // 圈按 id 查未删；课按圈主 + APPROVED + 销量第一
      expect(mockPrisma.circle.findFirst.mock.calls[0][0].where).toEqual({ id: "circle-1", deletedAt: null });
      const courseArgs = mockPrisma.course.findFirst.mock.calls[0][0];
      expect(courseArgs.where).toEqual({ userId: "owner-1", auditStatus: "APPROVED", deletedAt: null });
      expect(courseArgs.orderBy).toEqual({ studentCount: "desc" });
    });

    it("圈主无已过审课程时 show:false", async () => {
      mockPrisma.circle.findFirst.mockResolvedValue({ ownerId: "owner-1" });
      mockPrisma.course.findFirst.mockResolvedValue(null);
      const res = await svc.getTouchpoint("circle_course", "u1", "u1", { circleId: "circle-1" });
      expect(res).toEqual({ show: false });
    });

    it("ctx 缺 circleId 或圈不存在时 show:false（不查课程）", async () => {
      const res1 = await svc.getTouchpoint("circle_course", "u1", "u1");
      expect(res1).toEqual({ show: false });

      mockPrisma.circle.findFirst.mockResolvedValue(null);
      const res2 = await svc.getTouchpoint("circle_course", "u2", "u2", { circleId: "circle-gone" });
      expect(res2).toEqual({ show: false });
      expect(mockPrisma.course.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("cert_next_course（触-P3 #9 证书下一课）", () => {
    it("status 已落为 implemented", () => {
      expect(TOUCHPOINTS.cert_next_course.status).toBe("implemented");
    });

    it("取同一级品类销量第一·排除本课与已购·reason=「进阶之路·下一门」", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ categoryLevel1: "易学" });
      mockPrisma.order.findMany.mockResolvedValue([{ targetId: "c-bought" }]);
      mockPrisma.course.findFirst.mockResolvedValue({
        id: "c-next",
        title: "易学进阶：梅花易数",
        cover: "https://cdn.example.com/c-next.webp",
      });

      const res = await svc.getTouchpoint("cert_next_course", "u1", "u1", { courseId: "c-done" });

      expect(res.show).toBe(true);
      expect(res.card).toEqual({
        skuType: "course",
        skuId: "c-next",
        title: "易学进阶：梅花易数",
        reason: "进阶之路·下一门",
        cover: "https://cdn.example.com/c-next.webp",
        link: "/courses/c-next",
      });
      // 同品类 + 排除本课与已购（口径 PAID/COMPLETED 订单）
      const where = mockPrisma.course.findFirst.mock.calls[0][0].where;
      expect(where.categoryLevel1).toBe("易学");
      expect(where.id.notIn).toEqual(expect.arrayContaining(["c-done", "c-bought"]));
      expect(where.auditStatus).toBe("APPROVED");
      expect(mockPrisma.order.findMany.mock.calls[0][0].where).toEqual({
        userId: "u1",
        type: "COURSE",
        status: { in: ["PAID", "COMPLETED"] },
      });
    });

    it("同品类无下一课时 show:false（宁缺勿滥）", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ categoryLevel1: "易学" });
      mockPrisma.course.findFirst.mockResolvedValue(null);
      const res = await svc.getTouchpoint("cert_next_course", "u1", "u1", { courseId: "c-done" });
      expect(res).toEqual({ show: false });
    });

    it("ctx 缺 courseId 或本课无一级品类时 show:false（「同系列」无从谈起）", async () => {
      const res1 = await svc.getTouchpoint("cert_next_course", "u1", "u1");
      expect(res1).toEqual({ show: false });

      mockPrisma.course.findUnique.mockResolvedValue({ categoryLevel1: null });
      const res2 = await svc.getTouchpoint("cert_next_course", "u2", "u2", { courseId: "c-nocat" });
      expect(res2).toEqual({ show: false });
      expect(mockPrisma.course.findFirst).not.toHaveBeenCalled();
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
