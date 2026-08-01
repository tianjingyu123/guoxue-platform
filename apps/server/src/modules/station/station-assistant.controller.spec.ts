import type { Request, Response } from "express";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { StationAssistantController } from "./station-assistant.controller";
import { StationAssistantService } from "./station-assistant.service";

describe("StationAssistantController", () => {
  const assistant = {
    chat: jest.fn(),
    chatStream: jest.fn(),
    getSession: jest.fn(),
    clearSession: jest.fn(),
  };
  const sse = { writeSseStream: jest.fn() };
  let controller: StationAssistantController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StationAssistantController(
      assistant as unknown as StationAssistantService,
      sse as unknown as StreamUnifierService,
    );
  });

  it("非流式对话委托当前登录用户", async () => {
    assistant.chat.mockResolvedValue({ content: "答复", conversationId: "conversation-1" });
    await controller.chat({ user: { id: "user-1" } } as unknown as Request, {
      query: "怎么经营？",
    });
    expect(assistant.chat).toHaveBeenCalledWith("user-1", { query: "怎么经营？" });
  });

  it("流式对话使用标准 SSE 写入器并下发 conversationId 与免责声明", async () => {
    const stream = asyncChunks("第一段");
    assistant.chatStream.mockResolvedValue({
      stream,
      conversationId: "66666666-6666-4666-8666-666666666666",
      disclaimer: "仅供经营参考",
    });
    const res = {} as Response;

    await controller.chatStream(
      { user: { id: "user-1" } } as unknown as Request,
      { query: "怎么经营？" },
      res,
    );

    expect(sse.writeSseStream).toHaveBeenCalledWith(
      res,
      stream,
      undefined,
      {
        conversationId: "66666666-6666-4666-8666-666666666666",
        disclaimer: "仅供经营参考",
      },
      "before",
    );
  });

  it("会话恢复与清空均绑定当前登录用户", async () => {
    const query = { conversationId: "77777777-7777-4777-8777-777777777777" };
    await controller.getSession({ user: { id: "user-1" } } as unknown as Request, query);
    await controller.clearSession({ user: { id: "user-1" } } as unknown as Request, query);
    expect(assistant.getSession).toHaveBeenCalledWith("user-1", query.conversationId);
    expect(assistant.clearSession).toHaveBeenCalledWith("user-1", query.conversationId);
  });
});

function asyncChunks(...chunks: string[]): AsyncIterable<string> {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}
