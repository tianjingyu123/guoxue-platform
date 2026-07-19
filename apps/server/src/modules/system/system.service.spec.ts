import { Test } from "@nestjs/testing";
import { SchedulerRegistry } from "@nestjs/schedule";
import { SystemService } from "./system.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { ThirdPartyConfigLoader } from "./third-party-config.loader";
import { ErrorCode } from "../../common/error-codes";

const mockPrisma = {
  configSystem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  brandConfig: { findUnique: jest.fn(), upsert: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
  siteNotice: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
};
const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), getJson: jest.fn(), setJson: jest.fn() };
const mockAudit = { log: jest.fn(), getLogWithRollback: jest.fn(), listRollbackable: jest.fn() };
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
        { provide: SchedulerRegistry, useValue: { getCronJobs: jest.fn().mockReturnValue(new Map()) } },
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

  describe("getBrandConfig（租-T0 品牌抽象）", () => {
    it("无记录时返回内置默认值（不破坏现状口径）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.brandConfig.findUnique.mockResolvedValue(null);
      const result = await svc.getBrandConfig();
      expect(result.siteName).toBe("热卜国学");
      expect(result.siteNameShort).toBe("热卜");
      expect(result.primaryColor).toBe("#c41e3a");
      expect(mockRedis.setJson).toHaveBeenCalledWith("sys:config:brand", expect.objectContaining({ siteName: "热卜国学" }), expect.any(Number));
    });
    it("有记录时 DB 值覆盖默认值（改一处配置全端生效）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.brandConfig.findUnique.mockResolvedValue({ id: "default", siteName: "道商世界", siteNameShort: "道商" });
      const result = await svc.getBrandConfig();
      expect(result.siteName).toBe("道商世界");
      expect(result.slogan).toBe("探寻东方智慧"); // 未配置字段仍取默认值
    });
    it("命中缓存时不查库", async () => {
      mockRedis.getJson.mockResolvedValue({ siteName: "缓存站名" });
      const result = await svc.getBrandConfig();
      expect(result.siteName).toBe("缓存站名");
      expect(mockPrisma.brandConfig.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("updateBrandConfig（租-T0 品牌抽象）", () => {
    it("upsert 单行记录并失效缓存·undefined 字段不覆盖", async () => {
      mockPrisma.brandConfig.upsert.mockResolvedValue({ id: "default", siteName: "道商世界" });
      await svc.updateBrandConfig({ siteName: " 道商世界 ", slogan: undefined }, "admin");
      expect(mockPrisma.brandConfig.upsert).toHaveBeenCalledWith({
        where: { id: "default" },
        create: { id: "default", siteName: "道商世界", updatedBy: "admin" },
        update: { siteName: "道商世界", updatedBy: "admin" },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:brand");
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

  describe("getPublicSiteNotices", () => {
    it("只查询启用且处于展示时间窗内的公告", async () => {
      mockPrisma.siteNotice.findMany.mockResolvedValue([]);
      mockPrisma.siteNotice.count.mockResolvedValue(0);

      const result = await svc.getPublicSiteNotices(1, 20);

      expect(result).toMatchObject({ items: [], total: 0, page: 1, pageSize: 20 });
      const arg = mockPrisma.siteNotice.findMany.mock.calls[0][0];
      expect(arg.where.isActive).toBe(true);
      expect(arg.where.AND).toHaveLength(2);
      expect(arg.select).not.toHaveProperty("isActive");
    });

    it("详情不返回停用或过期公告", async () => {
      mockPrisma.siteNotice.findFirst.mockResolvedValue(null);
      await expect(svc.getPublicSiteNotice("missing")).rejects.toMatchObject({
        response: expect.objectContaining({ message: "公告不存在" }),
      });
    });
  });

  describe("getSiteNotices", () => {
    it("page=abc 时 skip 不为 NaN（防 Prisma 500）", async () => {
      mockPrisma.siteNotice.findMany.mockResolvedValue([]);
      mockPrisma.siteNotice.count.mockResolvedValue(0);

      await svc.getSiteNotices("abc" as any, 20);
      const arg = mockPrisma.siteNotice.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  // ── 治理护栏 §2.3 · 带回滚配置变更 + 一键回滚（验收标准三演练）──

  describe("setConfigWithRollback", () => {
    it("改配置并写含快照的审计（原值入 rollbackData）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "rec_weight", configValue: "0.5" });
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "rec_weight", configValue: "0.8" });
      mockAudit.log.mockResolvedValue({ id: "audit-1" });

      const res = await svc.setConfigWithRollback("rec_weight", "0.8", "L3自动调权", "CLAUDE", "L3");

      expect(res).toEqual({ key: "rec_weight", value: "0.8", previousValue: "0.5", auditId: "audit-1" });
      const auditArg = mockAudit.log.mock.calls[0][0];
      expect(auditArg.autonomyLevel).toBe("L3");
      expect(auditArg.executor).toBe("CLAUDE");
      expect(auditArg.rollbackData).toEqual({ kind: "config", key: "rec_weight", previousValue: "0.5", previousExists: true });
    });

    it("新建配置时快照标记 previousExists=false", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "brand_new", configValue: "x" });
      mockAudit.log.mockResolvedValue({ id: "audit-2" });

      const res = await svc.setConfigWithRollback("brand_new", "x", "新建", "CLAUDE", "L2");
      expect(res.previousValue).toBeNull();
      expect(mockAudit.log.mock.calls[0][0].rollbackData.previousExists).toBe(false);
    });
  });

  describe("rollbackAudit（一键回滚演练）", () => {
    it("有原值 → 还原为原值 + 落 automation.rollback 审计", async () => {
      mockAudit.getLogWithRollback.mockResolvedValue({
        id: "audit-1",
        rollbackData: { kind: "config", key: "rec_weight", previousValue: "0.5", previousExists: true },
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "rec_weight", configValue: "0.5" });
      mockAudit.log.mockResolvedValue({ id: "audit-r" });

      const res = await svc.rollbackAudit("audit-1", "董事长");

      expect(res).toEqual({ rolledBack: true, auditId: "audit-1", key: "rec_weight", restoredValue: "0.5" });
      // setConfig 被调用还原为 0.5
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { configKey: "rec_weight" } }),
      );
      // 回滚动作本身入审计
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.rollback", targetId: "rec_weight" }));
    });

    it("原本不存在 → 回滚为删除该配置", async () => {
      mockAudit.getLogWithRollback.mockResolvedValue({
        id: "audit-2",
        rollbackData: { kind: "config", key: "brand_new", previousValue: null, previousExists: false },
      });
      mockPrisma.configSystem.deleteMany.mockResolvedValue({ count: 1 });
      mockAudit.log.mockResolvedValue({ id: "audit-r2" });

      const res = await svc.rollbackAudit("audit-2", "董事长");
      expect(res.restoredValue).toBeNull();
      expect(mockPrisma.configSystem.deleteMany).toHaveBeenCalledWith({ where: { configKey: "brand_new" } });
    });

    it("不支持的动作类型 → ROLLBACK_NOT_AVAILABLE", async () => {
      mockAudit.getLogWithRollback.mockResolvedValue({
        id: "audit-3",
        rollbackData: { kind: "refund", amount: 100 },
      });
      await expect(svc.rollbackAudit("audit-3", "董事长")).rejects.toMatchObject({
        errorCode: ErrorCode.ROLLBACK_NOT_AVAILABLE,
      });
    });
  });
});
