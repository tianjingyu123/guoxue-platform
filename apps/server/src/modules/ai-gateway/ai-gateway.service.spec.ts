import { Test, TestingModule } from "@nestjs/testing";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { ClaudeAdapter } from "./adapters/claude.adapter";
import { QwenAdapter } from "./adapters/qwen.adapter";
import { LocalModelAdapter } from "./adapters/local.adapter";
import { MultiAgentService } from "./adapters/multi-agent.service";
import { MultimodalService } from "./adapters/multimodal.service";
import { SemanticCacheService } from "./semantic-cache.service";
import { MetricsService } from "../../common/metrics.service";
import { AiTimeoutError } from "./adapters/base.adapter";

function asyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: async () =>
          i < items.length
            ? { value: items[i++], done: false }
            : { value: undefined as any, done: true },
      };
    },
  };
}

function asyncIterableError<T>(first: T, err: Error): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let consumed = false;
      return {
        next: async () => {
          if (!consumed) { consumed = true; return { value: first, done: false }; }
          throw err;
        },
      };
    },
  };
}

const baseResolve = {
  model: "deepseek-v4-flash",
  provider: "deepseek" as const,
  fallbackModel: "deepseek-v4-flash",
  fallbackProvider: "deepseek" as const,
  options: { temperature: 0.3, maxTokens: 2048, topP: 0.9 },
};

describe("AiGatewayService", () => {
  let svc: AiGatewayService;
  let mockRouter: jest.Mocked<ModelRouterService>;
  let mockAiLogger: jest.Mocked<AiLoggerService>;
  let mockDeepSeek: jest.Mocked<DeepSeekAdapter>;
  const req = { scene: "test", messages: [{ role: "user" as const, content: "hi" }] };

  beforeEach(async () => {
    mockRouter = { resolve: jest.fn() } as any;
    mockAiLogger = { log: jest.fn().mockResolvedValue(undefined) } as any;
    mockDeepSeek = { chat: jest.fn(), chatStream: jest.fn() } as any;
    const mockSemCache = { lookup: jest.fn().mockResolvedValue(null), store: jest.fn().mockResolvedValue(undefined) } as any;
    const mockMetrics = { recordAiCall: jest.fn(), recordExternalApi: jest.fn() } as any;
    const mockMultiAgent = { setGateway: jest.fn() };
    const mockMultimodal = { setGateway: jest.fn() };
    const mockClaude = { chat: jest.fn(), chatStream: jest.fn() };
    const mockQwen = { chat: jest.fn(), chatStream: jest.fn() };
    const mockLocal = { chat: jest.fn(), chatStream: jest.fn() };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        { provide: ModelRouterService, useValue: mockRouter },
        { provide: AiLoggerService, useValue: mockAiLogger },
        { provide: DeepSeekAdapter, useValue: mockDeepSeek },
        { provide: ClaudeAdapter, useValue: mockClaude },
        { provide: QwenAdapter, useValue: mockQwen },
        { provide: LocalModelAdapter, useValue: mockLocal },
        { provide: SemanticCacheService, useValue: mockSemCache },
        { provide: MetricsService, useValue: mockMetrics },
        { provide: MultiAgentService, useValue: mockMultiAgent },
        { provide: MultimodalService, useValue: mockMultimodal },
      ],
    }).compile();
    svc = mod.get(AiGatewayService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe("chat", () => {
    it("直接返回主模型结果", async () => {
      mockRouter.resolve.mockResolvedValue(baseResolve);
      mockDeepSeek.chat.mockResolvedValue({ content: "结果", model: "deepseek-v4-flash" });
      const result = await svc.chat(req);
      expect(result.content).toBe("结果");
      expect(mockDeepSeek.chat).toHaveBeenCalledTimes(1);
    });

    it("主模型失败时降级到 fallbackModel", async () => {
      mockRouter.resolve.mockResolvedValue({ ...baseResolve, model: "main", provider: "deepseek" as const, fallbackModel: "backup", fallbackProvider: "deepseek" as const });
      mockDeepSeek.chat.mockRejectedValueOnce(new Error("挂了")).mockResolvedValueOnce({ content: "降级", model: "backup" });
      const result = await svc.chat(req);
      expect(result.content).toBe("降级");
      expect(mockDeepSeek.chat).toHaveBeenNthCalledWith(2, "backup", req.messages, expect.any(Object));
    });

    it("AiTimeoutError 触发降级", async () => {
      mockRouter.resolve.mockResolvedValue({ ...baseResolve, model: "main", provider: "deepseek" as const, fallbackModel: "backup", fallbackProvider: "deepseek" as const });
      mockDeepSeek.chat.mockRejectedValueOnce(new AiTimeoutError()).mockResolvedValueOnce({ content: "ok", model: "backup" });
      const result = await svc.chat(req);
      expect(result.content).toBe("ok");
    });

    it("无 fallbackModel 时重新抛出原始错误", async () => {
      mockRouter.resolve.mockResolvedValue({ ...baseResolve, fallbackModel: undefined, fallbackProvider: undefined });
      mockDeepSeek.chat.mockRejectedValue(new Error("不可恢复"));
      await expect(svc.chat(req)).rejects.toThrow("不可恢复");
      expect(mockDeepSeek.chat).toHaveBeenCalledTimes(1);
    });

    it("成功响应后调用 aiLogger.log", async () => {
      mockRouter.resolve.mockResolvedValue(baseResolve);
      mockDeepSeek.chat.mockResolvedValue({ content: "r", model: "deepseek-v4-flash", usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 } });
      await svc.chat({ ...req, userId: "u1" });
      expect(mockAiLogger.log).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", scene: "test" }));
    });
  });

  describe("chatStream", () => {
    it("正常产出主模型的数据块", async () => {
      mockRouter.resolve.mockResolvedValue(baseResolve);
      mockDeepSeek.chatStream.mockReturnValue(asyncIterable(["a", "b", "c"]));
      const collected: string[] = [];
      for await (const chunk of svc.chatStream(req)) collected.push(chunk);
      expect(collected).toEqual(["a", "b", "c"]);
    });

    it("主模型失败时降级到 fallbackModel", async () => {
      mockRouter.resolve.mockResolvedValue({ ...baseResolve, model: "main", provider: "deepseek" as const, fallbackModel: "backup", fallbackProvider: "deepseek" as const });
      mockDeepSeek.chatStream.mockReturnValueOnce(asyncIterableError("a", new Error("挂了"))).mockReturnValueOnce(asyncIterable(["b", "c"]));
      const collected: string[] = [];
      for await (const chunk of svc.chatStream(req)) collected.push(chunk);
      expect(collected).toEqual(["a", "\n\n[AI服务切换中，以下内容由备用模型生成]\n\n", "b", "c"]);
      expect(mockDeepSeek.chatStream).toHaveBeenCalledTimes(2);
    });

    it("AiTimeoutError 触发流式降级", async () => {
      mockRouter.resolve.mockResolvedValue({ ...baseResolve, model: "main", provider: "deepseek" as const, fallbackModel: "backup", fallbackProvider: "deepseek" as const });
      mockDeepSeek.chatStream.mockReturnValueOnce(asyncIterableError("x", new AiTimeoutError())).mockReturnValueOnce(asyncIterable(["y", "z"]));
      const collected: string[] = [];
      for await (const chunk of svc.chatStream(req)) collected.push(chunk);
      expect(collected).toEqual(["x", "\n\n[AI服务切换中，以下内容由备用模型生成]\n\n", "y", "z"]);
    });
  });
});
