import { Test } from "@nestjs/testing";
import { AiLoggerService } from "./ai-logger.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("AiLoggerService", () => {
  let svc: AiLoggerService;

  const mockPrisma = {
    aiAnalysisRecord: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [AiLoggerService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(AiLoggerService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("log", () => {
    const logParams = {
      userId: "u1",
      scene: "chat",
      model: "deepseek-chat",
      fallbackUsed: false,
      latency: 120,
      inputSummary: "用户提问",
      outputSummary: "AI回答",
      promptTokens: 50,
      completionTokens: 100,
    };

    it("写入记录成功", async () => {
      mockPrisma.aiAnalysisRecord.create.mockResolvedValue({ id: "rec1" });
      await svc.log(logParams);
      expect(mockPrisma.aiAnalysisRecord.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.aiAnalysisRecord.create.mock.calls[0][0].data.scene).toBe("chat");
    });

    it("静默捕获 DB 异常不抛出", async () => {
      mockPrisma.aiAnalysisRecord.create.mockRejectedValue(new Error("DB down"));
      await expect(svc.log(logParams)).resolves.toBeUndefined();
    });
  });

  describe("query", () => {
    it("返回分页结果", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([{ id: "r1", scene: "chat" }]);
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(1);

      const result = await svc.query({ page: 2, pageSize: 10 });
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it("按场景筛选数组", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([]);
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0);

      await svc.query({ scenes: ["chat", "media_audit"] });
      const whereArg = mockPrisma.aiAnalysisRecord.findMany.mock.calls[0][0].where;
      expect(whereArg.scene).toEqual({ in: ["chat", "media_audit"] });
    });

    it("按日期范围筛选", async () => {
      mockPrisma.aiAnalysisRecord.findMany.mockResolvedValue([]);
      mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0);

      await svc.query({ startDate: "2025-01-01", endDate: "2025-12-31" });
      const whereArg = mockPrisma.aiAnalysisRecord.findMany.mock.calls[0][0].where;
      expect(whereArg.createdAt).toBeDefined();
      expect(whereArg.createdAt.gte).toBeInstanceOf(Date);
      expect(whereArg.createdAt.lte).toBeInstanceOf(Date);
    });
  });
});
