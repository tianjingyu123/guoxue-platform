import { Test, TestingModule } from "@nestjs/testing";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      circleKnowledgeCandidate: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      circleKnowledgeManual: { create: jest.fn() },
      article: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      post: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      course: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      circleMember: { findMany: jest.fn().mockResolvedValue([]) },
      // 归属校验：默认圈主为 u1，使授权通过
      circle: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: "u1" }),
      },
    };

    vector = {
      embed: jest.fn().mockResolvedValue([[0.1, 0.2]]),
      searchCircleKnowledge: jest.fn().mockResolvedValue([]),
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) } },
        { provide: VectorService, useValue: vector },
      ],
    }).compile();

    svc = mod.get(KnowledgeSyncService);
  });

  describe("syncCircleKnowledge", () => {
    it("同步圈主文章", async () => {
      prisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "国学入门", content: "国学学习宜从原文、注释与历史语境三处入手，再用生活例子理解经典概念，避免只记结论。".repeat(2) },
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
        { id: "p1", title: "深度好文", content: "研读经典时先弄清成书时代和版本，再看原文用词和历代注释，最后讨论今天怎样理解，不宜断章取义。" },
      ]);

      const count = await svc.syncCircleKnowledge("c1");
      expect(count).toBeGreaterThanOrEqual(1);
      const createCalls = prisma.circleKnowledge.create.mock.calls;
      expect(createCalls.some((c: any) => c[0].data.sourceType === "post")).toBe(true);
    });

    it("同步课程", async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "论语精讲", intro: "课程按篇章讲解论语原文与常见注释，结合历史语境说明概念，并安排阅读练习帮助学员形成自己的理解。" },
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

    it("明显闲聊不进入知识库或待审列表", async () => {
      prisma.post.findMany.mockResolvedValue([{ id: "p1", title: "", content: "哈哈哈，谢谢老师！" }]);
      await svc.syncCircleKnowledge("c1");
      expect(prisma.circleKnowledge.create).not.toHaveBeenCalled();
      expect(prisma.circleKnowledgeCandidate.upsert).not.toHaveBeenCalled();
    });

    it("短精华帖只进待审，不自动成为助理依据", async () => {
      prisma.post.findMany.mockResolvedValue([{ id: "p1", title: "学而", content: "《论语》说学而时习之。" }]);
      await svc.syncCircleKnowledge("c1");
      expect(prisma.circleKnowledge.create).not.toHaveBeenCalled();
      expect(prisma.circleKnowledgeCandidate.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ sourceType: "post", status: "pending" }),
      }));
    });
  });

  describe("manuallyAddToKnowledge", () => {
    it("手动添加帖子到知识库", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p1", title: "好帖", content: "帖子内容" });

      const result = await svc.manuallyAddToKnowledge("c1", "u1", "post", "p1");
      expect(result.added).toBe(true);
      expect(prisma.circleKnowledgeManual.create).toHaveBeenCalled();
      expect(prisma.post.findFirst).toHaveBeenCalledWith({ where: { id: "p1", circleId: "c1", status: "PUBLISHED" } });
    });

    it("手动添加文章到知识库", async () => {
      prisma.article.findFirst.mockResolvedValue({ id: "a1", title: "文章", content: "文章内容" });

      const result = await svc.manuallyAddToKnowledge("c1", "u1", "article", "a1");
      expect(result.added).toBe(true);
      expect(prisma.article.findFirst).toHaveBeenCalledWith({ where: { id: "a1", circleId: "c1", auditStatus: "APPROVED", deletedAt: null } });
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
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(
        svc.manuallyAddToKnowledge("c1", "u1", "post", "nonexistent"),
      ).rejects.toThrow(BusinessException);
    });

    it("非圈主操作时抛出异常（归属校验）", async () => {
      prisma.circle.findUnique.mockResolvedValue({ ownerId: "owner" });
      await expect(
        svc.manuallyAddToKnowledge("c1", "intruder", "post", "p1"),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe("removeFromKnowledge", () => {
    it("将知识库条目标记为已移除（where 加 circleId 约束）", async () => {
      const result = await svc.removeFromKnowledge("c1", "u1", "k1");
      expect(result.removed).toBe(true);
      expect(prisma.circleKnowledge.updateMany).toHaveBeenCalledWith({
        where: { id: "k1", circleId: "c1" },
        data: { status: "removed" },
      });
    });

    it("条目不存在或不属于该圈子时抛出异常", async () => {
      prisma.circleKnowledge.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        svc.removeFromKnowledge("c1", "u1", "k1"),
      ).rejects.toThrow(BusinessException);
    });

    it("非圈主操作时抛出异常（归属校验）", async () => {
      prisma.circle.findUnique.mockResolvedValue({ ownerId: "owner" });
      await expect(
        svc.removeFromKnowledge("c1", "intruder", "k1"),
      ).rejects.toThrow(BusinessException);
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
        status: "pending",
      });
      prisma.post.findFirst.mockResolvedValue({ id: "p1" });
      const result = await svc.confirmCandidate("cand1");
      expect(result.confirmed).toBe(true);
      expect(prisma.circleKnowledge.create).toHaveBeenCalled();
      expect(prisma.post.findFirst).toHaveBeenCalledWith({
        where: { id: "p1", circleId: "c1", status: "PUBLISHED" }, select: { id: true },
      });
    });

    it("原帖已下架或不属本圈时不能确认旧候选", async () => {
      prisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "cand1", circleId: "c1", sourceType: "post", sourceId: "p1", status: "pending",
      });
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(svc.confirmCandidate("cand1")).rejects.toThrow(BusinessException);
      expect(prisma.circleKnowledge.create).not.toHaveBeenCalled();
    });

    it("确认时发现知识已存在则关闭候选，不重复入库", async () => {
      prisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "cand1", circleId: "c1", sourceType: "post", sourceId: "p1", contentHash: "same", status: "pending",
      });
      prisma.post.findFirst.mockResolvedValue({ id: "p1" });
      prisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1" });
      const result = await svc.confirmCandidate("cand1");
      expect(result.confirmed).toBe(false);
      expect(prisma.circleKnowledge.create).not.toHaveBeenCalled();
      expect(prisma.circleKnowledgeCandidate.update).toHaveBeenCalledWith({
        where: { id: "cand1" }, data: { status: "rejected" },
      });
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
