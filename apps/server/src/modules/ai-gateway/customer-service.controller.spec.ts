import { Test } from "@nestjs/testing";
import { BusinessException } from "../../common/business.exception";
import { CustomerServiceController } from "./customer-service.controller";
import { CustomerServiceService } from "./customer-service.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockSSE = { encode: jest.fn((chunk: any) => `data: ${JSON.stringify(chunk)}\n\n`), writeSseStream: jest.fn() } as any;

describe("CustomerServiceController", () => {
  let ctrl: CustomerServiceController;
  let svc: jest.Mocked<CustomerServiceService>;

  const mockReq = { user: { id: "u1", nickname: "测试用户" } } as any;

  const mockRes = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.flushHeaders = jest.fn().mockReturnValue(res);
    res.write = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CustomerServiceController],
      providers: [
        { provide: StreamUnifierService, useValue: mockSSE },
        {
          provide: CustomerServiceService,
          useValue: { ask: jest.fn(), askStream: jest.fn() },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CustomerServiceController);
    svc = mod.get(CustomerServiceService) as jest.Mocked<CustomerServiceService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ask — 非流式对话", () => {
    it("调用 service.ask 并返回结果", async () => {
      svc.ask.mockResolvedValue({
        answer: "你好，我是智能助手",
        needHuman: false,
        sources: [{ content: "参考1", similarity: 0.95 }],
      });

      const result = await ctrl.ask({ question: "你好", history: [] }, mockReq);

      expect(svc.ask).toHaveBeenCalledWith("你好", "u1", []);
      expect(result.answer).toBe("你好，我是智能助手");
      expect(result.needHuman).toBe(false);
    });

    it("不传 history 时传入 undefined", async () => {
      svc.ask.mockResolvedValue({ answer: "ok", needHuman: false });

      await ctrl.ask({ question: "test" } as any, mockReq);

      expect(svc.ask).toHaveBeenCalledWith("test", "u1", undefined);
    });

    it("service 抛出「未配置」错误时转为 503", async () => {
      svc.ask.mockRejectedValue(new Error("AI未配置"));

      await expect(ctrl.ask({ question: "q" } as any, mockReq)).rejects.toThrow(BusinessException);
    });

    it("service 抛出其他错误时透传", async () => {
      const otherErr = new Error("其他错误");
      svc.ask.mockRejectedValue(otherErr);

      await expect(ctrl.ask({ question: "q" } as any, mockReq)).rejects.toThrow(
        otherErr,
      );
    });
  });

  describe("askStream — 流式对话 (SSE)", () => {
    it("发送 SSE 数据块并正确结束", async () => {
      async function* gen() {
        yield "片";
        yield "段";
      }
      svc.askStream.mockReturnValue(gen());
      const res = mockRes();

      await ctrl.askStream({ question: "q", history: [] }, mockReq, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(res.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
      expect(res.write).toHaveBeenCalledWith('data: {"type":"chunk","content":"片"}\n\n');
      expect(res.write).toHaveBeenCalledWith('data: {"type":"chunk","content":"段"}\n\n');
      expect(res.write).toHaveBeenCalledWith('data: {"type":"done"}\n\n');
      expect(res.end).toHaveBeenCalled();
    });

    it("流中发生错误时发送 error 事件并结束", async () => {
      async function* gen() {
        throw new Error("SSE出错");
        yield "never";
      }
      svc.askStream.mockReturnValue(gen());
      const res = mockRes();

      await ctrl.askStream({ question: "q" } as any, mockReq, res);

      expect(res.write).toHaveBeenCalledWith('data: {"type":"error","message":"SSE出错"}\n\n');
      expect(res.end).toHaveBeenCalled();
    });
  });
});
