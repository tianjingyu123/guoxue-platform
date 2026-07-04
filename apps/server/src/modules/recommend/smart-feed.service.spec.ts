import { SmartFeedService } from "./smart-feed.service";

/**
 * SmartFeedService 时段感知（timeSlot 因子）单测
 *
 * 通过 jest 假时钟固定系统时间（用 UTC 换算 Asia/Shanghai=UTC+8），
 * 断言三个时段各自的内容族权重 ×1.3 生效、响应带 timeSlot 字段、
 * 以及 AI 重排/用户分层原有逻辑不受影响（回归）。
 */
describe("SmartFeedService", () => {
  // ─── 数据夹具（新用户 feed 四类各一条） ───
  const mockArticle = { id: "a1", title: "晨读文章", excerpt: "摘要", cover: "" };
  const mockCourse = { id: "c1", title: "易经入门课", intro: "简介", cover: "" };
  const mockClassic = { id: "b1", title: "论语", intro: "古籍", cover: "" };
  const mockEbook = { id: "e1", title: "国学精读", description: "描述", cover: "" };
  const mockProduct = { id: "p1", title: "香道器具", intro: "简介", images: ["img.png"] };

  let prisma: any;
  let recommend: any;
  let gateway: any;
  let svc: SmartFeedService;

  beforeEach(() => {
    prisma = {
      order: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      userInterest: { count: jest.fn().mockResolvedValue(0) },
      post: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: {
        // 刚注册（daysSinceJoin<7）→ 分层 new
        findUnique: jest.fn().mockImplementation(() => Promise.resolve({ createdAt: new Date() })),
      },
      article: { findMany: jest.fn().mockResolvedValue([mockArticle]) },
      course: { findMany: jest.fn().mockResolvedValue([mockCourse]) },
      classicBook: { findMany: jest.fn().mockResolvedValue([mockClassic]) },
      ebook: { findMany: jest.fn().mockResolvedValue([mockEbook]) },
      product: { findMany: jest.fn().mockResolvedValue([mockProduct]) },
    };
    recommend = { personalized: jest.fn().mockResolvedValue([]) };
    // 默认 AI 不可用 → 走降级路径（同样应带时段因子）
    gateway = { chat: jest.fn().mockRejectedValue(new Error("AI 不可用")) };
    svc = new SmartFeedService(prisma, recommend, gateway);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** 固定系统时间（传 UTC 时刻·上海=UTC+8） */
  function setSystemTimeUtc(iso: string) {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  }

  describe("时段因子（AI 降级路径·权重仍生效）", () => {
    it("早间 5-11 时（上海 08:00）：轻内容族 article ×1.3 置顶，timeSlot=morning", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 上海 08:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("morning");
      expect(result.userSegment).toBe("new");
      // 新用户 feed 原序 [article, course, classic, ebook]，article 加权后置顶
      expect(result.items[0].type).toBe("article");
      expect(result.items[0].score).toBeCloseTo(1.3);
      // 非加权族保持基准 1
      const courseItem = result.items.find((i) => i.type === "course")!;
      const classicItem = result.items.find((i) => i.type === "classic")!;
      expect(courseItem.score).toBe(1);
      expect(classicItem.score).toBe(1);
    });

    it("午间 11-17 时（上海 14:00）：诗词古籍族 classic ×1.3 置顶，timeSlot=afternoon", async () => {
      setSystemTimeUtc("2026-07-03T06:00:00Z"); // 上海 14:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("afternoon");
      expect(result.items[0].type).toBe("classic");
      expect(result.items[0].score).toBeCloseTo(1.3);
      const articleItem = result.items.find((i) => i.type === "article")!;
      expect(articleItem.score).toBe(1);
    });

    it("晚间 17-24 时（上海 20:00）：深度学习族 course/ebook ×1.3 置顶，timeSlot=evening", async () => {
      setSystemTimeUtc("2026-07-03T12:00:00Z"); // 上海 20:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("evening");
      // 加权族按原相对顺序稳定置顶：course 在 ebook 前
      expect(result.items.map((i) => i.type)).toEqual(["course", "ebook", "article", "classic"]);
      expect(result.items[0].score).toBeCloseTo(1.3);
      expect(result.items[1].score).toBeCloseTo(1.3);
      expect(result.items[2].score).toBe(1);
    });

    it("凌晨 0-5 时顺延晚间（上海 02:00）：timeSlot=evening", async () => {
      setSystemTimeUtc("2026-07-02T18:00:00Z"); // 上海次日 02:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("evening");
      expect(result.items[0].type).toBe("course");
    });
  });

  describe("原有逻辑回归", () => {
    it("AI 可用时重排逻辑不变：在时段加权后的列表上按 AI 返回序号重排", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 早间·加权后 [article, course, classic, ebook]
      gateway.chat.mockResolvedValue({ content: "[2, 1, 3, 4]" });

      const result = await svc.getFeed("u1");

      expect(gateway.chat).toHaveBeenCalledWith(
        expect.objectContaining({ scene: "smart_feed", userId: "u1" }),
      );
      // AI 序号作用于加权后的候选序：2→course, 1→article
      expect(result.items.map((i) => i.type)).toEqual(["course", "article", "classic", "ebook"]);
      expect(result.timeSlot).toBe("morning");
    });

    it("用户分层不受时段因子影响：高消费用户仍走 premium feed", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 早间
      prisma.order.count.mockResolvedValue(5); // orderCount>=3 → premium

      const result = await svc.getFeed("u1");

      expect(result.userSegment).toBe("premium");
      expect(result.timeSlot).toBe("morning");
      // premium feed 只含 course/product；早间两者均非加权族，保持原序与基准分
      expect(result.items.map((i) => i.type)).toEqual(["course", "product"]);
      expect(result.items.every((i) => i.score === 1)).toBe(true);
    });

    it("分页切片仍生效", async () => {
      setSystemTimeUtc("2026-07-03T12:00:00Z"); // 晚间·序 [course, ebook, article, classic]
      const result = await svc.getFeed("u1", 2, 2);

      expect(result.items.map((i) => i.type)).toEqual(["article", "classic"]);
      expect(result.timeSlot).toBe("evening");
    });
  });
});
