import { Test } from "@nestjs/testing";
import { AdminModelRoutingController } from "./admin-model-routing.controller";
import { ModelRouterService } from "./model-router.service";
import { SystemService } from "../system/system.service";
import {
  UpdateRoutingConfigDto,
  UpdateSceneRoutingDto,
} from "./dto/admin-model-routing.dto";

describe("AdminModelRoutingController", () => {
  let ctrl: AdminModelRoutingController;
  let modelRouter: jest.Mocked<ModelRouterService>;
  let systemService: jest.Mocked<SystemService>;

  const mockReq = { user: { id: "u1", nickname: "管理员" } } as any;

  const mockConfigRecord = {
    id: "cfg1",
    configKey: "ai_model_routing",
    configValue: "{}",
    description: "AI模型路由配置",
    updatedBy: "管理员",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AdminModelRoutingController],
      providers: [
        {
          provide: ModelRouterService,
          useValue: {
            getRoutingConfig: jest.fn(),
            clearCache: jest.fn(),
            getSceneBudgets: jest.fn(),
          },
        },
        {
          provide: SystemService,
          useValue: {
            setConfig: jest.fn(),
            getConfigVersions: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(AdminModelRoutingController);
    modelRouter = mod.get(ModelRouterService) as jest.Mocked<ModelRouterService>;
    systemService = mod.get(SystemService) as jest.Mocked<SystemService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getConfig — 获取完整路由配置", () => {
    it("调用 modelRouter.getRoutingConfig", async () => {
      modelRouter.getRoutingConfig.mockResolvedValue({
        default: { model: "gpt-4" },
        scenes: {},
      });

      const result = await ctrl.getConfig();

      expect(modelRouter.getRoutingConfig).toHaveBeenCalled();
      expect(result.default.model).toBe("gpt-4");
    });
  });

  describe("updateConfig — 更新完整路由配置", () => {
    it("保存配置到 systemService 并清除缓存", async () => {
      systemService.setConfig.mockResolvedValue(mockConfigRecord);
      modelRouter.clearCache.mockResolvedValue(undefined);
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4" },
      };

      const result = await ctrl.updateConfig(dto, mockReq);

      expect(systemService.setConfig).toHaveBeenCalledWith(
        "ai_model_routing",
        JSON.stringify(dto),
        "AI模型路由配置",
        "管理员",
      );
      expect(modelRouter.clearCache).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it("nickname 不存在时 fallback 到 id", async () => {
      systemService.setConfig.mockResolvedValue(mockConfigRecord);
      const reqNoNick = { user: { id: "u2" } } as any;
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4" },
      };

      await ctrl.updateConfig(dto, reqNoNick);

      expect(systemService.setConfig).toHaveBeenCalledWith(
        "ai_model_routing",
        JSON.stringify(dto),
        "AI模型路由配置",
        "u2",
      );
    });
  });

  describe("updateScene — 更新单个场景配置", () => {
    it("读取现有配置、更新场景、保存并清除缓存", async () => {
      const existingConfig = {
        default: { model: "gpt-4" },
        scenes: { general: { model: "gpt-3.5" } },
      };
      modelRouter.getRoutingConfig.mockResolvedValue(existingConfig);
      systemService.setConfig.mockResolvedValue(mockConfigRecord);
      modelRouter.clearCache.mockResolvedValue(undefined);
      const dto: UpdateSceneRoutingDto = { model: "claude-3" };

      const result = await ctrl.updateScene("general", dto, mockReq);

      expect(modelRouter.getRoutingConfig).toHaveBeenCalled();
      expect(systemService.setConfig).toHaveBeenCalledWith(
        "ai_model_routing",
        JSON.stringify({
          default: { model: "gpt-4" },
          scenes: { general: { model: "claude-3" } },
        }),
        "更新场景: general",
        "管理员",
      );
      expect(modelRouter.clearCache).toHaveBeenCalled();
      expect(result).toEqual({ ok: true, scene: "general" });
    });
  });

  describe("validateConfig — 验证路由配置", () => {
    it("有效配置返回 valid: true", async () => {
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4", fallbackModel: "gpt-3.5" },
      };

      const result = await ctrl.validateConfig(dto);

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.modelCount).toBe(2);
    });

    it("缺少主模型时产生警告", async () => {
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4" },
        scenes: { test: { model: "" } },
      };

      const result = await ctrl.validateConfig(dto);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain("场景 [test] 缺少主模型");
    });

    it("灰度比例超出范围时产生警告", async () => {
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4" },
        scenes: {
          test: {
            model: "gpt-3.5",
            grayRelease: { newModel: "claude", percentage: 150 },
          },
        },
      };

      const result = await ctrl.validateConfig(dto);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain("场景 [test] 灰度比例超出范围");
    });

    it("空 scenes 也为有效", async () => {
      const dto: UpdateRoutingConfigDto = {
        default: { model: "gpt-4" },
        scenes: {},
      };

      const result = await ctrl.validateConfig(dto);

      expect(result.valid).toBe(true);
      expect(result.modelCount).toBe(1);
    });
  });

  describe("getHistory — 配置变更历史", () => {
    it("调用 systemService.getConfigVersions", async () => {
      systemService.getConfigVersions.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      const result = await ctrl.getHistory();

      expect(systemService.getConfigVersions).toHaveBeenCalledWith(
        "ai_model_routing",
        1,
        20,
      );
      expect(result.items).toEqual([]);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("getBudgets — 各场景预算使用情况", () => {
    it("调用 modelRouter.getSceneBudgets", async () => {
      modelRouter.getSceneBudgets.mockResolvedValue({
        defaultModel: "deepseek-v4-flash",
        scenes: {
          general: { used: 500, limit: 10000, remaining: 9500, percentage: 5 },
        },
        totalScenes: 1,
      });

      const result = await ctrl.getBudgets();

      expect(modelRouter.getSceneBudgets).toHaveBeenCalled();
      expect(result.scenes.general.used).toBe(500);
      expect(result.totalScenes).toBe(1);
    });
  });
});
