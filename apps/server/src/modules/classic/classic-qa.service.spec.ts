import { Test } from "@nestjs/testing";
import { ClassicQaService } from "./classic-qa.service";
import { RagService } from "../ai-gateway/rag.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { VectorService } from "../ai-gateway/vector.service";

const mockRag = {
  searchContext: jest.fn(),
};

const mockGateway = {
  chat: jest.fn(),
  chatStream: jest.fn(),
};

const mockVector = {} as any;

describe("ClassicQaService", () => {
  let svc: ClassicQaService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ClassicQaService,
        { provide: RagService, useValue: mockRag },
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: VectorService, useValue: mockVector },
      ],
    }).compile();
    svc = mod.get(ClassicQaService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("ask", () => {
    it("检索到相关片段时生成回答含引用", async () => {
      mockRag.searchContext.mockResolvedValue([
        { content: "学而时习之，不亦说乎", similarity: 0.92, bookName: "论语", chapterName: "学而篇" },
      ]);
      mockGateway.chat.mockResolvedValue({ content: "这段话的意思是..." });

      const result = await svc.ask("什么是学而时习之？");
      expect(result.answer).toBeDefined();
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].bookName).toBe("论语");
      expect(mockRag.searchContext).toHaveBeenCalledWith("什么是学而时习之？", [], 5);
    });

    it("无相关片段时返回友好提示", async () => {
      mockRag.searchContext.mockResolvedValue([]);
      const result = await svc.ask("未知内容");
      expect(result.answer).toContain("暂未收录");
      expect(result.citations).toHaveLength(0);
      expect(mockGateway.chat).not.toHaveBeenCalled();
    });

    it("传递历史对话给 AI", async () => {
      mockRag.searchContext.mockResolvedValue([
        { content: "有朋自远方来", similarity: 0.9, bookName: "论语", chapterName: "学而篇" },
      ]);
      mockGateway.chat.mockResolvedValue({ content: "ok" });
      const history = [{ role: "user" as const, content: "之前的问题" }];

      await svc.ask("继续", "user1", history);
      expect(mockGateway.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          messages: expect.arrayContaining(history),
        }),
      );
    });
  });

  describe("askStream", () => {
    it("流式返回 AI 生成内容", async () => {
      mockRag.searchContext.mockResolvedValue([
        { content: "子曰：学而时习之", similarity: 0.9 },
      ]);

      const fakeStream = async function* () {
        yield "这段话";
        yield "的意思是";
      };
      mockGateway.chatStream.mockReturnValue(fakeStream());

      const chunks: string[] = [];
      for await (const chunk of svc.askStream("什么是学而时习之？")) {
        chunks.push(chunk);
      }
      expect(chunks.join("")).toBe("这段话的意思是");
    });

    it("无上下文时流式返回提示", async () => {
      mockRag.searchContext.mockResolvedValue([]);
      const chunks: string[] = [];
      for await (const chunk of svc.askStream("未知")) {
        chunks.push(chunk);
      }
      expect(chunks[0]).toContain("暂未收录");
    });
  });

  describe("getHistory", () => {
    it("返回空历史列表", async () => {
      const result = await svc.getHistory("classic1");
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("indexClassicTexts", () => {
    it("返回 0（已委托给定时任务）", async () => {
      const result = await svc.indexClassicTexts();
      expect(result).toBe(0);
    });
  });
});
