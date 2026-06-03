import { Test, TestingModule } from "@nestjs/testing";
import { AdminDedupService } from "./admin-dedup.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  circleKnowledgeCandidate: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  circleKnowledge: {
    findUnique: jest.fn(),
  },
  circleKnowledgeDedupDecision: {
    create: jest.fn(),
  },
};

describe("AdminDedupService", () => {
  let svc: AdminDedupService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDedupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(AdminDedupService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("listCandidates", () => {
    it("列出候选列表含分页", async () => {
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([{ id: "c1", similarityScore: 0.95 }]);
      mockPrisma.circleKnowledgeCandidate.count.mockResolvedValue(1);
      const result = await svc.listCandidates({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按圈子过滤", async () => {
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([]);
      mockPrisma.circleKnowledgeCandidate.count.mockResolvedValue(0);
      await svc.listCandidates({ circleId: "circle1" });
      expect(mockPrisma.circleKnowledgeCandidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ circleId: "circle1" }) }),
      );
    });

    it("按最低相似度过滤", async () => {
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([]);
      mockPrisma.circleKnowledgeCandidate.count.mockResolvedValue(0);
      await svc.listCandidates({ minSimilarity: 0.8 });
      expect(mockPrisma.circleKnowledgeCandidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ similarityScore: { gte: 0.8 } }),
        }),
      );
    });
  });

  describe("getCandidate", () => {
    it("获取候选详情", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "c1", similarityScore: 0.95, similarToId: "k1",
      });
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1", content: "重复内容", sourceType: "article" });
      const result = await svc.getCandidate("c1");
      expect(result.id).toBe("c1");
      expect(result.similarTarget.id).toBe("k1");
    });

    it("候选不存在抛出异常", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue(null);
      await expect(svc.getCandidate("no-exist")).rejects.toThrow(BusinessException);
    });

    it("无similarToId时不查询目标", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "c1", similarityScore: 0.5, similarToId: null,
      });
      const result = await svc.getCandidate("c1");
      expect(result.similarTarget).toBeNull();
      expect(mockPrisma.circleKnowledge.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("decide", () => {
    it("单个去重决策——接受", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({ id: "c1", status: "pending" });
      mockPrisma.circleKnowledgeDedupDecision.create.mockResolvedValue({ id: "d1", decision: "override" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({});
      const result = await svc.decide("c1", "override", "admin1", "确实是重复");
      expect(result.id).toBe("d1");
      expect(mockPrisma.circleKnowledgeCandidate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "confirmed" } }),
      );
    });

    it("单个去重决策——拒绝", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({ id: "c1", status: "pending" });
      mockPrisma.circleKnowledgeDedupDecision.create.mockResolvedValue({ id: "d2", decision: "reject" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({});
      const result = await svc.decide("c1", "reject");
      expect(mockPrisma.circleKnowledgeCandidate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "rejected" } }),
      );
    });
  });

  describe("batchDecide", () => {
    it("批量决策", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({ id: "c1", status: "pending" });
      mockPrisma.circleKnowledgeDedupDecision.create.mockResolvedValue({ id: "d1" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({});

      const result = await svc.batchDecide({
        items: [
          { candidateId: "c1", decision: "override" },
          { candidateId: "c2", decision: "reject" },
        ],
      }, "admin1");
      expect(result.processed).toBe(2);
      expect(result.results[0].ok).toBe(true);
    });

    it("部分失败不影响后续", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique
        .mockResolvedValueOnce(null) // c1 不存在 → 抛异常
        .mockResolvedValueOnce({ id: "c2", status: "pending" });
      mockPrisma.circleKnowledgeDedupDecision.create.mockResolvedValue({ id: "d2" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({});

      const result = await svc.batchDecide({
        items: [
          { candidateId: "c1", decision: "override" },
          { candidateId: "c2", decision: "reject" },
        ],
      });
      expect(result.results[0].ok).toBe(false);
      expect(result.results[1].ok).toBe(true);
    });
  });

  describe("getStats", () => {
    it("返回去重统计数据", async () => {
      mockPrisma.circleKnowledgeCandidate.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30)  // pending
        .mockResolvedValueOnce(50)  // confirmed
        .mockResolvedValueOnce(20); // rejected
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([
        { similarityScore: 0.95 },
        { similarityScore: 0.85 },
        { similarityScore: 0.65 },
      ]);

      const result = await svc.getStats();
      expect(result.total).toBe(100);
      expect(result.pending).toBe(30);
      expect(result.distribution.high).toBe(1);
      expect(result.distribution.medium).toBe(1);
      expect(result.distribution.low).toBe(1);
    });
  });
});
