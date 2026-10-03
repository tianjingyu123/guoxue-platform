import { RecommendScene } from "./recommend.dto";
import { RecommendService } from "./recommend.service";

describe("RecommendService tracking", () => {
  const prisma = {
    recommendLog: {
      createMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const redis = {
    getJson: jest.fn(),
    setJson: jest.fn().mockResolvedValue(undefined),
  };
  let service: RecommendService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecommendService(
      prisma as any,
      redis as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("只接受服务端追踪上下文中的条目，并写入真实场景、策略与实验组", async () => {
    redis.getJson.mockResolvedValue({
      userId: "user-1",
      scene: "product_detail",
      abTests: [{ experimentId: "ab_1", group: "experiment", bucket: 8 }],
      items: {
        "PRODUCT:p1": { strategies: ["cross-sell"], position: 0 },
      },
    });
    prisma.recommendLog.createMany.mockResolvedValue({ count: 2 });

    const result = await service.logInteractions({
      recommendId: "rec_12345678",
      interactions: [
        { itemId: "p1", itemType: "PRODUCT", position: 99, action: "IMPRESSION" },
        { itemId: "p1", itemType: "PRODUCT", position: 0, action: "IMPRESSION" },
        { itemId: "p1", itemType: "PRODUCT", position: 99, action: "CLICK" },
        { itemId: "spoof", itemType: "PRODUCT", position: 1, action: "CLICK" },
      ],
    }, "user-1");

    expect(result).toEqual({ success: true, accepted: 2 });
    expect(prisma.recommendLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user-1",
          scene: "product_detail",
          strategy: "cross-sell|ab:ab_1:experiment",
          isClick: false,
          position: 0,
        }),
        expect.objectContaining({
          userId: "user-1",
          scene: "product_detail",
          strategy: "cross-sell|ab:ab_1:experiment",
          isClick: true,
          position: 0,
        }),
      ],
    });
  });

  it("登录用户不能借用另一用户的推荐批次伪造日志", async () => {
    redis.getJson.mockResolvedValue({
      userId: "owner",
      scene: "guess_like",
      abTests: [],
      items: { "ARTICLE:a1": { strategies: [], position: 0 } },
    });

    const result = await service.logInteractions({
      recommendId: "rec_12345678",
      interactions: [{ itemId: "a1", itemType: "ARTICLE", position: 0, action: "CLICK" }],
    }, "attacker");

    expect(result).toEqual({ success: true, accepted: 0, ignored: "CONTEXT_MISMATCH" });
    expect(prisma.recommendLog.createMany).not.toHaveBeenCalled();
  });

  it("追踪上下文过期时诚实忽略，不接收客户端自报场景或实验组", async () => {
    redis.getJson.mockResolvedValue(null);
    const result = await service.logInteractions({
      recommendId: "rec_12345678",
      interactions: [{ itemId: "a1", itemType: "ARTICLE", position: 0, action: "CLICK" }],
    });
    expect(result).toEqual({ success: true, accepted: 0, ignored: "CONTEXT_EXPIRED" });
  });

  it("推荐响应保存七天服务端追踪上下文", async () => {
    const response = {
      recommendId: "rec_abcdefgh",
      items: [{
        id: "c1",
        type: "COURSE",
        title: "课程",
        reason: "相关",
        strategies: ["tag-match"],
        score: 1,
      }],
      pagination: { page: 1, pageSize: 6, total: 1 },
      extra: { abTests: [{ experimentId: "ab_2", group: "control", bucket: 88 }] },
    } as any;

    await (service as any).rememberTrackingContext(response, {
      scene: RecommendScene.COURSE_DETAIL,
      userId: "user-2",
      page: 1,
      pageSize: 6,
    });

    expect(redis.setJson).toHaveBeenCalledWith(
      "recommend:tracking:rec_abcdefgh",
      {
        userId: "user-2",
        scene: RecommendScene.COURSE_DETAIL,
        abTests: [{ experimentId: "ab_2", group: "control", bucket: 88 }],
        items: { "COURSE:c1": { strategies: ["tag-match"], position: 0 } },
      },
      7 * 86400,
    );
  });

  it("管理统计严格分开曝光与点击，CTR 不再把点击重复计入曝光分母", async () => {
    prisma.recommendLog.count.mockResolvedValueOnce(100).mockResolvedValueOnce(20);
    prisma.recommendLog.groupBy
      .mockResolvedValueOnce([{ scene: "guess_like", _count: { id: 100 } }])
      .mockResolvedValueOnce([{ scene: "guess_like", _count: { id: 20 } }])
      .mockResolvedValueOnce([{ strategy: "hot", _count: { id: 100 } }])
      .mockResolvedValueOnce([{ strategy: "hot", _count: { id: 20 } }]);
    prisma.recommendLog.findMany.mockResolvedValue([
      { createdAt: new Date("2026-07-20T00:00:00Z"), isClick: false },
      { createdAt: new Date("2026-07-20T00:01:00Z"), isClick: true },
    ]);

    const stats = await service.getRecommendStats({ scene: "guess_like" });
    expect(stats.total).toEqual({ impressions: 100, clicks: 20, ctr: 0.2 });
    expect(stats.dailyTrend[0]).toEqual({
      date: "2026-07-20",
      impressions: 1,
      clicks: 1,
      ctr: 1,
    });
    expect(prisma.recommendLog.count).toHaveBeenNthCalledWith(1, {
      where: { scene: "guess_like", isClick: false },
    });
  });

  it("七日趋势保留管理端筛选区间，不覆盖结束时间", async () => {
    prisma.recommendLog.count.mockResolvedValue(0);
    prisma.recommendLog.groupBy.mockResolvedValue([]);
    prisma.recommendLog.findMany.mockResolvedValue([]);
    const startDate = new Date(Date.now() - 86400000).toISOString();
    const endDate = new Date().toISOString();

    await service.getRecommendStats({ startDate, endDate });

    expect(prisma.recommendLog.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: { createdAt: true, isClick: true },
    });
  });
});
