import { Test } from "@nestjs/testing";
import { BusinessException } from "../../common/business.exception";
import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSSE = { encode: jest.fn((chunk: any) => `data: ${JSON.stringify(chunk)}\n\n`), writeSseStream: jest.fn() } as any;

describe("AiGatewayController", () => {
  let ctrl: AiGatewayController;
  let gateway: jest.Mocked<AiGatewayService>;
  let router: jest.Mocked<ModelRouterService>;

  const mockReq = { user: { id: "u1" } } as any;

  const mockRes = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.flushHeaders = jest.fn().mockReturnValue(res);
    res.write = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  };

  const chatDto = {
    scene: "general",
    messages: [{ role: "user" as const, content: "你好" }],
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AiGatewayController],
      providers: [
        { provide: StreamUnifierService, useValue: mockSSE },
        {
          provide: AiGatewayService,
          useValue: { chat: jest.fn(), chatStream: jest.fn() },
        },
        {
          provide: ModelRouterService,
          useValue: {
            getRoutingConfig: jest.fn(),
            getSceneBudgets: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(AiGatewayController);
    gateway = mod.get(AiGatewayService) as jest.Mocked<AiGatewayService>;
    router = mod.get(ModelRouterService) as jest.Mocked<ModelRouterService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("chat — 非流式对话", () => {
    it("调用 service.chat 并返回结果", async () => {
      gateway.chat.mockResolvedValue({
        content: "你好，有什么可以帮助？",
        model: "deepseek-v4-flash",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });

      const result = await ctrl.chat(chatDto, mockReq);

      expect(gateway.chat).toHaveBeenCalledWith({
        scene: "general",
        userId: "u1",
        messages: [{ role: "user", content: "你好" }],
        options: { temperature: 0.7, maxTokens: 2048, topP: 0.9 },
      });
      expect(result.content).toBe("你好，有什么可以帮助？");
      expect(result.model).toBe("deepseek-v4-flash");
    });

    it("不传可选参数时 options 字段全为 undefined", async () => {
      gateway.chat.mockResolvedValue({
        content: "ok",
        model: "deepseek-v4-flash",
      });
      const minimalDto = {
        scene: "general",
        messages: [{ role: "user" as const, content: "hi" }],
      };

      await ctrl.chat(minimalDto, mockReq);

      expect(gateway.chat).toHaveBeenCalledWith({
        scene: "general",
        userId: "u1",
        messages: [{ role: "user", content: "hi" }],
        options: {
          temperature: undefined,
          maxTokens: undefined,
          topP: undefined,
        },
      });
    });

    it("service 抛出「未配置」错误时转为 503", async () => {
      gateway.chat.mockRejectedValue(new Error("场景未配置"));

      await expect(ctrl.chat(chatDto, mockReq)).rejects.toThrow(BusinessException);
    });

    it("service 抛出其他错误时透传", async () => {
      const err = new Error("未知错误");
      gateway.chat.mockRejectedValue(err);

      await expect(ctrl.chat(chatDto, mockReq)).rejects.toThrow(err);
    });
  });

  describe("chatStream — 流式对话 (SSE)", () => {
    it("发送 SSE 数据块并正确结束", async () => {
      async function* gen() {
        yield "欢";
        yield "迎";
      }
      gateway.chatStream.mockReturnValue(gen());
      const res = mockRes();

      await ctrl.chatStream(chatDto, mockReq, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(res.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
      expect(res.write).toHaveBeenCalledWith('data: {"type":"chunk","content":"欢"}\n\n');
      expect(res.write).toHaveBeenCalledWith('data: {"type":"chunk","content":"迎"}\n\n');
      expect(res.write).toHaveBeenCalledWith('data: {"type":"done"}\n\n');
      expect(res.end).toHaveBeenCalled();
    });

    it("流中发生错误时发送 error 事件并结束", async () => {
      async function* gen() {
        throw new Error("流式错误");
        yield "never";
      }
      gateway.chatStream.mockReturnValue(gen());
      const res = mockRes();

      await ctrl.chatStream(chatDto, mockReq, res);

      expect(res.write).toHaveBeenCalledWith(
        'data: {"type":"error","message":"流式错误"}\n\n',
      );
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe("getRoutingConfig — 路由配置（管理员）", () => {
    it("调用 router.getRoutingConfig", async () => {
      router.getRoutingConfig.mockResolvedValue({
        default: { model: "gpt-4" },
        scenes: {},
      });

      const result = await ctrl.getRoutingConfig();

      expect(router.getRoutingConfig).toHaveBeenCalled();
      expect(result).toEqual({ default: { model: "gpt-4" }, scenes: {} });
    });
  });

  describe("getSceneBudgets — 场景预算", () => {
    it("调用 router.getSceneBudgets", async () => {
      router.getSceneBudgets.mockResolvedValue({
        defaultModel: "deepseek-v4-flash",
        scenes: {
          general: { used: 100, limit: 1000, remaining: 900, percentage: 10 },
        },
        totalScenes: 1,
      });

      const result = await ctrl.getSceneBudgets();

      expect(router.getSceneBudgets).toHaveBeenCalled();
      expect(result.defaultModel).toBe("deepseek-v4-flash");
      expect(result.scenes.general.used).toBe(100);
    });
  });
});
