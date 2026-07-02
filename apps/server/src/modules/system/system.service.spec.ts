import { Test } from "@nestjs/testing";
import { SystemService } from "./system.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { ThirdPartyConfigLoader } from "./third-party-config.loader";

const mockPrisma = {
  configSystem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
};
const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), getJson: jest.fn(), setJson: jest.fn() };
const mockAudit = { log: jest.fn() };
const mockThirdParty = {
  isThirdPartyKey: jest.fn().mockReturnValue(false),
  buildDisplayValue: jest.fn((_k: string, v: string) => v),
  buildStoredValue: jest.fn(async (_k: string, v: string) => v),
  syncToEnv: jest.fn().mockResolvedValue(undefined),
};

describe("SystemService", () => {
  let svc: SystemService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditService, useValue: mockAudit },
        { provide: ThirdPartyConfigLoader, useValue: mockThirdParty },
      ],
    }).compile();
    svc = mod.get(SystemService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getAllConfigs", () => {
    it("返回所有配置项", async () => {
      const configs = [{ configKey: "key1", configValue: "val1" }, { configKey: "key2", configValue: "val2" }];
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.configSystem.findMany.mockResolvedValue(configs);
      const result = await svc.getAllConfigs();
      expect(result).toEqual(configs);
    });
    it("命中缓存时直接返回", async () => {
      const cached = [{ configKey: "k1", configValue: "v1" }];
      mockRedis.getJson.mockResolvedValue(cached);
      const result = await svc.getAllConfigs();
      expect(result).toEqual(cached);
      expect(mockPrisma.configSystem.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getConfig", () => {
    it("返回指定配置", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "home_banners", configValue: "[]" });
      const result = await svc.getConfig("home_banners");
      expect(result!.configValue).toBe("[]");
    });
    it("命中缓存直接返回", async () => {
      mockRedis.getJson.mockResolvedValue({ configKey: "k", configValue: "v" });
      const result = await svc.getConfig("k");
      expect(result!.configValue).toBe("v");
      expect(mockPrisma.configSystem.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("setConfig", () => {
    it("新建配置并失效缓存", async () => {
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "new_key", configValue: "value" });
      await svc.setConfig("new_key", "value", "描述", "admin");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:all");
    });
  });

  describe("deleteConfig", () => {
    it("删除配置并失效缓存", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "key_to_delete", configValue: "v" });
      mockPrisma.configSystem.delete.mockResolvedValue({ configKey: "key_to_delete" });
      await svc.deleteConfig("key_to_delete");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:key_to_delete");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:all");
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
