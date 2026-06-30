import { Test, TestingModule } from "@nestjs/testing";
import { CircleAssistantService } from "./circle-assistant.service";
import { RagService } from "../ai-gateway/rag.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockRag = {
  askCircle: jest.fn(),
  askCircleStream: jest.fn(),
};

const mockPrisma = {
  circleMember: { findUnique: jest.fn() },
};

describe("CircleAssistantService", () => {
  let svc: CircleAssistantService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CircleAssistantService,
        { provide: RagService, useValue: mockRag },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(CircleAssistantService);
    jest.clearAllMocks();
    // 默认：调用者是该圈有效成员
    mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER", expireAt: null });
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("ask", () => {
    it("成员校验通过后委托给 RagService.askCircle", async () => {
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

    it("非成员拒绝且不调用 RagService", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.ask("问题", "circle-1", "user-x")).rejects.toThrow();
      expect(mockRag.askCircle).not.toHaveBeenCalled();
    });
  });

  describe("askStream", () => {
    it("成员校验通过后委托给 RagService.askCircleStream", async () => {
      mockRag.askCircleStream.mockReturnValue((async function* () { yield "流"; })());

      const chunks: string[] = [];
      for await (const c of svc.askStream("hello", "circle-1", "user-1")) chunks.push(c);

      expect(chunks).toEqual(["流"]);
      expect(mockRag.askCircleStream).toHaveBeenCalledWith("hello", "circle-1", "user-1", undefined);
    });

    it("非成员拒绝", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      const iterate = async () => { for await (const _ of svc.askStream("hello", "circle-1", "user-x")) { /* noop */ } };
      await expect(iterate()).rejects.toThrow();
    });
  });
});
