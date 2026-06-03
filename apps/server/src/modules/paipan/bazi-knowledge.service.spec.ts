import { Test, TestingModule } from "@nestjs/testing";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

const mockPrisma = {
  baziKnowledge: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  circleKnowledge: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockVector = {
  findUnindexed: jest.fn(),
  embed: jest.fn(),
  storeCircleKnowledge: jest.fn(),
};

describe("BaziKnowledgeService", () => {
  let svc: BaziKnowledgeService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        BaziKnowledgeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VectorService, useValue: mockVector },
      ],
    }).compile();
    svc = mod.get(BaziKnowledgeService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("listByCategory", () => {
    it("按分类列出知识条目", async () => {
      mockPrisma.baziKnowledge.findMany.mockResolvedValue([{ id: "k1", title: "天干地支入门" }]);
      mockPrisma.baziKnowledge.count.mockResolvedValue(1);
      const result = await svc.listByCategory("天干地支");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("支持分页", async () => {
      mockPrisma.baziKnowledge.findMany.mockResolvedValue([]);
      mockPrisma.baziKnowledge.count.mockResolvedValue(0);
      const result = await svc.listByCategory("格局", 2, 10);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });
  });

  describe("getById", () => {
    it("获取单条详情", async () => {
      mockPrisma.baziKnowledge.findUnique.mockResolvedValue({ id: "k1", title: "十神详解" });
      const result = await svc.getById("k1");
      expect(result!.title).toBe("十神详解");
    });
  });

  describe("search", () => {
    it("按关键词搜索", async () => {
      mockPrisma.baziKnowledge.findMany.mockResolvedValue([{ id: "k1", title: "五行入门" }]);
      const result = await svc.search("五行");
      expect(result).toHaveLength(1);
    });

    it("按关键词+分类搜索", async () => {
      mockPrisma.baziKnowledge.findMany.mockResolvedValue([]);
      await svc.search("用神", "格局");
      expect(mockPrisma.baziKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "格局" }),
        }),
      );
    });

    it("无关键词时返回所有已发布条目", async () => {
      mockPrisma.baziKnowledge.findMany.mockResolvedValue([]);
      await svc.search("");
      expect(mockPrisma.baziKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) }),
      );
    });
  });

  describe("create", () => {
    it("创建知识条目", async () => {
      mockPrisma.baziKnowledge.create.mockResolvedValue({ id: "k1", title: "新知识" });
      const result = await svc.create({ title: "新知识", category: "十神", content: "十神是..." });
      expect(result.id).toBe("k1");
      expect(mockPrisma.baziKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "新知识",
            contentHash: expect.any(String),
          }),
        }),
      );
    });

    it("创建时带标签", async () => {
      mockPrisma.baziKnowledge.create.mockResolvedValue({ id: "k2", tags: ["八字", "入门"] });
      const result = await svc.create({ title: "入门", category: "天干地支", content: "...", tags: ["八字", "入门"] });
      expect(result.tags).toEqual(["八字", "入门"]);
    });
  });

  describe("update", () => {
    it("更新知识条目", async () => {
      mockPrisma.baziKnowledge.update.mockResolvedValue({ id: "k1", title: "更新标题" });
      const result = await svc.update("k1", { title: "更新标题" });
      expect(result.title).toBe("更新标题");
    });

    it("更新内容时重新计算hash", async () => {
      mockPrisma.baziKnowledge.update.mockResolvedValue({});
      await svc.update("k1", { content: "新内容" });
      expect(mockPrisma.baziKnowledge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contentHash: expect.any(String) }),
        }),
      );
    });
  });

  describe("delete", () => {
    it("删除知识条目", async () => {
      mockPrisma.baziKnowledge.delete.mockResolvedValue({ id: "k1" });
      const result = await svc.delete("k1");
      expect(result.id).toBe("k1");
    });
  });

  describe("stats", () => {
    it("返回统计概览", async () => {
      mockPrisma.baziKnowledge.count.mockResolvedValue(100);
      mockPrisma.baziKnowledge.groupBy.mockResolvedValue([
        { category: "天干地支", _count: 30 },
        { category: "十神", _count: 25 },
      ]);
      const result = await svc.stats();
      expect(result.total).toBe(100);
      expect(result.byCategory).toHaveLength(2);
    });
  });

  describe("syncToKnowledge", () => {
    it("知识不存在时跳过", async () => {
      mockPrisma.baziKnowledge.findUnique.mockResolvedValue(null);
      await svc.syncToKnowledge("no-exist");
      expect(mockPrisma.circleKnowledge.findFirst).not.toHaveBeenCalled();
    });

    it("已同步过的知识跳过", async () => {
      mockPrisma.baziKnowledge.findUnique.mockResolvedValue({
        id: "k1", category: "天干地支", title: "标题", content: "内容", contentHash: "abc",
      });
      mockPrisma.circleKnowledge.findFirst.mockResolvedValue({ id: "ck1" });
      await svc.syncToKnowledge("k1");
      expect(mockPrisma.circleKnowledge.create).not.toHaveBeenCalled();
    });

    it("成功同步到圈子知识库", async () => {
      mockPrisma.baziKnowledge.findUnique.mockResolvedValue({
        id: "k1", category: "天干地支", title: "标题", content: "内容", contentHash: "abc",
      });
      mockPrisma.circleKnowledge.findFirst.mockResolvedValue(null);
      mockPrisma.circleKnowledge.create.mockResolvedValue({ id: "ck1" });
      await svc.syncToKnowledge("k1");
      expect(mockPrisma.circleKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ circleId: "bazi", sourceType: "bazi_knowledge" }),
        }),
      );
    });
  });

  describe("vectorizeUnindexed", () => {
    it("无未索引条目返回0", async () => {
      mockVector.findUnindexed.mockResolvedValue([]);
      const result = await svc.vectorizeUnindexed();
      expect(result).toBe(0);
    });

    it("向量化未索引条目", async () => {
      mockVector.findUnindexed.mockResolvedValue([
        { id: "r1", content: "天干：甲乙丙丁" },
        { id: "r2", content: "地支：子丑寅卯" },
      ]);
      mockVector.embed.mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]);
      mockVector.storeCircleKnowledge.mockResolvedValue(undefined);

      const result = await svc.vectorizeUnindexed(50);
      expect(result).toBe(2);
      expect(mockVector.embed).toHaveBeenCalledWith(["天干：甲乙丙丁", "地支：子丑寅卯"]);
      expect(mockVector.storeCircleKnowledge).toHaveBeenCalledTimes(2);
    });
  });
});
