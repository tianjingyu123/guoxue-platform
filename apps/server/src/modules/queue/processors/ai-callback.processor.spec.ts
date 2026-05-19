import { Test, TestingModule } from "@nestjs/testing";
import { AiCallbackProcessor, AiCallbackJobData } from "./ai-callback.processor";
import { PrismaService } from "../../../prisma/prisma.service";
import { AiLoggerService } from "../../ai-gateway/ai-logger.service";
import { Job } from "bullmq";

function mockJob(data: AiCallbackJobData): Job<AiCallbackJobData> {
  return { id: "job-1", data, opts: {} } as Job<AiCallbackJobData>;
}

describe("AiCallbackProcessor", () => {
  let processor: AiCallbackProcessor;
  let prisma: any;
  let aiLogger: any;

  beforeEach(async () => {
    prisma = {
      botChatLog: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), upsert: jest.fn() },
    };
    aiLogger = { log: jest.fn().mockResolvedValue(undefined) };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AiCallbackProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: AiLoggerService, useValue: aiLogger },
      ],
    }).compile();

    processor = mod.get(AiCallbackProcessor);
  });

  describe("process", () => {
    it("chat.completion 回调 — 记录AI日志", async () => {
      await processor.process(mockJob({
        provider: "deepseek",
        requestId: "req-1",
        endpoint: "chat.completion",
        payload: { content: "回复内容", model: "deepseek-v4", latency: 1200 },
      }));

      expect(aiLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scene: "callback.deepseek",
          model: "deepseek-v4",
          inputSummary: expect.stringContaining("COMPLETED"),
        }),
      );
    });

    it("chat.completion 错误时记录失败状态", async () => {
      await processor.process(mockJob({
        provider: "deepseek",
        requestId: "req-2",
        endpoint: "chat.completion",
        payload: { error: "timeout", model: "deepseek" },
      }));

      expect(aiLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackUsed: true,
          inputSummary: expect.stringContaining("FAILED"),
        }),
      );
    });

    it("stream.error 回调 — 记录流式错误+fallback", async () => {
      await processor.process(mockJob({
        provider: "deepseek",
        requestId: "req-3",
        endpoint: "stream.error",
        payload: { error: "连接中断", fallbackModel: "qwen-turbo", latency: 5000 },
      }));

      expect(aiLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scene: "callback.deepseek.error",
          fallbackUsed: true,
          fallbackModel: "qwen-turbo",
        }),
      );
    });

    it("bot.message 回调 — upsert BotChatLog", async () => {
      await processor.process(mockJob({
        provider: "coze",
        requestId: "botlog-1",
        endpoint: "bot.message",
        payload: {
          userId: "u1",
          botConfigId: "bot-cfg-1",
          question: "什么是论语？",
          answer: "论语是...",
          conversationId: "conv-1",
        },
      }));

      expect(prisma.botChatLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: "u1",
            query: "什么是论语？",
            response: "论语是...",
          }),
        }),
      );
    });

    it("通用回调 — 记录AI日志", async () => {
      await processor.process(mockJob({
        provider: "openai",
        requestId: "req-4",
        endpoint: "custom.endpoint",
        payload: { custom: "data" },
      }));

      expect(aiLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          scene: "callback.openai.custom.endpoint",
        }),
      );
    });
  });
});
