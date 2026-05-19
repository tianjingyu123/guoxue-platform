import { Test, TestingModule } from "@nestjs/testing";
import { AiInsightService } from "./ai-insight.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsService } from "../../common/metrics.service";

const mockPrisma = {
  qualityScoreRecord: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  course: { count: jest.fn() },
  article: { count: jest.fn() },
  product: { count: jest.fn() },
  circle: { count: jest.fn() },
  video: { count: jest.fn() },
  recommendLog: { count: jest.fn() },
  $queryRawUnsafe: jest.fn(),
};

const mockMetrics = {};

describe("AiInsightService", () => {
  let svc: AiInsightService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AiInsightService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();
    svc = mod.get(AiInsightService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getFlywheelOverview", () => {
    it("聚合AI飞轮总览数据", async () => {
      mockPrisma.qualityScoreRecord.aggregate.mockResolvedValue({
        _avg: { overall: 4.2, accuracy: 4.0, completeness: 3.8, readability: 4.5, professionalism: 4.1 },
        _count: { overall: 50 },
      });
      mockPrisma.course.count.mockResolvedValueOnce(30).mockResolvedValueOnce(40);
      mockPrisma.article.count.mockResolvedValueOnce(50).mockResolvedValueOnce(60);
      mockPrisma.product.count.mockResolvedValueOnce(10).mockResolvedValueOnce(20);
      mockPrisma.circle.count.mockResolvedValueOnce(5).mockResolvedValueOnce(10);
      mockPrisma.video.count.mockResolvedValueOnce(8).mockResolvedValueOnce(10);
      mockPrisma.recommendLog.count.mockResolvedValueOnce(1000).mockResolvedValueOnce(120);

      const result = await svc.getFlywheelOverview();

      expect(result.aiQuality.avgOverall).toBe(4.2);
      expect(result.aiQuality.totalScored).toBe(50);
      expect(result.tagCoverage.course).toEqual({ tagged: 30, total: 40, rate: 75 });
      expect(result.recommend.impressions).toBe(1000);
      expect(result.recommend.ctr).toBe(12);
    });
  });

  describe("getQualityTrend", () => {
    it("按天聚合质量评分趋势", async () => {
      const base = new Date("2026-05-15T10:00:00Z");
      mockPrisma.qualityScoreRecord.findMany.mockResolvedValue([
        { createdAt: base, overall: 4, accuracy: 3.5, completeness: 4, readability: 4.5, professionalism: 4, scene: "bazi" },
        { createdAt: new Date(base.getTime() + 86400000), overall: 5, accuracy: 4.5, completeness: 5, readability: 5, professionalism: 5, scene: "qimen" },
      ]);

      const result = await svc.getQualityTrend(7);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2026-05-15");
      expect(result[0].avgOverall).toBe(4);
      expect(result[1].date).toBe("2026-05-16");
      expect(result[1].avgOverall).toBe(5);
    });

    it("无数据时返回空数组", async () => {
      mockPrisma.qualityScoreRecord.findMany.mockResolvedValue([]);
      const result = await svc.getQualityTrend(30);
      expect(result).toEqual([]);
    });
  });

  describe("getCacheStats", () => {
    it("返回缓存统计", async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { scene: "bazi", entries: 10 },
        { scene: "qimen", entries: 5 },
      ]);
      const result = await svc.getCacheStats();
      expect(result.scenes).toHaveLength(2);
    });

    it("查询失败返回空结果", async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error("DB error"));
      const result = await svc.getCacheStats();
      expect(result.scenes).toEqual([]);
    });
  });
});
