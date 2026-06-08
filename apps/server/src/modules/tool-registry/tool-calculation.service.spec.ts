import { Test, TestingModule } from "@nestjs/testing";
import { ToolCalculationService } from "./tool-calculation.service";
import { WannianliService } from "../wannianli/wannianli.service";

describe("ToolCalculationService", () => {
  let svc: ToolCalculationService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ToolCalculationService,
        {
          provide: WannianliService,
          useValue: {
            getByDateRange: jest.fn().mockResolvedValue([]),
            getJieQiByYear: jest.fn().mockResolvedValue([]),
            buildDayDetail: jest.fn(),
          },
        },
      ],
    }).compile();
    svc = mod.get(ToolCalculationService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("calculate", () => {
    it("已知 toolId 返回计算结果", async () => {
      const result = await svc.calculate({ toolId: "bazi", input: { datetime: "2025-01-01T12:00:00" } });
      expect(result.toolId).toBe("bazi");
      expect(result.result).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("未知 toolId 抛出异常", async () => {
      await expect(svc.calculate({ toolId: "unknown-tool", input: {} })).rejects.toThrow("暂未实现");
    });

    it("calculateAsync 与 calculate 行为一致", async () => {
      const result = await svc.calculateAsync({ toolId: "bazi", input: {} });
      expect(result.toolId).toBe("bazi");
    });
  });
});
