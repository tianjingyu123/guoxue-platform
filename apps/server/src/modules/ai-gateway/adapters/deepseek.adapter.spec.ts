import { DeepSeekAdapter } from "./deepseek.adapter";
import { AiTimeoutError } from "./base.adapter";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockSSEResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (i < chunks.length) {
            return { done: false, value: encoder.encode(chunks[i++]) };
          }
          return { done: true, value: undefined };
        },
        releaseLock: jest.fn(),
      }),
    },
    text: async () => chunks.join(""),
  };
}

describe("DeepSeekAdapter", () => {
  let adapter: DeepSeekAdapter;

  beforeEach(() => {
    process.env.DEEPSEEK_BASE_URL = "https://api.deepseek.com";
    process.env.DEEPSEEK_API_KEY = "test-key";
    adapter = new DeepSeekAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("chat", () => {
    it("正常返回 content / model / usage", async () => {
      const apiResponse = {
        choices: [{ message: { content: "你好，世界" }, finish_reason: "stop" }],
        model: "deepseek-v4-flash",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
        text: async () => "",
      });

      const result = await adapter.chat("deepseek-v4-flash", [
        { role: "user", content: "你好" },
      ]);

      expect(result).toEqual({
        content: "你好，世界",
        model: "deepseek-v4-flash",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: "stop",
      });
    });

    it("fetch 抛出 AbortError 时抛出 AiTimeoutError", async () => {
      mockFetch.mockRejectedValue({ name: "AbortError" });

      await expect(
        adapter.chat("model", [{ role: "user", content: "hi" }]),
      ).rejects.toThrow(AiTimeoutError);
    });

    it("API 返回非 200 时抛出 Error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      });

      await expect(
        adapter.chat("model", [{ role: "user", content: "hi" }]),
      ).rejects.toThrow("DeepSeek API返回 429");
    });

    it("DEEPSEEK_API_KEY 未配置时抛出 Error", async () => {
      const originalKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "";
      const adapterNoKey = new DeepSeekAdapter();

      await expect(
        adapterNoKey.chat("model", [{ role: "user", content: "hi" }]),
      ).rejects.toThrow("AI服务未配置");

      process.env.DEEPSEEK_API_KEY = originalKey;
    });

    it("默认超时为 30000ms", async () => {
      const spy = jest.spyOn(AbortSignal, "timeout");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
        text: async () => "",
      });

      await adapter.chat("model", [{ role: "user", content: "hi" }]);
      expect(spy).toHaveBeenCalledWith(30000);
      spy.mockRestore();
    });
  });

  describe("chatStream", () => {
    it("逐块产出 SSE delta 内容", async () => {
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n',
        "data: [DONE]\n\n",
      ];
      mockFetch.mockResolvedValue(mockSSEResponse(sseChunks));

      const collected: string[] = [];
      for await (const chunk of adapter.chatStream("model", [
        { role: "user", content: "hi" },
      ])) {
        collected.push(chunk);
      }

      expect(collected).toEqual(["你好", "世界"]);
    });

    it("fetch 抛出 AbortError 时抛出 AiTimeoutError", async () => {
      mockFetch.mockRejectedValue({ name: "AbortError" });

      const iter = adapter.chatStream("model", [
        { role: "user", content: "hi" },
      ]);
      await expect((async () => {
        for await (const _ of iter) { void _; }
      })()).rejects.toThrow(AiTimeoutError);
    });
  });
});
