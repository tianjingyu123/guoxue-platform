import { Test } from "@nestjs/testing";
import { RecommendService } from "./recommend.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  article: { findUnique: jest.fn(), findMany: jest.fn() },
  like: { findMany: jest.fn() },
  collect: { findMany: jest.fn() },
};

describe("RecommendService", () => {
  let svc: RecommendService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [RecommendService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(RecommendService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("related", () => {
    it("有标签时返回推荐文章", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", tags: ["儒家", "经典"] });
      mockPrisma.article.findMany.mockResolvedValue([{ id: "a2", title: "论语", tags: ["儒家"], viewCount: 100, likeCount: 50 }]);
      const result = await svc.related("a1");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("论语");
    });
    it("文章不存在抛出 NotFoundException", async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(svc.related("invalid")).rejects.toThrow(NotFoundException);
    });
    it("文章无标签时返回空数组", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: "a1", tags: [] });
      const result = await svc.related("a1");
      expect(result).toEqual([]);
    });
  });

  describe("personalized", () => {
    it("无互动历史时返回空数组", async () => {
      mockPrisma.like.findMany.mockResolvedValue([]);
      mockPrisma.collect.findMany.mockResolvedValue([]);
      const result = await svc.personalized("user-1");
      expect(result).toEqual([]);
    });
    it("有互动历史时返回推荐文章", async () => {
      mockPrisma.like.findMany.mockResolvedValue([{ targetId: "a1" }]);
      mockPrisma.collect.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany
        .mockResolvedValueOnce([{ tags: ["儒家"] }])
        .mockResolvedValueOnce([{ id: "a2", title: "推荐文", tags: ["儒家"] }]);
      const result = await svc.personalized("user-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("trending", () => {
    it("返回热门推荐（含浏览和互动）", async () => {
      mockPrisma.article.findMany.mockResolvedValueOnce([{ id: "a1", title: "热门", viewCount: 200 }]);
      mockPrisma.like.findMany.mockResolvedValue([]);
      mockPrisma.collect.findMany.mockResolvedValue([]);
      const result = await svc.trending();
      expect(result).toHaveProperty("byViews");
      expect(result).toHaveProperty("byEngagement");
      expect(result.byViews).toHaveLength(1);
    });
  });
});