import { Test, TestingModule } from "@nestjs/testing";
import { ModelRouterService } from "./model-router.service";
import { SystemService } from "../system/system.service";
import { PrismaService } from "../../prisma/prisma.service";

const fullConfig = {
  default: {
    model: "deepseek-v4-flash",
    fallbackModel: "deepseek-v4-flash",
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
  },
  scenes: {
    chat: {
      model: "gpt-4o",
      fallbackModel: "gpt-4o-mini",
    },
    vision: {
      model: "deepseek-v4-flash",
      fallbackModel: "deepseek-v4-flash",
      grayRelease: { newModel: "gpt-4o", percentage: 30 },
      budgetControl: { monthlyTokenLimit: 1_000_000, lightModel: "deepseek-v3" },
    },
  },
};

describe("ModelRouterService", () => {
  let svc: ModelRouterService;
  let mockSystem: jest.Mocked<SystemService>;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockSystem = { getConfig: jest.fn() } as any;
    mockPrisma = { $queryRawUnsafe: jest.fn() } as any;

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ModelRouterService,
        { provide: SystemService, useValue: mockSystem },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    svc = mod.get(ModelRouterService);
    jest.spyOn(Date, "now").mockImplementation(() => 1_000_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("resolve", () => {
    it("场景无配置时返回默认模型", async () => {
      mockSystem.getConfig.mockResolvedValue(null);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 0n, total_completion: 0n },
      ]);

      const result = await svc.resolve("unknown-scene");

      expect(result.model).toBe("deepseek-v4-flash");
      expect(result.fallbackModel).toBe("deepseek-v4-flash");
      expect(result.options).toEqual({
        temperature: 0.3,
        maxTokens: 2048,
        topP: 0.9,
      });
    });

    it("返回场景专属模型配置", async () => {
      mockSystem.getConfig.mockResolvedValue({
        configValue: JSON.stringify(fullConfig),
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 0n, total_completion: 0n },
      ]);

      const result = await svc.resolve("chat");

      expect(result.model).toBe("gpt-4o");
      expect(result.fallbackModel).toBe("gpt-4o-mini");
    });

    it("灰度命中时返回 grayReleaseModel", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.1);
      mockSystem.getConfig.mockResolvedValue({
        configValue: JSON.stringify(fullConfig),
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 0n, total_completion: 0n },
      ]);

      const result = await svc.resolve("vision");

      expect(result.grayReleaseModel).toBe("gpt-4o");
    });

    it("月度用量超限时降级到 lightModel", async () => {
      mockSystem.getConfig.mockResolvedValue({
        configValue: JSON.stringify(fullConfig),
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 600_000n, total_completion: 500_000n },
      ]);

      const result = await svc.resolve("vision");

      expect(result.model).toBe("deepseek-v3");
      expect(result.costCapped).toBe(true);
    });
  });

  describe("缓存", () => {
    it("5 分钟内复用缓存，不重复调用 SystemService", async () => {
      mockSystem.getConfig.mockResolvedValue({
        configValue: JSON.stringify(fullConfig),
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 0n, total_completion: 0n },
      ]);

      await svc.resolve("chat");
      await svc.resolve("chat");
      await svc.resolve("vision");

      expect(mockSystem.getConfig).toHaveBeenCalledTimes(1);
    });

    it("clearCache 后重新拉取配置", async () => {
      mockSystem.getConfig.mockResolvedValue({
        configValue: JSON.stringify(fullConfig),
      });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { total_prompt: 0n, total_completion: 0n },
      ]);

      await svc.resolve("chat");
      svc.clearCache();
      await svc.resolve("chat");

      expect(mockSystem.getConfig).toHaveBeenCalledTimes(2);
    });
  });
});
