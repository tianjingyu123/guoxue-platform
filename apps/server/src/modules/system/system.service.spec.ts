import { Test } from "@nestjs/testing";
import { SchedulerRegistry } from "@nestjs/schedule";
import { SystemService } from "./system.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { ThirdPartyConfigLoader } from "./third-party-config.loader";
import { ErrorCode } from "../../common/error-codes";
import { FundApprovalService } from "../fund-approval/fund-approval.service";

const mockPrisma = {
  configSystem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  configVersion: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  brandConfig: { findUnique: jest.fn(), upsert: jest.fn() },
  auditLog: { findMany: jest.fn(), count: jest.fn() },
  siteNotice: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  memberConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: { count: jest.fn() },
  $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(mockPrisma)),
};
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
};
const mockAudit = { log: jest.fn(), getLogWithRollback: jest.fn(), listRollbackable: jest.fn() };
const mockThirdParty = {
  isThirdPartyKey: jest.fn().mockReturnValue(false),
  buildDisplayValue: jest.fn((_k: string, v: string) => v),
  buildStoredValue: jest.fn(async (_k: string, v: string) => v),
  syncToEnv: jest.fn().mockResolvedValue(undefined),
};
const mockFundApproval = { create: jest.fn() };

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
        {
          provide: SchedulerRegistry,
          useValue: { getCronJobs: jest.fn().mockReturnValue(new Map()) },
        },
        { provide: FundApprovalService, useValue: mockFundApproval },
      ],
    }).compile();
    svc = mod.get(SystemService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFundApproval.create.mockResolvedValue({
      submitted: true,
      approvalId: "a1",
      status: "PENDING",
    });
  });

  describe("getAllConfigs", () => {
    it("返回所有配置项", async () => {
      const configs = [
        { configKey: "key1", configValue: "val1" },
        { configKey: "key2", configValue: "val2" },
      ];
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
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "home_banners",
        configValue: "[]",
      });
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
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "new_key",
        configValue: "value",
      });
      await svc.setConfig("new_key", "value", "描述", "admin");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:new_key");
      expect(mockRedis.del).toHaveBeenCalledWith("sys:config:all");
    });

    it("远程配置变更写入可回滚版本，重复保存相同值不制造噪声版本", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "home:layout",
        configValue: "old-layout",
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "home:layout",
        configValue: "new-layout",
      });
      mockPrisma.configVersion.findFirst.mockResolvedValue({ version: 3 });
      mockPrisma.configVersion.create.mockResolvedValue({});

      await svc.setConfig("home:layout", "new-layout", "首页布局调整", "admin");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.configVersion.create).toHaveBeenCalledWith({
        data: {
          configKey: "home:layout",
          value: "new-layout",
          version: 4,
          changedBy: "admin",
          comment: "首页布局调整",
        },
      });

      jest.clearAllMocks();
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "home:layout",
        configValue: "new-layout",
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "home:layout",
        configValue: "new-layout",
      });
      await svc.setConfig("home:layout", "new-layout", "重复保存", "admin");
      expect(mockPrisma.configVersion.create).not.toHaveBeenCalled();
    });

    it("第三方密钥不进入配置版本表，避免历史表泄露凭据", async () => {
      mockThirdParty.isThirdPartyKey.mockReturnValue(true);
      mockPrisma.configSystem.upsert.mockResolvedValue({ configKey: "wechat_pay", configValue: "ciphertext" });

      await svc.setConfig("wechat_pay", "masked-json", "支付配置", "admin");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.configVersion.create).not.toHaveBeenCalled();
      mockThirdParty.isThirdPartyKey.mockReturnValue(false);
    });
  });

  describe("远程配置首次版本与 UI 安全边界", () => {
    it("既有远程配置首次变更时保留变更前快照", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "home.bigCardInterval",
        configValue: "6",
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "home.bigCardInterval",
        configValue: "8",
      });
      mockPrisma.configVersion.findFirst.mockResolvedValue(null);
      mockPrisma.configVersion.create.mockResolvedValue({});

      await svc.setConfig("home.bigCardInterval", "8", "调整首页轮播", "admin");

      expect(mockPrisma.configVersion.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          configKey: "home.bigCardInterval",
          value: "6",
          version: 1,
        }),
      });
      expect(mockPrisma.configVersion.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          configKey: "home.bigCardInterval",
          value: "8",
          version: 2,
          changedBy: "admin",
        }),
      });
    });

    it("限制数值范围并过滤非白名单样式", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.configSystem.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.configKey === "home.bigCardInterval") {
          return { configKey: where.configKey, configValue: "999" };
        }
        return {
          configKey: where.configKey,
          configValue: JSON.stringify({
            合法分类: "g-safe",
            非法分类: "url(javascript:alert(1))",
          }),
        };
      });

      const result = await svc.getUiConfig();

      expect(result.home.bigCardInterval).toBe(30);
      expect(result.agentCard.categoryColors).toEqual({ 合法分类: "g-safe" });
    });
  });

  describe("deleteConfig", () => {
    it("删除配置并失效缓存", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "key_to_delete",
        configValue: "v",
      });
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
      expect(mockRedis.setJson).toHaveBeenCalledWith(
        "sys:config:brand",
        expect.objectContaining({ siteName: "热卜国学" }),
        expect.any(Number),
      );
    });
    it("有记录时 DB 值覆盖默认值（改一处配置全端生效）", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.brandConfig.findUnique.mockResolvedValue({
        id: "default",
        siteName: "道商世界",
        siteNameShort: "道商",
      });
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

  describe("会员套餐配置", () => {
    it("新增套餐只提交资金审批，不直接写配置", async () => {
      const dto = { level: "MONTHLY", name: "月卡", price: 19, monthlyPoints: 100 };
      const result = await svc.requestUpsertMemberConfig(dto, "admin-1");
      expect(result).toMatchObject({ submitted: true, status: "PENDING" });
      expect(mockFundApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MEMBER_CONFIG",
          requestedBy: "admin-1",
          payload: { method: "upsertMemberConfig", dto },
        }),
      );
      expect(mockPrisma.memberConfig.upsert).not.toHaveBeenCalled();
    });

    it("修改套餐校验当前记录后提交审批，不直接改价", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({
        id: "m1",
        level: "MONTHLY",
        name: "月卡",
        price: 19,
        isActive: true,
      });
      await svc.requestUpdateMemberConfig("m1", { price: 20, isActive: false }, "admin-1");
      expect(mockFundApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MEMBER_CONFIG",
          payload: { method: "updateMemberConfig", id: "m1", dto: { price: 20, isActive: false } },
        }),
      );
      expect(mockPrisma.memberConfig.update).not.toHaveBeenCalled();
    });

    it("删除套餐在提交审批前即拦截启用状态与任何关联订单", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({
        id: "m1",
        level: "MONTHLY",
        name: "月卡",
        price: 19,
        isActive: false,
      });
      mockPrisma.order.count.mockResolvedValue(0);
      await svc.requestDeleteMemberConfig("m1", "admin-1");
      expect(mockFundApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MEMBER_CONFIG",
          payload: { method: "deleteMemberConfig", id: "m1" },
        }),
      );
      expect(mockPrisma.memberConfig.delete).not.toHaveBeenCalled();
    });

    it("服务层拒绝积分、排序等非整数，防内部调用绕过 DTO", async () => {
      await expect(
        svc.upsertMemberConfig({ level: "MONTHLY", name: "月卡", price: 19, monthlyPoints: 1.5 }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      expect(mockPrisma.memberConfig.upsert).not.toHaveBeenCalled();
    });
    it("按展示顺序读取当前真实套餐字段", async () => {
      mockPrisma.memberConfig.findMany.mockResolvedValue([{ id: "m1", level: "MONTHLY", sort: 1 }]);
      await svc.getMemberConfigs();
      expect(mockPrisma.memberConfig.findMany).toHaveBeenCalledWith({
        orderBy: [{ sort: "asc" }, { price: "asc" }],
      });
    });

    it("创建套餐时写入积分、排序、赠券和权益数组", async () => {
      mockPrisma.memberConfig.upsert.mockResolvedValue({ id: "m1" });
      await svc.upsertMemberConfig({
        level: "MONTHLY",
        name: "书院会员·月卡",
        price: 19,
        monthlyPoints: 100,
        monthlyCouponId: "coupon-1",
        sort: 1,
        benefits: ["AI 不限量"],
        maxBorrowDays: 30,
        isActive: true,
      });
      expect(mockPrisma.memberConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { level: "MONTHLY" },
          create: expect.objectContaining({
            monthlyPoints: 100,
            monthlyCouponId: "coupon-1",
            sort: 1,
            benefits: ["AI 不限量"],
          }),
        }),
      );
    });

    it("服务层再次拒绝负数或异常高价", async () => {
      await expect(
        svc.upsertMemberConfig({ level: "MONTHLY", name: "月卡", price: -1 }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      await expect(
        svc.upsertMemberConfig({ level: "MONTHLY", name: "月卡", price: 1000000 }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      expect(mockPrisma.memberConfig.upsert).not.toHaveBeenCalled();
    });

    it("局部更新不要求重复提交 level，并支持清空赠券", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({ id: "m1", isActive: true });
      mockPrisma.memberConfig.update.mockResolvedValue({ id: "m1" });
      await svc.updateMemberConfig("m1", {
        price: 20,
        monthlyCouponId: null,
        benefits: ["权益一"],
      });
      expect(mockPrisma.memberConfig.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { price: 20, monthlyCouponId: null, benefits: ["权益一"] },
      });
    });

    it("启用中的套餐禁止删除", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({ id: "m1", isActive: true });
      await expect(svc.deleteMemberConfig("m1")).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      expect(mockPrisma.memberConfig.delete).not.toHaveBeenCalled();
    });

    it("有任意历史或在途订单引用的停售套餐仍禁止删除", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({ id: "m1", isActive: false });
      mockPrisma.order.count.mockResolvedValue(2);
      await expect(svc.deleteMemberConfig("m1")).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      expect(mockPrisma.memberConfig.delete).not.toHaveBeenCalled();
    });

    it("停售且从未被订单引用时允许删除", async () => {
      mockPrisma.memberConfig.findUnique.mockResolvedValue({ id: "m1", isActive: false });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.memberConfig.delete.mockResolvedValue({ id: "m1" });
      await svc.deleteMemberConfig("m1");
      expect(mockPrisma.memberConfig.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    });
  });

  // ── 治理护栏 §2.3 · 带回滚配置变更 + 一键回滚（验收标准三演练）──

  describe("setConfigWithRollback", () => {
    it("改配置并写含快照的审计（原值入 rollbackData）", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "rec_weight",
        configValue: "0.5",
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "rec_weight",
        configValue: "0.8",
      });
      mockAudit.log.mockResolvedValue({ id: "audit-1" });

      const res = await svc.setConfigWithRollback(
        "rec_weight",
        "0.8",
        "L3自动调权",
        "CLAUDE",
        "L3",
      );

      expect(res).toEqual({
        key: "rec_weight",
        value: "0.8",
        previousValue: "0.5",
        auditId: "audit-1",
      });
      const auditArg = mockAudit.log.mock.calls[0][0];
      expect(auditArg.autonomyLevel).toBe("L3");
      expect(auditArg.executor).toBe("CLAUDE");
      expect(auditArg.rollbackData).toEqual({
        kind: "config",
        key: "rec_weight",
        previousValue: "0.5",
        previousExists: true,
      });
    });

    it("新建配置时快照标记 previousExists=false", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "brand_new",
        configValue: "x",
      });
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
        rollbackData: {
          kind: "config",
          key: "rec_weight",
          previousValue: "0.5",
          previousExists: true,
        },
      });
      mockPrisma.configSystem.upsert.mockResolvedValue({
        configKey: "rec_weight",
        configValue: "0.5",
      });
      mockAudit.log.mockResolvedValue({ id: "audit-r" });

      const res = await svc.rollbackAudit("audit-1", "董事长");

      expect(res).toEqual({
        rolledBack: true,
        auditId: "audit-1",
        key: "rec_weight",
        restoredValue: "0.5",
      });
      // setConfig 被调用还原为 0.5
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { configKey: "rec_weight" } }),
      );
      // 回滚动作本身入审计
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "automation.rollback", targetId: "rec_weight" }),
      );
    });

    it("原本不存在 → 回滚为删除该配置", async () => {
      mockAudit.getLogWithRollback.mockResolvedValue({
        id: "audit-2",
        rollbackData: {
          kind: "config",
          key: "brand_new",
          previousValue: null,
          previousExists: false,
        },
      });
      mockPrisma.configSystem.deleteMany.mockResolvedValue({ count: 1 });
      mockAudit.log.mockResolvedValue({ id: "audit-r2" });

      const res = await svc.rollbackAudit("audit-2", "董事长");
      expect(res.restoredValue).toBeNull();
      expect(mockPrisma.configSystem.deleteMany).toHaveBeenCalledWith({
        where: { configKey: "brand_new" },
      });
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
