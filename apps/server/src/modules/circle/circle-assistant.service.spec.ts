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
      // 问话人身份要一路传给 RAG——助理据此调整回答角度，早先角色查出来就丢了
      // 身份与称呼都要传给 RAG：三个对话入口共用同一套称呼口径
      expect(mockRag.askCircle).toHaveBeenCalledWith(
        "问题", "circle-1", "user-1", undefined,
        { role: "MEMBER", joinedAt: undefined },
        undefined, // 未注入称呼服务时为 undefined，助理一律用「你」
      );
    });

    it("传递历史记录", async () => {
      const history = [{ role: "user", content: "hi" }];
      mockRag.askCircle.mockResolvedValue({ answer: "ok", sources: [] });

      await svc.ask("问题", "circle-1", "user-1", history as any);
      expect(mockRag.askCircle).toHaveBeenCalledWith(
        "问题", "circle-1", "user-1", history,
        { role: "MEMBER", joinedAt: undefined },
        undefined,
      );
    });

    it("非成员拒绝且不调用 RagService", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      await expect(svc.ask("问题", "circle-1", "user-x")).rejects.toThrow();
      expect(mockRag.askCircle).not.toHaveBeenCalled();
    });

    it("圈子停用后成员也不能提问", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue({ role: "MEMBER", expireAt: null, circle: { status: "DISABLED", deletedAt: null } });
      await expect(svc.ask("问题", "circle-1", "user-1")).rejects.toThrow("不可用");
      expect(mockRag.askCircle).not.toHaveBeenCalled();
    });
  });

  describe("askStream", () => {
    it("成员校验通过后委托给 RagService.askCircleStream", async () => {
      mockRag.askCircleStream.mockReturnValue((async function* () { yield "流"; })());

      const chunks: string[] = [];
      for await (const c of svc.askStream("hello", "circle-1", "user-1")) chunks.push(c);

      expect(chunks).toEqual(["流"]);
      expect(mockRag.askCircleStream).toHaveBeenCalledWith("hello", "circle-1", "user-1", undefined, {
        role: "MEMBER",
        joinedAt: undefined,
      });
    });

    it("非成员拒绝", async () => {
      mockPrisma.circleMember.findUnique.mockResolvedValue(null);
      const iterate = async () => { for await (const _ of svc.askStream("hello", "circle-1", "user-x")) { /* noop */ } };
      await expect(iterate()).rejects.toThrow();
    });
  });
});
