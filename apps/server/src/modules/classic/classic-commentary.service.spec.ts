import { Test } from "@nestjs/testing";
import { ClassicCommentaryService } from "./classic-commentary.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";

const mockPrisma = {
  classicCommentary: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
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

describe("ClassicCommentaryService", () => {
  let svc: ClassicCommentaryService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ClassicCommentaryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VectorService, useValue: mockVector },
      ],
    }).compile();
    svc = mod.get(ClassicCommentaryService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("listByBook", () => {
    it("按书籍ID列出注解（分页）", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([
        { id: "c1", title: "论语注", author: "朱熹" },
      ]);
      mockPrisma.classicCommentary.count.mockResolvedValue(1);
      const result = await svc.listByBook("b1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.classicCommentary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ bookId: "b1" }) }),
      );
    });

    it("支持类型和学派过滤", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([]);
      mockPrisma.classicCommentary.count.mockResolvedValue(0);
      await svc.listByBook("b1", { type: "注疏", school: "理学" });
      const callArgs = mockPrisma.classicCommentary.findMany.mock.calls[0][0];
      expect(callArgs.where.type).toBe("注疏");
      expect(callArgs.where.school).toBe("理学");
    });
  });

  describe("getById", () => {
    it("返回单条注解含关联书籍和章节", async () => {
      mockPrisma.classicCommentary.findUnique.mockResolvedValue({
        id: "c1",
        title: "学而篇注",
        book: { id: "b1", title: "论语" },
        chapter: { id: "ch1", title: "学而" },
      });
      const result = await svc.getById("c1");
      expect(result!.id).toBe("c1");
      expect(result!.book.title).toBe("论语");
    });
  });

  describe("listByChapter", () => {
    it("按章节ID列出注解", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([
        { id: "c1", title: "注解1", content: "..." },
      ]);
      const result = await svc.listByChapter("ch1");
      expect(result).toHaveLength(1);
      expect(mockPrisma.classicCommentary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { chapterId: "ch1", status: "PUBLISHED" } }),
      );
    });
  });

  describe("create", () => {
    it("创建注解并异步同步知识库", async () => {
      const dto = { bookId: "b1", title: "新注解", content: "注解内容..." };
      mockPrisma.classicCommentary.create.mockResolvedValue({
        id: "new1", ...dto, contentHash: "abc123",
      });
      const result = await svc.create(dto);
      expect(result.id).toBe("new1");
      expect(mockPrisma.classicCommentary.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("更新注解信息", async () => {
      mockPrisma.classicCommentary.update.mockResolvedValue({
        id: "c1", title: "更新标题", content: "新内容",
      });
      const result = await svc.update("c1", { title: "更新标题" });
      expect(result.title).toBe("更新标题");
    });

    it("更新内容时重新计算 contentHash", async () => {
      mockPrisma.classicCommentary.update.mockResolvedValue({ id: "c1" });
      await svc.update("c1", { content: "新内容" });
      expect(mockPrisma.classicCommentary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: expect.objectContaining({ contentHash: expect.any(String) }),
        }),
      );
    });
  });

  describe("delete", () => {
    it("删除注解", async () => {
      mockPrisma.classicCommentary.findUnique.mockResolvedValue({ id: "c1" });
      mockPrisma.classicCommentary.delete.mockResolvedValue({ id: "c1" });
      const result = await svc.delete("c1");
      expect(result.id).toBe("c1");
    });
    it("注解不存在抛出异常", async () => {
      mockPrisma.classicCommentary.findUnique.mockResolvedValue(null);
      await expect(svc.delete("c1")).rejects.toThrow("注解不存在");
    });
  });

  describe("search", () => {
    it("关键词搜索（分页）", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([
        { id: "c1", title: "论语注", author: "朱熹", content: "学而时习之..." },
      ]);
      mockPrisma.classicCommentary.count.mockResolvedValue(1);
      const result = await svc.search({ keyword: "论语" });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.classicCommentary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: "论语" } }),
            ]),
          }),
        }),
      );
    });

    it("复合过滤", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([]);
      mockPrisma.classicCommentary.count.mockResolvedValue(0);
      await svc.search({ keyword: "大学", school: "理学", type: "注疏" });
      const callArgs = mockPrisma.classicCommentary.findMany.mock.calls[0][0];
      expect(callArgs.where.school).toBe("理学");
      expect(callArgs.where.type).toBe("注疏");
    });
  });

  describe("stats", () => {
    it("返回统计数据", async () => {
      mockPrisma.classicCommentary.count.mockResolvedValue(100);
      mockPrisma.classicCommentary.groupBy
        .mockResolvedValueOnce([{ type: "注疏", _count: 60 }, { type: "解读", _count: 40 }])
        .mockResolvedValueOnce([{ school: "理学", _count: 50 }, { school: "心学", _count: 30 }]);
      const result = await svc.stats();
      expect(result.total).toBe(100);
      expect(result.byType).toHaveLength(2);
      expect(result.bySchool).toHaveLength(2);
    });
  });

  describe("vectorizeUnindexed", () => {
    it("向量化未索引注解", async () => {
      mockVector.findUnindexed.mockResolvedValue([
        { id: "k1", content: "内容1" },
        { id: "k2", content: "内容2" },
      ]);
      mockVector.embed.mockResolvedValue([
        [0.1, 0.2], [0.3, 0.4],
      ]);
      mockVector.storeCircleKnowledge.mockResolvedValue(undefined);
      const result = await svc.vectorizeUnindexed();
      expect(result).toBe(2);
      expect(mockVector.storeCircleKnowledge).toHaveBeenCalledTimes(2);
    });

    it("无待索引数据时返回 0", async () => {
      mockVector.findUnindexed.mockResolvedValue([]);
      const result = await svc.vectorizeUnindexed();
      expect(result).toBe(0);
    });
  });

  describe("分页入参加固（P2-4）", () => {
    it("listByBook 非法 page 不产生 NaN skip", async () => {
      mockPrisma.classicCommentary.findMany.mockResolvedValue([]);
      mockPrisma.classicCommentary.count.mockResolvedValue(0);
      await svc.listByBook("b1", {}, "abc" as any);
      const arg = mockPrisma.classicCommentary.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });
});
