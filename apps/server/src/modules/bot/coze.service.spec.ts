import { Test } from "@nestjs/testing";
import { CozeService } from "./coze.service";
import { lastValueFrom, toArray } from "rxjs";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("CozeService", () => {
  let svc: CozeService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [CozeService],
    }).compile();
    svc = mod.get(CozeService);
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  const chatParams = {
    botId: "bot_001",
    apiKey: "sk-test-key",
    userId: "user_001",
    query: "你好",
  };

  const chatResponse = {
    code: 0,
    data: {
      id: "chat_001",
      conversation_id: "conv_001",
    },
  };

  const assistantMessage = {
    role: "assistant",
    type: "answer",
    content: "你好，有什么可以帮助你的？",
  };

  describe("chat", () => {
    it("成功发起对话并返回结果", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: async () => chatResponse })
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, data: [assistantMessage] }),
        });

      const result = await svc.chat(chatParams);

      expect(result).toEqual({
        chatId: "chat_001",
        conversationId: "conv_001",
        content: "你好，有什么可以帮助你的？",
        messages: [assistantMessage],
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.coze.cn/v3/chat",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer sk-test-key" }),
          body: expect.stringContaining("bot_001"),
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("chat/message/list"),
        expect.any(Object),
      );
    });

    it("支持 conversationId 和 additionalParams 参数传递", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: async () => chatResponse })
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, data: [assistantMessage] }),
        });

      await svc.chat({
        ...chatParams,
        conversationId: "existing_conv",
        additionalParams: { temperature: 0.7 },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.conversation_id).toBe("existing_conv");
      expect(requestBody.additional_params).toEqual({ temperature: 0.7 });
    });

    it("支持 chatHistory 参数传递", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: async () => chatResponse })
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, data: [assistantMessage] }),
        });

      await svc.chat({
        ...chatParams,
        chatHistory: [
          { role: "user", content: "上一条消息" },
          { role: "assistant", content: "上一条回复" },
        ],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // 历史 2 条 + 当前提问 1 条
      expect(requestBody.additional_messages).toHaveLength(3);
      expect(requestBody.additional_messages[0]).toEqual({
        role: "user",
        content: "上一条消息",
        content_type: "text",
      });
      expect(requestBody.additional_messages[2]).toEqual({
        role: "user",
        content: "你好",
        content_type: "text",
      });
    });

    it("当前提问 query 必须作为最后一条 user 消息发送（无历史时）", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: async () => chatResponse })
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, data: [assistantMessage] }),
        });

      await svc.chat(chatParams);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.additional_messages).toEqual([
        { role: "user", content: "你好", content_type: "text" },
      ]);
    });

    it("创建对话 API 返回错误时抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 4000, msg: "invalid bot_id" }),
      });

      await expect(svc.chat(chatParams)).rejects.toThrow(
        "COZE对话失败: invalid bot_id",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("pollChatResult 轮询超时抛出异常", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({ code: 0, data: [] }),
      });

      await expect(
        (svc as any).pollChatResult("chat_001", "conv_001", "sk-test-key", 2),
      ).rejects.toThrow("COZE对话超时，未获取到响应");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it("pollChatResult 第2次才获取到结果", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ code: 0, data: [] }) })
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, data: [assistantMessage] }),
        });

      const result = await (svc as any).pollChatResult(
        "chat_001",
        "conv_001",
        "sk-test-key",
        3,
      );

      expect(result.content).toBe("你好，有什么可以帮助你的？");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it("pollChatResult 获取消息列表失败抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 500, msg: "internal error" }),
      });

      await expect(
        (svc as any).pollChatResult("chat_001", "conv_001", "sk-test-key"),
      ).rejects.toThrow("获取消息列表失败: internal error");
    });
  });

  describe("chatStream", () => {
    function makeSSEReader(...chunks: string[]) {
      const encoded = chunks.map((c) => new TextEncoder().encode(c));
      let idx = 0;
      return {
        read: jest
          .fn()
          .mockImplementation(() => {
            if (idx < encoded.length) {
              return Promise.resolve({ done: false, value: encoded[idx++] });
            }
            return Promise.resolve({ done: true, value: undefined });
          }),
      };
    }

    it("流式对话返回 Observable，逐步发射内容", async () => {
      const reader = makeSSEReader(
        'data: {"content":"你好"}\n\n',
        'data: {"content":"，有什么"}\n\n',
        'data: {"content":"可以帮助你的？"}\n\n',
        "data: [DONE]\n\n",
      );
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      const observable = svc.chatStream(chatParams);
      const result = await lastValueFrom(observable.pipe(toArray()));

      expect(result).toEqual(["你好", "，有什么", "可以帮助你的？"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.coze.cn/v3/chat",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"stream":true'),
        }),
      );
    });

    it("流式对话包含 type=answer 的消息", async () => {
      const reader = makeSSEReader(
        'data: {"type":"answer","content_type":"text","content":"最终答案"}\n\n',
        "data: [DONE]\n\n",
      );
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      const observable = svc.chatStream(chatParams);
      const result = await lastValueFrom(observable.pipe(toArray()));

      // type=answer 且 content_type=text 会发射两次：
      // 一次通过 data.content 发射，一次通过 type=answer 分支
      expect(result).toEqual(["最终答案", "最终答案"]);
    });

    it("收到 event:done 时自动完成", async () => {
      const reader = makeSSEReader("event:done\n\n");
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      const observable = svc.chatStream(chatParams);
      const result = await lastValueFrom(observable.pipe(toArray()));

      expect(result).toEqual([]);
    });

    it("HTTP 非 200 时发射 error", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 401,
        text: async () => "Unauthorized",
      });

      const observable = svc.chatStream(chatParams);
      await expect(lastValueFrom(observable)).rejects.toThrow(
        "COZE流式请求失败: Unauthorized",
      );
    });

    it("无 body 时发射 error", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: null,
      });

      const observable = svc.chatStream(chatParams);
      await expect(lastValueFrom(observable)).rejects.toThrow(
        "无法获取流式响应",
      );
    });

    it("fetch 抛异常时发射 error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("网络断开"));

      const observable = svc.chatStream(chatParams);
      await expect(lastValueFrom(observable)).rejects.toThrow("网络断开");
    });

    it("流式对话支持 conversationId 和 additionalParams", async () => {
      const reader = makeSSEReader("data: [DONE]\n\n");
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      await lastValueFrom(
        svc.chatStream({
          ...chatParams,
          conversationId: "conv_stream",
          additionalParams: { top_p: 0.9 },
        }).pipe(toArray()),
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.conversation_id).toBe("conv_stream");
      expect(requestBody.additional_params).toEqual({ top_p: 0.9 });
    });

    it("处理混合 event 和 data 行", async () => {
      const reader = makeSSEReader(
        'event:message\ndata: {"content":"片段1"}\n\n',
        'event:message\ndata: {"content":"片段2"}\n\n',
        "event:done\n\n",
      );
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      const observable = svc.chatStream(chatParams);
      const result = await lastValueFrom(observable.pipe(toArray()));

      expect(result).toEqual(["片段1", "片段2"]);
    });

    it("处理大缓冲区跨块解析", async () => {
      // 模拟从分块的字节流中正确解析跨块 boundary 的行
      const reader = makeSSEReader(
        'data: {"content":"头部"}\n\nevent:message\nda',
        'ta: {"content":"尾部"}\n\ndata: [DONE]\n\n',
      );
      mockFetch.mockResolvedValueOnce({
        status: 200,
        body: { getReader: () => reader },
      });

      const observable = svc.chatStream(chatParams);
      const result = await lastValueFrom(observable.pipe(toArray()));

      expect(result).toEqual(["头部", "尾部"]);
    });
  });

  describe("getMessages", () => {
    it("成功获取消息列表", async () => {
      const messages = [
        { role: "user", type: "question", content: "你好" },
        { role: "assistant", type: "answer", content: "你好！" },
      ];
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 0, data: messages }),
      });

      const result = await svc.getMessages("conv_001", "chat_001", "sk-key");

      expect(result).toEqual(messages);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("chat/message/list"),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer sk-key" }),
        }),
      );
    });

    it("API 返回错误时抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 400, msg: "conversation not found" }),
      });

      await expect(
        svc.getMessages("conv_not_exist", "chat_001", "sk-key"),
      ).rejects.toThrow("获取消息失败: conversation not found");
    });
  });

  describe("getChatDetail", () => {
    it("成功获取对话详情", async () => {
      const detail = { id: "chat_001", status: "completed" };
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 0, data: detail }),
      });

      const result = await svc.getChatDetail("conv_001", "chat_001", "sk-key");

      expect(result).toEqual(detail);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("chat/retrieve"),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer sk-key" }),
        }),
      );
    });

    it("API 返回错误时抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 404, msg: "chat not found" }),
      });

      await expect(
        svc.getChatDetail("conv_not_exist", "chat_001", "sk-key"),
      ).rejects.toThrow("获取对话详情失败: chat not found");
    });
  });
});
