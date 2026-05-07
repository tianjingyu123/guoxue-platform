import { Test } from "@nestjs/testing";
import { SystemService } from "./system.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  configSystem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
};

describe("SystemService", () => {
  let svc: SystemService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [SystemService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(SystemService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getAllConfigs", () => {
    it("返回所有配置项", async () => {
      const configs = [{ configKey: "key1", configValue: "val1" }, { configKey: "key2", configValue: "val2" }];
      mockPrisma.configSystem.findMany.mockResolvedValue(configs);
      const result = await svc.getAllConfigs();
      expect(result).toEqual(configs);
      expect(mockPrisma.configSystem.findMany).toHaveBeenCalledWith({ orderBy: { configKey: "asc" } });
    });
    it("没有配置时返回空数组", async () => {
      mockPrisma.configSystem.findMany.mockResolvedValue([]);
      const result = await svc.getAllConfigs();
      expect(result).toEqual([]);
    });
  });

  describe("getConfig", () => {
    it("返回指定配置", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "home_banners", configValue: "[]" });
      const result = await svc.getConfig("home_banners");
      expect(result!.configValue).toBe("[]");
    });
    it("配置不存在返回 null", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      const result = await svc.getConfig("not-exists");
      expect(result).toBeNull();
    });
  });

  describe("setConfig", () => {
    it("新建配置（upsert）", async () => {
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "new_key", configValue: "value" });
      const result = await svc.setConfig("new_key", "value", "描述", "admin");
      expect(result.configKey).toBe("new_key");
    });
    it("更新已有配置", async () => {
      const updated = { configKey: "existing_key", configValue: "new_value", description: "新描述", updatedBy: "admin" };
      mockPrisma.configSystem.upsert.mockResolvedValue(updated);
      const result = await svc.setConfig("existing_key", "new_value", "新描述", "admin");
      expect(result.configValue).toBe("new_value");
    });
  });

  describe("deleteConfig", () => {
    it("删除配置成功", async () => {
      mockPrisma.configSystem.delete.mockResolvedValue({ configKey: "key_to_delete" });
      const result = await svc.deleteConfig("key_to_delete");
      expect(result.configKey).toBe("key_to_delete");
    });
  });

  describe("getPublicConfigs", () => {
    it("返回键值对映射", async () => {
      mockPrisma.configSystem.findMany.mockResolvedValue([
        { configKey: "home_banners", configValue: '[{"image":"b1.jpg"}]' },
        { configKey: "site_name", configValue: "国学平台" },
      ]);
      const result = await svc.getPublicConfigs(["home_banners", "site_name"]);
      expect(result.home_banners).toBe('[{"image":"b1.jpg"}]');
      expect(result.site_name).toBe("国学平台");
    });
    it("部分 key 无配置时只返回存在的", async () => {
      mockPrisma.configSystem.findMany.mockResolvedValue([
        { configKey: "exists", configValue: "value" },
      ]);
      const result = await svc.getPublicConfigs(["exists", "missing"]);
      expect(Object.keys(result)).toEqual(["exists"]);
    });
    it("空数组返回空对象", async () => {
      mockPrisma.configSystem.findMany.mockResolvedValue([]);
      const result = await svc.getPublicConfigs([]);
      expect(result).toEqual({});
    });
  });
});
