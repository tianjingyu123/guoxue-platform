import { Test, TestingModule } from "@nestjs/testing";
import { RagService } from "./rag.service";
import { VectorService } from "./vector.service";
import { AiGatewayService } from "./ai-gateway.service";
import { KnowledgeQualityService } from "./knowledge-quality.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("RagService", () => {
  let svc: RagService;
  let vector: any;
  let gateway: any;
  let prisma: any;

  beforeEach(async () => {
    vector = {
      embed: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      searchCircleKnowledge: jest.fn().mockResolvedValue([
        { id: "k1", content: "论语：学而时习之", similarity: 0.95, sourceType: "article" },
        { id: "k2", content: "不亦乐乎", similarity: 0.88, sourceType: "post" },
      ]),
      searchAllKnowledge: jest.fn().mockResolvedValue([]),
      searchGlobalKnowledge: jest.fn().mockResolvedValue([]),
      findUnindexed: jest.fn().mockResolvedValue([]),
      storeCircleKnowledge: jest.fn(),
    };

    gateway = {
      chat: jest.fn().mockResolvedValue({
        content: "根据知识库，学而时习之是论语开篇...",
        model: "deepseek-v4-flash",
        usage: { totalTokens: 100 },
      }),
      chatStream: jest.fn(),
    };

    prisma = {
      ragPromptTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
      circleKnowledge: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: VectorService, useValue: vector },
        { provide: AiGatewayService, useValue: gateway },
        { provide: PrismaService, useValue: prisma },
        { provide: KnowledgeQualityService, useValue: { score: jest.fn().mockReturnValue(0.7) } },
      ],
    }).compile();

    svc = mod.get(RagService);
  });

  describe("askCircle", () => {
    it("向量化问题并返回答案+来源", async () => {
      const result = await svc.askCircle("什么是学而时习之", "c1");

      expect(result.answer).toContain("学而时习之");
      expect(result.sources).toHaveLength(2);
      // searchFederated 按来源层级重标 sourceType：圈子本地命中统一标 "circle"
      expect(result.sources[0].sourceType).toBe("circle");
      expect(vector.embed).toHaveBeenCalledWith(["什么是学而时习之"]);
      expect(vector.searchCircleKnowledge).toHaveBeenCalledWith(
        expect.any(Array), "c1", 5,
      );
    });

    it("知识库为空时走通用大模型兜底（第三级）", async () => {
      vector.searchCircleKnowledge.mockResolvedValue([]);
      vector.searchGlobalKnowledge.mockResolvedValue([]);

      const result = await svc.askCircle("问题", "c1");
      // 三级兜底：本地+全局均无命中 → 通用大模型作答，sources 为空
      expect(result.sources).toHaveLength(0);
      expect(result.answer).toBeTruthy();
      expect(gateway.chat).toHaveBeenCalled();
    });

    it("Embedding 失败时降级为通用兜底（不抛异常）", async () => {
      vector.embed.mockResolvedValue([]);

      // searchFederated 内 queryVec 为空即返回 []，askCircle 以 .catch 兜底，优雅降级而非抛错
      const result = await svc.askCircle("问题", "c1");
      expect(result.sources).toHaveLength(0);
      expect(result.answer).toBeTruthy();
    });

    it("使用数据库 Prompt 模板", async () => {
      prisma.ragPromptTemplate.findFirst.mockResolvedValue({
        scene: "circle_assistant",
        systemPrompt: "你是{{circleId}}圈子的国学助手，请用优雅的古文风格回答。",
        status: "ACTIVE",
      });

      const result = await svc.askCircle("什么是仁", "c3");
      expect(result.answer).toBeDefined();
      const chatCall = gateway.chat.mock.calls[0][0];
      const systemMessages = chatCall.messages.filter((m: any) => m.role === "system");
      expect(systemMessages.some((m: any) => m.content.includes("c3"))).toBe(true);
    });
  });

  describe("askCircleStream", () => {
    it("流式返回答案", async () => {
      gateway.chatStream = jest.fn(async function* () {
        yield "根据";
        yield "知识库";
        yield "...";
      });

      const chunks: string[] = [];
      for await (const c of svc.askCircleStream("提问", "c1")) {
        chunks.push(c);
      }
      expect(chunks).toEqual(["根据", "知识库", "..."]);
    });

    it("知识库为空时流式走通用大模型兜底", async () => {
      vector.searchCircleKnowledge.mockResolvedValue([]);
      vector.searchGlobalKnowledge.mockResolvedValue([]);
      gateway.chatStream = jest.fn(async function* () {
        yield "通用";
        yield "兜底";
      });

      const chunks: string[] = [];
      for await (const c of svc.askCircleStream("提问", "c1")) {
        chunks.push(c);
      }
      // 空库时仍流式调用大模型兜底输出
      expect(chunks.join("")).toContain("兜底");
    });
  });

  describe("searchContext", () => {
    it("跨圈子检索知识库", async () => {
      vector.searchAllKnowledge.mockResolvedValue([
        { id: "k3", content: "知识点", similarity: 0.8, sourceType: "course" },
      ]);

      const results = await svc.searchContext("问题", ["c1", "c2"], 3);
      expect(results).toHaveLength(1);
      expect(vector.searchAllKnowledge).toHaveBeenCalledWith(
        expect.any(Array), ["c1", "c2"], 3,
      );
    });

    it("Embedding 失败时返回空数组", async () => {
      vector.embed.mockResolvedValue([]);
      const results = await svc.searchContext("问题", ["c1"]);
      expect(results).toEqual([]);
    });
  });

  describe("indexUnindexed", () => {
    it("索引未向量化的知识库条目", async () => {
      vector.findUnindexed.mockResolvedValue([
        { id: "k1", content: "内容1" },
        { id: "k2", content: "内容2" },
      ]);
      vector.embed.mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]);

      const count = await svc.indexUnindexed(50);
      expect(count).toBe(2);
      expect(vector.storeCircleKnowledge).toHaveBeenCalledTimes(2);
    });

    it("无未索引内容时返回0", async () => {
      vector.findUnindexed.mockResolvedValue([]);
      const count = await svc.indexUnindexed();
      expect(count).toBe(0);
    });
  });
});
