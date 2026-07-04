import { Test } from "@nestjs/testing";
import { ContentExpService, CONTENT_EXP_DAILY_CAP, qualityMultiplier } from "./content-exp.service";
import { UserGrowthService } from "./user-growth.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  growthRecord: { findFirst: jest.fn(), aggregate: jest.fn(), create: jest.fn(), groupBy: jest.fn() },
  userAchievement: { createMany: jest.fn() },
  article: { findUnique: jest.fn() },
  post: { findUnique: jest.fn() },
  video: { findUnique: jest.fn() },
  user: { findMany: jest.fn() },
};
const mockGrowth = { addExp: jest.fn() };

describe("ContentExpService — 创作激励学分发放（创-P1）", () => {
  let svc: ContentExpService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ContentExpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserGrowthService, useValue: mockGrowth },
      ],
    }).compile();
    svc = mod.get(ContentExpService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.growthRecord.findFirst.mockResolvedValue(null); // 默认无重复
    mockPrisma.growthRecord.aggregate.mockResolvedValue({ _sum: { amount: 0 } }); // 当日未发过
    mockPrisma.growthRecord.create.mockResolvedValue({});
    mockPrisma.userAchievement.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.article.findUnique.mockResolvedValue({ userId: "author1" });
    mockPrisma.post.findUnique.mockResolvedValue({ userId: "author1" });
    mockPrisma.video.findUnique.mockResolvedValue({ userId: "author1" });
    mockGrowth.addExp.mockResolvedValue(undefined);
  });

  describe("qualityMultiplier — 质量系数表边界", () => {
    it("<40:0 / 40-59:1 / 60-79:3 / 80-89:6 / ≥90:10", () => {
      expect(qualityMultiplier(0)).toBe(0);
      expect(qualityMultiplier(39)).toBe(0);
      expect(qualityMultiplier(40)).toBe(1);
      expect(qualityMultiplier(59)).toBe(1);
      expect(qualityMultiplier(60)).toBe(3);
      expect(qualityMultiplier(79)).toBe(3);
      expect(qualityMultiplier(80)).toBe(6);
      expect(qualityMultiplier(89)).toBe(6);
      expect(qualityMultiplier(90)).toBe(10);
      expect(qualityMultiplier(100)).toBe(10);
    });
  });

  describe("onContentScored — 学分公式与联动", () => {
    it("优质长文 90 分 → 50×10=500 学分（=签到5分的100倍）·写台账+addExp+颁「妙笔生花」", async () => {
      const r = await svc.onContentScored("ARTICLE", "a1", 90);
      expect(r).toEqual({ awarded: 500 });
      expect(mockPrisma.growthRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author1",
          amount: 500,
          source: "content_quality:a1",
        }),
      });
      expect(mockGrowth.addExp).toHaveBeenCalledWith("author1", 500, "content_quality");
      expect(mockPrisma.userAchievement.createMany).toHaveBeenCalledWith({
        data: [{ userId: "author1", code: "content_quality_star" }],
        skipDuplicates: true,
      });
    });

    it("帖子 65 分 → 20×3=60 学分·不颁成就（<80）", async () => {
      const r = await svc.onContentScored("POST", "p1", 65);
      expect(r).toEqual({ awarded: 60 });
      expect(mockPrisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it("80-89 分 ×6 且颁成就（帖子 82 → 120）", async () => {
      const r = await svc.onContentScored("POST", "p2", 82);
      expect(r).toEqual({ awarded: 120 });
      expect(mockPrisma.userAchievement.createMany).toHaveBeenCalled();
    });

    it("<40 分 ×0 档：不发分、无台账、addExp 不调用", async () => {
      const r = await svc.onContentScored("ARTICLE", "a-low", 30);
      expect(r).toEqual({ awarded: 0, reason: "low_quality" });
      expect(mockPrisma.growthRecord.create).not.toHaveBeenCalled();
      expect(mockGrowth.addExp).not.toHaveBeenCalled();
    });

    it("幂等：同 contentId 已有 GrowthRecord → 不重复发", async () => {
      mockPrisma.growthRecord.findFirst.mockResolvedValue({ id: "g1" });
      const r = await svc.onContentScored("ARTICLE", "a1", 90);
      expect(r).toEqual({ awarded: 0, reason: "duplicate" });
      expect(mockPrisma.growthRecord.create).not.toHaveBeenCalled();
      expect(mockGrowth.addExp).not.toHaveBeenCalled();
    });

    it("日上限 1500：当日已发 1400 → 500 学分只发剩余 100", async () => {
      mockPrisma.growthRecord.aggregate.mockResolvedValue({ _sum: { amount: 1400 } });
      const r = await svc.onContentScored("ARTICLE", "a2", 95);
      expect(r).toEqual({ awarded: 100 });
      expect(mockPrisma.growthRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 100 }),
      });
    });

    it("日上限已满 → 不发分", async () => {
      mockPrisma.growthRecord.aggregate.mockResolvedValue({ _sum: { amount: CONTENT_EXP_DAILY_CAP } });
      const r = await svc.onContentScored("ARTICLE", "a3", 95);
      expect(r).toEqual({ awarded: 0, reason: "daily_cap" });
      expect(mockPrisma.growthRecord.create).not.toHaveBeenCalled();
    });

    it("作者不存在 / 不支持的类型 → 不发分", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      expect(await svc.onContentScored("ARTICLE", "ghost", 90)).toEqual({ awarded: 0, reason: "author_not_found" });
      expect(await svc.onContentScored("COMMENT", "c1", 90)).toEqual({ awarded: 0, reason: "unsupported_type" });
    });

    it("内部异常自吞不外抛（不阻断评分批次）", async () => {
      mockPrisma.growthRecord.findFirst.mockRejectedValue(new Error("db down"));
      const r = await svc.onContentScored("ARTICLE", "a1", 90);
      expect(r).toEqual({ awarded: 0, reason: "error" });
    });
  });

  describe("getCreationRankings — 创作榜聚合", () => {
    it("按 content_quality 前缀聚合 Top20，补全用户昵称头像", async () => {
      mockPrisma.growthRecord.groupBy.mockResolvedValue([
        { userId: "u1", _sum: { amount: 800 } },
        { userId: "u2", _sum: { amount: 300 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1", nickname: "子墨", avatar: "a.png" }]);

      const r = await svc.getCreationRankings("week");

      expect(mockPrisma.growthRecord.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["userId"],
          where: expect.objectContaining({ source: { startsWith: "content_quality:" } }),
          take: 20,
          orderBy: { _sum: { amount: "desc" } },
        }),
      );
      expect(r.period).toBe("week");
      expect(r.items).toEqual([
        { rank: 1, userId: "u1", nickname: "子墨", avatar: "a.png", score: 800 },
        { rank: 2, userId: "u2", nickname: "国学学友", avatar: "", score: 300 },
      ]);
    });

    it("month 取近 30 天窗口", async () => {
      mockPrisma.growthRecord.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      const r = await svc.getCreationRankings("month");
      const since = new Date(r.since).getTime();
      expect(Date.now() - since).toBeGreaterThanOrEqual(30 * 86_400_000 - 5_000);
      expect(r.items).toEqual([]);
    });
  });
});
