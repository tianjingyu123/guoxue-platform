import { Test, TestingModule } from "@nestjs/testing";
import { ToolRegistryController } from "./tool-registry.controller";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolAiService } from "./tool-ai.service";
import { ToolCalculationService } from "./tool-calculation.service";

const mockRegistry = {
  getDirectory: jest.fn(),
  getAllTools: jest.fn(),
  getByCategory: jest.fn(),
  getToolById: jest.fn(),
  getInputSchema: jest.fn(),
};

const mockToolAi = {
  analyze: jest.fn(),
  getAnalysisRecord: jest.fn(),
  getUserHistory: jest.fn(),
};

const mockCalculator = {
  calculate: jest.fn(),
};

describe("ToolRegistryController", () => {
  let ctrl: ToolRegistryController;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      controllers: [ToolRegistryController],
      providers: [
        { provide: ToolRegistryService, useValue: mockRegistry },
        { provide: ToolAiService, useValue: mockToolAi },
        { provide: ToolCalculationService, useValue: mockCalculator },
      ],
    }).compile();
    ctrl = mod.get(ToolRegistryController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("GET /tools/directory", () => {
    it("返回首页工具目录", () => {
      mockRegistry.getDirectory.mockReturnValue({ categories: [{ name: "命理", tools: [] }] });
      const result = ctrl.getDirectory();
      expect(result).toHaveProperty("categories");
    });
  });

  describe("GET /tools", () => {
    it("返回全部工具列表", () => {
      mockRegistry.getAllTools.mockReturnValue([{ id: "bazi", name: "八字排盘", visible: true }]);
      const result = ctrl.getAll();
      expect(result).toHaveLength(1);
    });
  });

  describe("GET /tools/category/:category", () => {
    it("按分类获取工具", () => {
      mockRegistry.getByCategory.mockReturnValue([{ id: "bazi", name: "八字排盘" }]);
      const result = ctrl.getByCategory("命理");
      expect(result.tools).toHaveLength(1);
    });
  });

  describe("GET /tools/:id", () => {
    it("获取单个工具详情", () => {
      mockRegistry.getToolById.mockReturnValue({ id: "bazi", name: "八字排盘", description: "专业八字命理分析" });
      const result = ctrl.getById("bazi");
      expect(result).toHaveProperty("name", "八字排盘");
    });

    it("不存在的工具返回null", () => {
      mockRegistry.getToolById.mockReturnValue(undefined);
      const result = ctrl.getById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("GET /tools/:id/input-schema", () => {
    it("获取工具输入Schema", () => {
      mockRegistry.getInputSchema.mockReturnValue({ type: "object", properties: { name: { type: "string" } } });
      const result = ctrl.getInputSchema("bazi");
      expect(result).toHaveProperty("type", "object");
    });

    it("无Schema返回null", () => {
      mockRegistry.getInputSchema.mockReturnValue(null);
      const result = ctrl.getInputSchema("unknown");
      expect(result).toBeNull();
    });
  });

  describe("POST /tools/:id/analyze", () => {
    it("执行工具AI分析", async () => {
      mockToolAi.analyze.mockResolvedValue({ id: "a1", content: "命理分析结果" });
      const result = await ctrl.analyze(
        "bazi",
        { user: { id: "u1" } },
        { input: { name: "测试" }, result: { siZhu: {} } },
      );
      expect(result).toHaveProperty("content", "命理分析结果");
    });

    it("未登录用户使用anonymous标识", async () => {
      mockToolAi.analyze.mockResolvedValue({ id: "a2" });
      await ctrl.analyze("bazi", {}, { input: {}, result: {} });
      expect(mockToolAi.analyze).toHaveBeenCalledWith("anonymous", undefined, expect.any(Object));
    });
  });

  describe("GET /tools/analysis/:analysisId", () => {
    it("获取AI分析记录详情", async () => {
      mockToolAi.getAnalysisRecord.mockResolvedValue({ id: "a1", content: "详细分析" });
      const result = await ctrl.getAnalysisRecord("a1", { user: { id: "u1" } });
      expect(result).toHaveProperty("id", "a1");
    });
  });

  describe("GET /tools/analysis/history/mine", () => {
    it("获取用户AI分析历史（默认分页）", async () => {
      mockToolAi.getUserHistory.mockResolvedValue({ records: [], total: 0 });
      const result = await ctrl.getUserAnalysisHistory({ user: { id: "u1" } });
      expect(mockToolAi.getUserHistory).toHaveBeenCalledWith("u1", 1, 20);
      expect(result).toHaveProperty("total", 0);
    });

    it("自定义分页参数", async () => {
      mockToolAi.getUserHistory.mockResolvedValue({ records: [], total: 0 });
      await ctrl.getUserAnalysisHistory({ user: { id: "u1" } }, "2", "10");
      expect(mockToolAi.getUserHistory).toHaveBeenCalledWith("u1", 2, 10);
    });

    it("未登录用户使用anonymous", async () => {
      mockToolAi.getUserHistory.mockResolvedValue({ records: [], total: 0 });
      await ctrl.getUserAnalysisHistory({});
      expect(mockToolAi.getUserHistory).toHaveBeenCalledWith("anonymous", 1, 20);
    });
  });
});
