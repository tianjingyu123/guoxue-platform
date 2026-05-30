import { Test } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  article: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  user: { count: jest.fn(), findMany: jest.fn() },
  course: { count: jest.fn() },
  circle: { count: jest.fn() },
  classicBook: { count: jest.fn() },
  product: { count: jest.fn() },
  report: { count: jest.fn() },
  like: { count: jest.fn() },
  comment: { count: jest.fn() },
  collect: { count: jest.fn() },
  order: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
  liveRoom: { count: jest.fn() },
  video: { count: jest.fn() },
  content: { count: jest.fn() },
  productSku: { count: jest.fn() },
  post: { groupBy: jest.fn() },
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
};

describe("DashboardService", () => {
  let svc: DashboardService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(DashboardService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getStats", () => {
    it("返回所有统计数据", async () => {
      mockPrisma.article.count.mockResolvedValueOnce(100).mockResolvedValueOnce(10);
      mockPrisma.user.count.mockResolvedValueOnce(50).mockResolvedValueOnce(2).mockResolvedValueOnce(10);
      mockPrisma.course.count.mockResolvedValue(20);
      mockPrisma.circle.count.mockResolvedValue(10);
      mockPrisma.classicBook.count.mockResolvedValue(30);
      mockPrisma.product.count.mockResolvedValue(15);
      mockPrisma.report.count.mockResolvedValue(3);
      mockPrisma.article.aggregate.mockResolvedValue({ _sum: { viewCount: 5000 } });
      mockPrisma.like.count.mockResolvedValue(200);
      mockPrisma.comment.count.mockResolvedValue(150);
      mockPrisma.collect.count.mockResolvedValue(80);
      mockPrisma.order.count.mockResolvedValue(60);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.liveRoom.count.mockResolvedValue(5);
      mockPrisma.video.count.mockResolvedValue(25);
      mockPrisma.productSku.count.mockResolvedValue(5);
      mockPrisma.post.groupBy.mockResolvedValue([]);
      const result = await svc.getStats();
      expect(result.articleCount).toBe(100);
      expect(result.userCount).toBe(50);
      expect(result.totalViews).toBe(5000);
      expect(result.totalLikes).toBe(200);
      expect(result).toHaveProperty("monthNewUsers");
      expect(result).toHaveProperty("monthNewArticles");
    });
  });

  describe("getTrends", () => {
    it("返回30天趋势数据", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ createdAt: new Date() }]);
      mockPrisma.article.findMany.mockResolvedValue([]);
      const result = await svc.getTrends();
      expect(result).toHaveProperty("dates");
      expect(result).toHaveProperty("userTrend");
      expect(result).toHaveProperty("articleTrend");
      expect(result.dates.length).toBeGreaterThan(0);
    });
  });

  describe("getCharts", () => {
    it("返回图表数据", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(10);
      mockPrisma.article.findMany.mockResolvedValue([]);
      const result = await svc.getCharts();
      expect(result).toHaveProperty("userGrowth");
      expect(result).toHaveProperty("contentDistribution");
      expect(result).toHaveProperty("topArticles");
    });
  });
});