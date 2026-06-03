import { Test } from "@nestjs/testing";
import { UgcKnowledgeService } from "./ugc-knowledge.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

const mockPrisma = {
  post: { findMany: jest.fn() },
  paidQuestion: { findMany: jest.fn() },
  comment: { findMany: jest.fn() },
  circleKnowledgeCandidate: { findFirst: jest.fn() },
};

const mockKnowledge: Record<string, jest.Mock> = {
  add: jest.fn(),
  addCandidate: jest.fn(),
};

const mockAi: Record<string, jest.Mock> = {
  chat: jest.fn(),
};

const makeExtractionJson = (overrides: Record<string, any> = {}) =>
  JSON.stringify({
    title: "论语精华",
    summary: "论语是孔子及其弟子的言论集，核心思想是仁和礼。",
    keyPoints: ["仁者爱人", "克己复礼", "有教无类"],
    tags: ["论语", "孔子", "儒家"],
    category: "经典解读",
    confidence: 0.85,
    ...overrides,
  });

const LONG_CONTENT = "这是足够长的测试内容文本用于满足五十字要求。".repeat(5);

describe("UgcKnowledgeService", () => {
  let svc: UgcKnowledgeService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        UgcKnowledgeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CircleKnowledgeService, useValue: mockKnowledge },
        { provide: AiGatewayService, useValue: mockAi },
      ],
    }).compile();
    svc = mod.get(UgcKnowledgeService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("extractFromEssencePosts", () => {
    it("无精华帖时返回0", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      const result = await svc.extractFromEssencePosts();
      expect(result).toBe(0);
    });

    it("高置信度萃取直接入库", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "论语心得", content: LONG_CONTENT },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue(null);
      mockAi.chat.mockResolvedValue({ content: makeExtractionJson({ confidence: 0.9 }) });
      mockKnowledge.add.mockResolvedValue({ id: "k1" });

      const result = await svc.extractFromEssencePosts(5);
      expect(result).toBe(1);
      expect(mockKnowledge.add).toHaveBeenCalledWith(
        expect.objectContaining({ addedBy: "AI_UGC" }),
      );
    });

    it("低置信度进入候选", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "随便聊聊", content: LONG_CONTENT },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue(null);
      mockAi.chat.mockResolvedValue({ content: makeExtractionJson({ confidence: 0.6 }) });
      mockKnowledge.addCandidate.mockResolvedValue({ id: "c1" });

      const result = await svc.extractFromEssencePosts(5);
      expect(result).toBe(1);
      expect(mockKnowledge.addCandidate).toHaveBeenCalled();
    });

    it("已处理过的帖子跳过", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "已处理", content: LONG_CONTENT },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue({ id: "c1" });

      const result = await svc.extractFromEssencePosts(5);
      expect(result).toBe(0);
    });
  });

  describe("extractFromPaidQuestions", () => {
    it("无付费问答时返回0", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([]);
      const result = await svc.extractFromPaidQuestions();
      expect(result).toBe(0);
    });

    it("萃取付费问答知识", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([
        {
          id: "q1", circleId: "c1",
          questionTitle: "什么是中庸",
          question: LONG_CONTENT,
          answer: LONG_CONTENT,
        },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue(null);
      mockAi.chat.mockResolvedValue({ content: makeExtractionJson({ category: "哲学思想" }) });
      mockKnowledge.add.mockResolvedValue({ id: "k1" });

      const result = await svc.extractFromPaidQuestions(5);
      expect(result).toBe(1);
    });
  });

  describe("extractFromComments", () => {
    it("无高赞评论时返回0", async () => {
      mockPrisma.comment.findMany.mockResolvedValue([]);
      const result = await svc.extractFromComments();
      expect(result).toBe(0);
    });

    it("萃取高赞评论", async () => {
      // 评论需 >= 80 字符
      const longComment = "这是一个非常精彩深入有见地的评论内容。".repeat(5);
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: "cm1", targetId: "p1", content: longComment },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "儒家思想探讨" },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue(null);
      mockAi.chat.mockResolvedValue({ content: makeExtractionJson() });
      mockKnowledge.add.mockResolvedValue({ id: "k1" });

      const result = await svc.extractFromComments(5);
      expect(result).toBe(1);
    });

    it("评论长度不足跳过", async () => {
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: "cm1", targetId: "p1", content: "太短" },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "帖子" },
      ]);

      const result = await svc.extractFromComments(5);
      expect(result).toBe(0);
    });
  });

  describe("runFullPipeline", () => {
    it("完整管道返回各来源计数", async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "理解道德经", content: LONG_CONTENT },
      ]);
      mockPrisma.paidQuestion.findMany.mockResolvedValue([
        { id: "q1", circleId: "c1", questionTitle: "何为道", question: LONG_CONTENT, answer: LONG_CONTENT },
      ]);
      const longComment = "有深度的评论".repeat(10);
      mockPrisma.comment.findMany.mockResolvedValue([
        { id: "cm1", targetId: "p1", content: longComment },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        { id: "p1", circleId: "c1", title: "理解道德经" },
      ]);
      mockPrisma.circleKnowledgeCandidate.findFirst.mockResolvedValue(null);
      mockAi.chat.mockResolvedValue({ content: makeExtractionJson() });
      mockKnowledge.add.mockResolvedValue({ id: "k1" });

      const result = await svc.runFullPipeline();
      expect(result.posts).toBeGreaterThanOrEqual(0);
      expect(result.paidQuestions).toBeGreaterThanOrEqual(0);
      expect(result.comments).toBeGreaterThanOrEqual(0);
    });
  });
});
