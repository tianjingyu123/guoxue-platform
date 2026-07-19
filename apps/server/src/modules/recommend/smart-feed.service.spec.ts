import { SmartFeedService } from "./smart-feed.service";

/**
 * SmartFeedService 时段感知（timeSlot 因子）单测
 *
 * 通过 jest 假时钟固定系统时间（用 UTC 换算 Asia/Shanghai=UTC+8），
 * 断言三个时段各自的内容族权重 ×1.3 生效、响应带 timeSlot 字段、
 * 以及 AI 重排/用户分层原有逻辑不受影响（回归）。
 *
 * 九类信封改造后：feed 会注入 paipan/agent 两张运营固定卡。断言时用 CONTENT_TYPES
 * 过滤出内容卡验证时段/质量/AI 机制，注入卡单独断言存在性，避免与固定卡序耦合。
 */
/** 内容卡类型（排除运营固定卡 paipan/agent 后用于机制断言） */
const CONTENT_TYPES = new Set([
  "video",
  "article",
  "post",
  "course",
  "product",
  "classic",
  "live",
]);
const contentTypes = (items: { type: string }[]) =>
  items.filter((i) => CONTENT_TYPES.has(i.type)).map((i) => i.type);

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
  let redis: any;
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
      // 九类信封新增源（默认空 → 不影响既有分层序，仅验证降级容错）
      video: { findMany: jest.fn().mockResolvedValue([]) },
      liveRoom: { findMany: jest.fn().mockResolvedValue([]) },
      // 内容质量分（创-P1）：默认无评分记录 → 质量因子不生效（既有用例回归不受影响）
      contentQualityScore: { findMany: jest.fn().mockResolvedValue([]) },
    };
    recommend = { personalized: jest.fn().mockResolvedValue([]) };
    // 默认 AI 不可用 → 走降级路径（同样应带时段因子）
    gateway = { chat: jest.fn().mockRejectedValue(new Error("AI 不可用")) };
    // 缓存桩：getOrSet 直接回源（每次实算·保持既有断言行为）；AI 排序缓存恒未命中
    redis = {
      getOrSet: (_k: string, _ttl: number, factory: () => Promise<any>) => factory(),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };
    svc = new SmartFeedService(prisma, recommend, gateway, redis);
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

    it("晚间 17-24 时（上海 20:00）：深度学习族 course ×1.3 置顶，timeSlot=evening", async () => {
      setSystemTimeUtc("2026-07-03T12:00:00Z"); // 上海 20:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("evening");
      // 电子书板块已下线：加权族仅剩 course，置顶后其余保持原序（内容卡序·排除注入的 paipan/agent）
      expect(contentTypes(result.items)).toEqual(["course", "article", "classic"]);
      const courseCard = result.items.find((i) => i.type === "course")!;
      expect(courseCard.score).toBeCloseTo(1.3);
      // 注入运营固定卡存在
      expect(result.items.some((i) => i.type === "paipan")).toBe(true);
      expect(result.items.some((i) => i.type === "agent")).toBe(true);
    });

    it("凌晨 0-5 时顺延晚间（上海 02:00）：timeSlot=evening", async () => {
      setSystemTimeUtc("2026-07-02T18:00:00Z"); // 上海次日 02:00

      const result = await svc.getFeed("u1");

      expect(result.timeSlot).toBe("evening");
      expect(result.items[0].type).toBe("course");
    });
  });

  describe("内容质量排序因子（创-P1·任务八接线）", () => {
    it("高分 article 获质量加权：score = 1×(1+0.3×90/100)×1.3（早间加权族·置顶）", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 上海 08:00 morning
      prisma.contentQualityScore.findMany.mockResolvedValue([
        { targetType: "ARTICLE", targetId: "a1", total: 90 },
      ]);

      const result = await svc.getFeed("u1");

      const article = result.items.find((i) => i.type === "article")!;
      expect(article.score).toBeCloseTo(1 * (1 + 0.3 * 0.9) * 1.3);
      expect(result.items[0].type).toBe("article");
    });

    it("<40 分内容软限流：不删除、不加权、整体沉底（即使属时段加权族）", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 早间 article 本是加权族
      prisma.contentQualityScore.findMany.mockResolvedValue([
        { targetType: "ARTICLE", targetId: "a1", total: 30 },
      ]);

      const result = await svc.getFeed("u1");

      // 仍在列表中（软限流·不删除），但排在所有内容卡的最后（注入的 agent 固定卡可能更靠后）
      expect(result.items.some((i) => i.type === "article")).toBe(true);
      const ct = contentTypes(result.items);
      expect(ct[ct.length - 1]).toBe("article");
    });

    it("质量分查询失败按无因子降级：feed 正常返回、时段排序不受影响", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z");
      prisma.contentQualityScore.findMany.mockRejectedValue(new Error("db"));

      const result = await svc.getFeed("u1");

      expect(result.items[0].type).toBe("article");
      expect(result.items[0].score).toBeCloseTo(1.3);
    });
  });

  describe("原有逻辑回归", () => {
    it("AI 可用时重排逻辑不变：在时段加权后的列表上按 AI 返回序号重排", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 早间·加权后 [article, course, classic]
      gateway.chat.mockResolvedValue({ content: "[2, 1, 3]" });

      const result = await svc.getFeed("u1");

      expect(gateway.chat).toHaveBeenCalledWith(
        expect.objectContaining({ scene: "smart_feed", userId: "u1" }),
      );
      // AI 序号作用于加权后的候选序：2→course, 1→article, 3→classic（内容卡序·排除注入固定卡）
      expect(contentTypes(result.items)).toEqual(["course", "article", "classic"]);
      expect(result.timeSlot).toBe("morning");
    });

    it("用户分层不受时段因子影响：高消费用户仍走 premium feed", async () => {
      setSystemTimeUtc("2026-07-03T00:00:00Z"); // 早间
      prisma.order.count.mockResolvedValue(5); // orderCount>=3 → premium

      const result = await svc.getFeed("u1");

      expect(result.userSegment).toBe("premium");
      expect(result.timeSlot).toBe("morning");
      // premium feed 只含 course/product；早间两者均非加权族，保持原序与基准分（内容卡·排除注入固定卡）
      expect(contentTypes(result.items)).toEqual(["course", "product"]);
      expect(
        result.items.filter((i) => CONTENT_TYPES.has(i.type)).every((i) => i.score === 1),
      ).toBe(true);
    });

    it("分页切片仍生效", async () => {
      setSystemTimeUtc("2026-07-03T12:00:00Z"); // 晚间·内容序 [course, article, classic]（电子书已下线）
      // 注入固定卡后完整序 [course, article, paipan, classic, agent]，第 2 页 size=2 → slice(2,4)
      const result = await svc.getFeed("u1", 2, 2);

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.type)).toEqual(["paipan", "classic"]);
      expect(result.timeSlot).toBe("evening");
    });
  });

  describe("生产内容卫生", () => {
    it("短视频源精确排除播放器联调种子", async () => {
      await svc.getCategoryFeed("video", 1, 6);

      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { id: { startsWith: "demo-video-" } },
          }),
        }),
      );
    });
  });
});
