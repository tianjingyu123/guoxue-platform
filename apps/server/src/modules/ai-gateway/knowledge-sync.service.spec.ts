import { Test, TestingModule } from "@nestjs/testing";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "./vector.service";
import { BusinessException } from "../../common/business.exception";

describe("KnowledgeSyncService", () => {
  let svc: KnowledgeSyncService;
  let prisma: any;
  let vector: any;

  beforeEach(async () => {
    prisma = {
      circleKnowledge: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      circleKnowledgeCandidate: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      circleKnowledgeManual: { create: jest.fn() },
      article: { findMany: jest.fn().mockResolvedValue([]) },
      post: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      course: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      circleMember: { findMany: jest.fn().mockResolvedValue([]) },
    };

    vector = {
      embed: jest.fn().mockResolvedValue([[0.1, 0.2]]),
      searchCircleKnowledge: jest.fn().mockResolvedValue([]),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: VectorService, useValue: vector },
      ],
    }).compile();

    svc = mod.get(KnowledgeSyncService);
  });

  describe("syncCircleKnowledge", () => {
    it("同步圈主文章", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学入门", content: "国学之道..." },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBe(1);
      expect(prisma.circleKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sourceType: "article", sourceId: "a1" }),
        }),
      );
    });

    it("同步精华帖", async () => {
      prisma.post.findMany.mockResolvedValue([
        { id: "p1", title: "深度好文", content: "精华内容..." },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(1);
      const createCalls = prisma.circleKnowledge.create.mock.calls;
      expect(createCalls.some((c: any) => c[0].data.sourceType === "post")).toBe(true);
    });

    it("同步课程", async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "论语精讲", intro: "研读论语" },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(1);
      const createCalls = prisma.circleKnowledge.create.mock.calls;
      expect(createCalls.some((c: any) => c[0].data.sourceType === "course")).toBe(true);
    });

    it("同步近期活跃帖（近30天）并候选入库", async () => {
      prisma.post.findMany.mockResolvedValue([
        { id: "p2", title: "近期好帖", content: "近期内容..." },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(1);
      expect(prisma.circleKnowledgeCandidate.upsert).toHaveBeenCalled();
    });

    it("同步嘉宾帖（GUEST角色）并候选入库", async () => {
      prisma.circleMember.findMany.mockResolvedValue([{ userId: "u99" }]);
      prisma.post.findMany.mockResolvedValue([
        { id: "gp1", title: "嘉宾分享", content: "嘉宾独到见解..." },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(1);
      const upsertCalls = prisma.circleKnowledgeCandidate.upsert.mock.calls;
      expect(upsertCalls.some((c: any) => c[0].create.sourceType === "guest_post")).toBe(true);
    });

    it("嘉宾成员为空时跳过嘉宾帖同步", async () => {
      prisma.circleMember.findMany.mockResolvedValue([]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBe(0);
    });

    it("MD5哈希去重跳过已存在内容", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学入门", content: "国学之道..." },
      ]);
      // 模拟 findMany 返回已存在的 hash，使去重生效
      prisma.circleKnowledge.findMany.mockResolvedValue([
        { contentHash: "c910091f3e4fe28ae7449a4d3d35fc97" },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBe(0);
    });

    it("向量相似度去重跳过相似内容", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学入门", content: "国学之道..." },
      ]);
      prisma.circleKnowledge.findUnique.mockResolvedValue(null);
      vector.searchCircleKnowledge.mockResolvedValue([{ similarity: 0.95 }]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBe(0);
    });

    it("向量嵌入失败时容错继续", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学入门", content: "国学之道..." },
      ]);
      prisma.circleKnowledge.findUnique.mockResolvedValue(null);
      vector.embed.mockRejectedValue(new Error("Embedding服务不可用"));

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("manuallyAddToKnowledge", () => {
    it("手动添加帖子到知识库", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", title: "好帖", content: "帖子内容" });

      const result = await svc.manuallyAddToKnowledge("c1", "u1", "post", "p1");
      expect(result.added).toBe(true);
      expect(prisma.circleKnowledgeManual.create).toHaveBeenCalled();
    });

    it("手动添加文章到知识库", async () => {
      prisma.article.findUnique = jest.fn().mockResolvedValue({ id: "a1", title: "文章", content: "文章内容" });

      const result = await svc.manuallyAddToKnowledge("c1", "u1", "article", "a1");
      expect(result.added).toBe(true);
    });

    it("free_text 自由文本投喂", async () => {
      const result = await svc.manuallyAddToKnowledge("c1", "u1", "free_text", "txt1", {
        title: "圈主手记",
        content: "这是圈主自由输入的文本内容",
      });
      expect(result.added).toBe(true);
      expect(prisma.circleKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sourceType: "free_text" }),
        }),
      );
    });

    it("free_text 无内容时报错", async () => {
      await expect(
        svc.manuallyAddToKnowledge("c1", "u1", "free_text", "txt1"),
      ).rejects.toThrow(BusinessException);
    });

    it("帖子不存在时报错", async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expect(
        svc.manuallyAddToKnowledge("c1", "u1", "post", "nonexistent"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("removeFromKnowledge", () => {
    it("将知识库条目标记为已移除", async () => {
      const result = await svc.removeFromKnowledge("c1", "u1", "k1");
      expect(result.removed).toBe(true);
      expect(prisma.circleKnowledge.update).toHaveBeenCalledWith({
        where: { id: "k1" },
        data: { status: "removed" },
      });
    });
  });

  describe("候选管理", () => {
    it("获取待确认候选列表", async () => {
      prisma.circleKnowledgeCandidate.findMany.mockResolvedValue([
        { id: "c1", status: "pending", content: "候选内容" },
      ]);
      const candidates = await svc.getCandidates("c1");
      expect(candidates).toHaveLength(1);
    });

    it("确认候选内容加入知识库", async () => {
      prisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "cand1",
        circleId: "c1",
        sourceType: "post",
        sourceId: "p1",
        content: "内容",
        contentHash: "abc",
      });
      const result = await svc.confirmCandidate("cand1");
      expect(result.confirmed).toBe(true);
      expect(prisma.circleKnowledge.create).toHaveBeenCalled();
    });

    it("拒绝候选内容", async () => {
      const result = await svc.rejectCandidate("cand1");
      expect(result.rejected).toBe(true);
      expect(prisma.circleKnowledgeCandidate.update).toHaveBeenCalledWith({
        where: { id: "cand1" },
        data: { status: "rejected" },
      });
    });
  });
});
