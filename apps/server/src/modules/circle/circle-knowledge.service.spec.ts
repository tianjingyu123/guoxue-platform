import { Test } from "@nestjs/testing";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  circleKnowledge: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  circleKnowledgeManual: {
    create: jest.fn(),
  },
  circleKnowledgeCandidate: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  post: { findMany: jest.fn() },
  paidQuestion: { findMany: jest.fn() },
  comment: { findMany: jest.fn() },
  circle: { findUnique: jest.fn() },
  // 治理 #8：knowledge.manage 矩阵位鉴权（assertManager）
  circleMember: { findUnique: jest.fn() },
  circleGovernanceConfig: { findUnique: jest.fn() },
};

const mockVector = {
  embed: jest.fn(),
  storeCircleKnowledge: jest.fn(),
  deleteCircleKnowledge: jest.fn(),
  searchCircleKnowledge: jest.fn(),
};

const mockAiGateway = { chat: jest.fn() };

describe("CircleKnowledgeService", () => {
  let svc: CircleKnowledgeService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CircleKnowledgeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: VectorService, useValue: mockVector },
        { provide: AiGatewayService, useValue: mockAiGateway },
      ],
    }).compile();
    svc = mod.get(CircleKnowledgeService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  // 治理 #8（2026-07-11）：知识库管理接入权限矩阵 knowledge.manage
  describe("assertManager（knowledge.manage 矩阵位）", () => {
    it("圈主/默认矩阵管理员放行·嘉宾默认被拒", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      await expect(svc.assertManager("c1", "owner")).resolves.toBeUndefined();

      mockPrisma.circleMember.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValueOnce(null); // 无覆盖位 → 默认矩阵 ADMIN✓
      await expect(svc.assertManager("c1", "admin1")).resolves.toBeUndefined();

      mockPrisma.circleMember.findUnique.mockResolvedValueOnce({ role: "GUEST" });
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValueOnce(null); // 默认矩阵 GUEST✗
      await expect(svc.assertManager("c1", "guest1")).rejects.toThrow("无知识库管理权限");
    });

    it("矩阵覆盖位生效：圈主可收回管理员/授予嘉宾知识库管理权", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValueOnce({
        rolePermissions: { ADMIN: { "knowledge.manage": false } },
      });
      await expect(svc.assertManager("c1", "admin1")).rejects.toThrow("无知识库管理权限");

      mockPrisma.circleMember.findUnique.mockResolvedValueOnce({ role: "GUEST" });
      mockPrisma.circleGovernanceConfig.findUnique.mockResolvedValueOnce({
        rolePermissions: { GUEST: { "knowledge.manage": true } },
      });
      await expect(svc.assertManager("c1", "guest1")).resolves.toBeUndefined();
    });

    it("非成员一律拒绝", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValueOnce(null);
      await expect(svc.assertManager("c1", "outsider")).rejects.toThrow(BusinessException);
    });
  });

  describe("add", () => {
    it("手动添加知识条目", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue(null);
      mockPrisma.circleKnowledge.create.mockResolvedValue({ id: "k1", content: "测试内容" });
      // 忽略异步向量索引
      mockVector.embed.mockResolvedValue([[0.1, 0.2]]);
      mockVector.storeCircleKnowledge.mockResolvedValue(undefined);

      const result = await svc.add({ circleId: "c1", sourceType: "manual", content: "测试内容", addedBy: "admin1" });
      expect(result.id).toBe("k1");
    });

    it("内容已存在时返回已有条目", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1", content: "已有内容" });
      const result = await svc.add({ circleId: "c1", sourceType: "manual", content: "已有内容", addedBy: "admin1" });
      expect(result.id).toBe("k1");
      expect(mockPrisma.circleKnowledge.create).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("获取圈子知识库列表", async () => {
      mockPrisma.circleKnowledge.findMany.mockResolvedValue([{ id: "k1" }]);
      mockPrisma.circleKnowledge.count.mockResolvedValue(1);
      const result = await svc.list("c1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按来源类型过滤", async () => {
      mockPrisma.circleKnowledge.findMany.mockResolvedValue([]);
      mockPrisma.circleKnowledge.count.mockResolvedValue(0);
      await svc.list("c1", { sourceType: "article" });
      expect(mockPrisma.circleKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sourceType: "article" }) }),
      );
    });
  });

  describe("remove", () => {
    it("删除知识条目", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1", circleId: "c1" });
      mockPrisma.circleKnowledgeManual.create.mockResolvedValue({});
      mockVector.deleteCircleKnowledge.mockResolvedValue(undefined);
      mockPrisma.circleKnowledge.update.mockResolvedValue({ id: "k1", status: "removed" });

      const result = await svc.remove("c1", "k1", "u1");
      expect(result.status).toBe("removed");
    });

    it("条目不属于该圈子时抛出异常", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1", circleId: "c2" });
      await expect(svc.remove("c1", "k1", "u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("update", () => {
    it("更新知识条目内容", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1", circleId: "c1" });
      mockPrisma.circleKnowledge.update.mockResolvedValue({ id: "k1", content: "新内容" });
      mockVector.embed.mockResolvedValue([[0.1]]);
      mockVector.storeCircleKnowledge.mockResolvedValue(undefined);

      const result = await svc.update("c1", "k1", "新内容");
      expect(result.content).toBe("新内容");
    });
  });

  describe("checkSimilarity", () => {
    it("无相似内容", async () => {
      mockVector.embed.mockResolvedValue([[0.1, 0.2]]);
      mockVector.searchCircleKnowledge.mockResolvedValue([]);
      const result = await svc.checkSimilarity("c1", "新内容");
      expect(result.isDuplicate).toBe(false);
    });

    it("检测到高度相似", async () => {
      mockVector.embed.mockResolvedValue([[0.1, 0.2]]);
      mockVector.searchCircleKnowledge.mockResolvedValue([
        { id: "k1", content: "相似内容", similarity: 0.95 },
      ]);
      const result = await svc.checkSimilarity("c1", "相似内容", 0.9);
      expect(result.isDuplicate).toBe(true);
      expect(result.similarTo!.score).toBe(0.95);
    });

    it("低于阈值不算重复", async () => {
      mockVector.embed.mockResolvedValue([[0.1, 0.2]]);
      mockVector.searchCircleKnowledge.mockResolvedValue([
        { id: "k1", content: "不太相似", similarity: 0.75 },
      ]);
      const result = await svc.checkSimilarity("c1", "不太相似", 0.85);
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe("candidate管理", () => {
    it("添加候选内容", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue(null);
      mockVector.embed.mockResolvedValue([[0.1]]);
      mockVector.searchCircleKnowledge.mockResolvedValue([]);
      mockPrisma.circleKnowledgeCandidate.create.mockResolvedValue({ id: "c1", status: "pending" });

      const result = await svc.addCandidate({ circleId: "c1", sourceType: "article", content: "候选内容" });
      expect(result!.status).toBe("pending");
    });

    it("已存在知识条目则返回null", async () => {
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue({ id: "k1" });
      const result = await svc.addCandidate({ circleId: "c1", sourceType: "article", content: "已有" });
      expect(result).toBeNull();
    });

    it("获取候选列表", async () => {
      mockPrisma.circleKnowledgeCandidate.findMany.mockResolvedValue([{ id: "c1" }]);
      mockPrisma.circleKnowledgeCandidate.count.mockResolvedValue(1);
      const result = await svc.listCandidates("c1");
      expect(result.items).toHaveLength(1);
    });

    it("确认候选", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({
        id: "c1", circleId: "c1", sourceType: "article", content: "内容",
      });
      mockPrisma.circleKnowledge.findUnique.mockResolvedValue(null);
      mockPrisma.circleKnowledge.create.mockResolvedValue({ id: "k1" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({ id: "c1", status: "confirmed" });
      mockVector.embed.mockResolvedValue([[0.1]]);
      mockVector.storeCircleKnowledge.mockResolvedValue(undefined);

      const result = await svc.confirmCandidate("c1", "c1", "admin1");
      expect(result.status).toBe("confirmed");
    });

    it("拒绝候选", async () => {
      mockPrisma.circleKnowledgeCandidate.findUnique.mockResolvedValue({ id: "c1", circleId: "c1" });
      mockPrisma.circleKnowledgeCandidate.update.mockResolvedValue({ id: "c1", status: "rejected" });

      const result = await svc.rejectCandidate("c1", "c1");
      expect(result.status).toBe("rejected");
    });
  });

  describe("export", () => {
    it("导出JSON格式", async () => {
      mockPrisma.circleKnowledge.findMany.mockResolvedValue([
        { id: "k1", sourceType: "article", content: "内容1", addedAt: new Date() },
      ]);
      const result = await svc.exportJson("c1");
      expect(result.exportVersion).toBe("1.0");
      expect(result.items).toHaveLength(1);
    });

    it("导出Markdown格式", async () => {
      mockPrisma.circleKnowledge.findMany.mockResolvedValue([
        { id: "k1", sourceType: "manual", content: "内容", addedAt: new Date() },
      ]);
      mockPrisma.circle.findUnique.mockResolvedValue({ name: "国学交流圈" });
      const result = await svc.exportMarkdown("c1");
      expect(result.markdown).toContain("国学交流圈");
      expect(result.filename).toContain("knowledge-");
    });
  });

  // 坏味道 P2-4：入参归一化（safePagination），防非法 page/pageSize 致 skip:NaN/负数进 Prisma 抛 500
  describe("分页入参加固（P2-4）", () => {
    it("list: 非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.circleKnowledge.findMany.mockResolvedValue([]);
      mockPrisma.circleKnowledge.count.mockResolvedValue(0);
      await svc.list("c1", { page: "abc" as any, pageSize: 20 });
      const arg = mockPrisma.circleKnowledge.findMany.mock.calls.at(-1)![0];
      expect(Number.isNaN(arg.skip)).toBe(false);
      expect(arg.skip).toBe(0);
    });
  });
});
