import { Test } from "@nestjs/testing";
import { CanActivate, HttpException } from "@nestjs/common";
import { AiSearchController } from "./ai-search.controller";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

const mockGateway: Record<string, jest.Mock> = {
  chat: jest.fn(),
  chatStream: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

const makeReq = (overrides: Record<string, any> = {}): any => ({
  user: { id: "u1", roles: [] }, ...overrides,
});

const makeRes = (): any => ({
  setHeader: jest.fn(),
  flushHeaders: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
});

describe("AiSearchController", () => {
  let ctrl: AiSearchController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AiSearchController],
      providers: [{ provide: AiGatewayService, useValue: mockGateway }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(StrictRedisThrottleGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(AiSearchController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  describe("aiQuery", () => {
    it("AI智能搜索返回答案", async () => {
      mockGateway.chat.mockResolvedValue({ content: "国学是以儒学为主体的中国传统文化体系。" });
      const result: any = await ctrl.aiQuery({ query: "什么是国学" } as any, makeReq());
      expect(result.answer).toContain("国学");
      expect(result.query).toBe("什么是国学");
      expect(mockGateway.chat).toHaveBeenCalledWith(
        expect.objectContaining({ scene: "smart_search" }),
      );
    });

    it("AI未配置时返回503", async () => {
      mockGateway.chat.mockRejectedValue(new Error("模型未配置"));
      await expect(ctrl.aiQuery({ query: "测试" } as any, makeReq())).rejects.toThrow(HttpException);
    });

    it("非配置错误原样抛出", async () => {
      mockGateway.chat.mockRejectedValue(new Error("网络超时"));
      await expect(ctrl.aiQuery({ query: "测试" } as any, makeReq())).rejects.toThrow("网络超时");
    });
  });

  describe("searchSummary", () => {
    it("生成搜索结果总结", async () => {
      mockGateway.chat.mockResolvedValue({ content: "总结：论语是孔子及其弟子的言论集。" });
      const body = {
        query: "论语",
        results: [{ title: "论语简介", content: "论语是儒家经典..." }],
      };
      const result: any = await ctrl.searchSummary(body as any, makeReq());
      expect(result.summary).toContain("总结");
      expect(mockGateway.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
          ]),
        }),
      );
    });

    it("AI未配置时返回503", async () => {
      mockGateway.chat.mockRejectedValue(new Error("模型未配置，请先配置AI服务"));
      const body = { query: "测试", results: [] };
      await expect(ctrl.searchSummary(body as any, makeReq())).rejects.toThrow(HttpException);
    });
  });

  describe("searchSummaryStream", () => {
    it("SSE流式输出总结", async () => {
      const res = makeRes();
      mockGateway.chatStream.mockReturnValue({
        [Symbol.asyncIterator]() {
          let i = 0;
          const chunks = ["这是", "总结", "内容"];
          return {
            next: async () => {
              if (i < chunks.length) return { value: chunks[i++], done: false };
              return { value: undefined, done: true };
            },
          };
        },
      });

      const body = {
        query: "论语",
        results: [{ title: "论语", content: "...", url: "https://example.com" }],
      };
      await ctrl.searchSummaryStream(body as any, makeReq(), res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining("data:"));
      expect(res.write).toHaveBeenCalledWith("data: [DONE]\n\n");
      expect(res.end).toHaveBeenCalled();
    });

    it("流式输出异常时发送错误事件并结束", async () => {
      const res = makeRes();
      mockGateway.chatStream.mockReturnValue({
        [Symbol.asyncIterator]() {
          return {
            next: async () => { throw new Error("连接中断"); },
          };
        },
      });

      const body = { query: "测试", results: [] };
      await ctrl.searchSummaryStream(body as any, makeReq(), res);

      expect(res.write).toHaveBeenCalledWith(expect.stringContaining("连接中断"));
      expect(res.end).toHaveBeenCalled();
    });
  });
});
