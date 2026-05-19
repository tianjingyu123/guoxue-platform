import { Test } from "@nestjs/testing";
import { KnowledgeQualityService } from "./knowledge-quality.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("KnowledgeQualityService", () => {
  let svc: KnowledgeQualityService;
  let prisma: any;

  beforeAll(async () => {
    prisma = {
      circleKnowledge: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _avg: { qualityScore: 0.75 }, _count: 100 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        { sourceType: "classic", avg: 0.85, count: "20" },
        { sourceType: "article", avg: 0.65, count: "50" },
      ]),
    };

    const mod = await Test.createTestingModule({
      providers: [
        KnowledgeQualityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(KnowledgeQualityService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("score — 单条评分", () => {
    it("经典原文获得高分", () => {
      const longClassic = "《论语》学而篇记载：子曰：学而时习之，不亦说乎。有朋自远方来，不亦乐乎。人不知而不愠，不亦君子乎。这段原文出自《论语》开篇，是儒家思想的核心表述之一。";
      const s = svc.score(longClassic, "classic");
      expect(s).toBeGreaterThanOrEqual(0.7);
    });

    it("过短内容得分较低", () => {
      const s = svc.score("国学", "post");
      expect(s).toBeLessThan(0.5);
    });

    it("自由文本得分最低", () => {
      const s = svc.score("随便写的一句话，没有任何引用和结构", "free_text");
      expect(s).toBeLessThan(0.6);
    });

    it("包含大量引用标记的内容得分高", () => {
      const long = "《论语》记载：" + "子曰：学而时习之。".repeat(10);
      const s = svc.score(long, "article");
      expect(s).toBeGreaterThan(0.5);
    });

    it("所有维度在0-1之间", () => {
      const s = svc.score("测试内容" + "x".repeat(500), "post");
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    });
  });

  describe("scoreBatch — 批量评分", () => {
    it("批量评分并更新数据库", async () => {
      prisma.circleKnowledge.findMany.mockResolvedValue([
        { id: "k1", content: "测试内容", sourceType: "article" },
        { id: "k2", content: "经典原文引用《论语》学而篇", sourceType: "classic" },
      ]);

      const count = await svc.scoreBatch(["k1", "k2"]);
      expect(count).toBe(2);
      expect(prisma.circleKnowledge.update).toHaveBeenCalledTimes(2);
    });

    it("空数组返回0", async () => {
      expect(await svc.scoreBatch([])).toBe(0);
    });
  });

  describe("getStats — 质量统计", () => {
    it("返回全局平均分和按来源统计", async () => {
      const stats = await svc.getStats();
      expect(stats.overallAvg).toBe(0.75);
      expect(stats.bySource).toHaveLength(2);
      expect(stats.bySource[0].sourceType).toBe("classic");
    });
  });

  describe("scoreUnscored — 自动评分", () => {
    it("对新入库未评分内容自动评分", async () => {
      prisma.circleKnowledge.findMany.mockResolvedValue([
        { id: "u1", content: "待评分内容", sourceType: "post" },
      ]);

      const count = await svc.scoreUnscored();
      expect(count).toBe(1);
      expect(prisma.circleKnowledge.update).toHaveBeenCalledTimes(1);
    });

    it("无未评分内容时返回0", async () => {
      prisma.circleKnowledge.findMany.mockResolvedValue([]);
      expect(await svc.scoreUnscored()).toBe(0);
    });
  });
});
