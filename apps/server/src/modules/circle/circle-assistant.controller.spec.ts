import { Test } from "@nestjs/testing";
import { CircleAssistantController } from "./circle-assistant.controller";
import { CircleAssistantService, AssistantReply } from "./circle-assistant.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSSE = { encode: jest.fn((chunk: any) => `data: ${JSON.stringify(chunk)}\n\n`), writeSseStream: jest.fn() } as any;

describe("CircleAssistantController", () => {
  let ctrl: CircleAssistantController;
  let svc: jest.Mocked<CircleAssistantService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CircleAssistantController],
      providers: [
        { provide: StreamUnifierService, useValue: mockSSE },
        {
          provide: CircleAssistantService,
          useValue: {
            ask: jest.fn(),
            askStream: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CircleAssistantController);
    svc = mod.get(CircleAssistantService) as jest.Mocked<CircleAssistantService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = (userId = "u1") => ({ user: { id: userId } }) as any;
  const mockRes = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.flushHeaders = jest.fn().mockReturnValue(res);
    res.write = jest.fn().mockReturnValue(true);
    res.end = jest.fn().mockReturnValue(res);
    return res as any;
  };

  const reply: AssistantReply = {
    answer: "这是一个回答",
    sources: [{ id: "s1", content: "来源内容", similarity: 0.95 }],
  };

  describe("askSimple", () => {
    it("向圈主助理提问（简化路径），调用 service.ask 并返回结果", async () => {
      svc.ask.mockResolvedValue(reply);
      const result = await ctrl.askSimple("circle1", { question: "国学的起源？" }, mockReq("u1"));
      expect(svc.ask).toHaveBeenCalledWith("国学的起源？", "circle1", "u1");
      expect(result).toEqual(reply);
    });

    it("circleId 和 question 为空字符串时仍透传给 service", async () => {
      svc.ask.mockResolvedValue(reply);
      await ctrl.askSimple("", { question: "" }, mockReq());
      expect(svc.ask).toHaveBeenCalledWith("", "", "u1");
    });
  });

  describe("ask", () => {
    it("非流式提问，带 history 参数", async () => {
      svc.ask.mockResolvedValue(reply);
      const history = [{ role: "user" as const, content: "你好" }];
      const result = await ctrl.ask("circle1", { question: "你是谁？", history }, mockReq("u1"));
      expect(svc.ask).toHaveBeenCalledWith("你是谁？", "circle1", "u1", history);
      expect(result).toEqual(reply);
    });

    it("非流式提问，不传 history 时默认 undefined", async () => {
      svc.ask.mockResolvedValue(reply);
      await ctrl.ask("circle1", { question: "简单问" }, mockReq("u1"));
      expect(svc.ask).toHaveBeenCalledWith("简单问", "circle1", "u1", undefined);
    });

    it("service 抛出异常时向上传递", async () => {
      svc.ask.mockRejectedValue(new Error("服务错误"));
      await expect(ctrl.ask("circle1", { question: "问" }, mockReq("u1"))).rejects.toThrow("服务错误");
    });
  });

  describe("askStream", () => {
    function makeAsyncIterable(chunks: string[]): AsyncIterable<string> {
      return {
        [Symbol.asyncIterator]: () => {
          let i = 0;
          return {
            next: async () => {
              if (i < chunks.length) return { value: chunks[i++], done: false };
              return { value: undefined, done: true };
            },
          };
        },
      };
    }

    it("流式提问，逐块写入 SSE 响应", async () => {
      const res = mockRes();
      svc.askStream.mockReturnValue(makeAsyncIterable(["块1", "块2"]));

      await ctrl.askStream("circle1", { question: "流式问" }, mockReq("u1"), res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ type: "chunk", content: "块1" })}\n\n`);
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ type: "chunk", content: "块2" })}\n\n`);
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      expect(res.end).toHaveBeenCalled();
    });

    it("流式提问带 history", async () => {
      const res = mockRes();
      svc.askStream.mockReturnValue(makeAsyncIterable(["带历史流式回答"]));

      const history = [{ role: "system" as const, content: "你是一个助手" }];
      await ctrl.askStream("circle1", { question: "问", history }, mockReq("u1"), res);

      expect(svc.askStream).toHaveBeenCalledWith("问", "circle1", "u1", history);
      expect(res.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: "chunk", content: "带历史流式回答" })}\n\n`,
      );
    });

    it("流式提问异常时写入错误消息并结束", async () => {
      const res = mockRes();
      const badIterable = {
        [Symbol.asyncIterator]: () => ({
          next: async () => { throw new Error("流式错误"); },
        }),
      };
      svc.askStream.mockReturnValue(badIterable);

      await ctrl.askStream("circle1", { question: "问" }, mockReq("u1"), res);

      expect(res.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: "error", message: "流式错误" })}\n\n`,
      );
      expect(res.end).toHaveBeenCalled();
    });
  });
});
