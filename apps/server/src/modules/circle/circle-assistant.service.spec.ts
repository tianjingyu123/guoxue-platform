import { Test, TestingModule } from "@nestjs/testing";
import { CircleAssistantService } from "./circle-assistant.service";
import { RagService } from "../ai-gateway/rag.service";

const mockRag = {
  askCircle: jest.fn(),
  askCircleStream: jest.fn(),
};

describe("CircleAssistantService", () => {
  let svc: CircleAssistantService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CircleAssistantService,
        { provide: RagService, useValue: mockRag },
      ],
    }).compile();
    svc = mod.get(CircleAssistantService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("ask", () => {
    it("委托给 RagService.askCircle", async () => {
      mockRag.askCircle.mockResolvedValue({ answer: "你好", sources: [] });

      const result = await svc.ask("问题", "circle-1", "user-1");
      expect(result.answer).toBe("你好");
      expect(mockRag.askCircle).toHaveBeenCalledWith("问题", "circle-1", "user-1", undefined);
    });

    it("传递历史记录", async () => {
      const history = [{ role: "user", content: "hi" }];
      mockRag.askCircle.mockResolvedValue({ answer: "ok", sources: [] });

      await svc.ask("问题", "circle-1", "user-1", history as any);
      expect(mockRag.askCircle).toHaveBeenCalledWith("问题", "circle-1", "user-1", history);
    });
  });

  describe("askStream", () => {
    it("委托给 RagService.askCircleStream", () => {
      mockRag.askCircleStream.mockReturnValue((async function* () { yield "流"; })());

      const result = svc.askStream("hello", "circle-1");
      expect(result).toBeDefined();
      expect(mockRag.askCircleStream).toHaveBeenCalledWith("hello", "circle-1", undefined, undefined);
    });
  });
});
