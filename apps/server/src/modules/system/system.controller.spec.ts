import { Test } from "@nestjs/testing";
import { SystemController } from "./system.controller";
import { SystemService } from "./system.service";
import { ExportService } from "./export.service";
import { OpsActionService } from "./ops-action.service";
import { RolesGuard } from "../../common/roles.guard";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockSystemSvc = {
  getAllConfigs: jest.fn().mockResolvedValue([]),
  getConfig: jest.fn().mockResolvedValue({ configKey: "test", configValue: "val" }),
  setConfig: jest.fn().mockResolvedValue({ configKey: "test", configValue: "val" }),
  deleteConfig: jest.fn().mockResolvedValue(undefined),
  healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
  isMaintenanceMode: jest.fn().mockResolvedValue(false),
  toggleMaintenance: jest.fn().mockResolvedValue({ maintenanceMode: true }),
  getAuditLogs: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  getAuditActions: jest.fn().mockResolvedValue(["CREATE", "UPDATE", "DELETE"]),
  getPageContent: jest.fn().mockResolvedValue([]),
  upsertPageContent: jest.fn().mockResolvedValue({ id: "pc1" }),
  createSiteNotice: jest.fn().mockResolvedValue({ id: "sn1", title: "公告" }),
  getSiteNotices: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getPublicSiteNotices: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getPublicSiteNotice: jest.fn().mockResolvedValue({ id: "sn1", title: "公告" }),
  updateSiteNotice: jest.fn().mockResolvedValue({ id: "sn1", title: "新公告" }),
  deleteSiteNotice: jest.fn().mockResolvedValue(undefined),
  getConfigVersions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  rollbackConfig: jest.fn().mockResolvedValue({ configKey: "test", version: 1 }),
  getConfigDiff: jest.fn().mockResolvedValue({ diff: "..." }),
  getMemberConfigs: jest.fn().mockResolvedValue([]),
  upsertMemberConfig: jest.fn().mockResolvedValue({ id: "mc1" }),
  requestUpsertMemberConfig: jest.fn().mockResolvedValue({ submitted: true, approvalId: "a1", status: "PENDING" }),
  requestUpdateMemberConfig: jest.fn().mockResolvedValue({ submitted: true, approvalId: "a2", status: "PENDING" }),
  requestDeleteMemberConfig: jest.fn().mockResolvedValue({ submitted: true, approvalId: "a3", status: "PENDING" }),
  getPublicBanners: jest.fn().mockResolvedValue({ banners: [] }),
  getHomeConfig: jest.fn().mockResolvedValue({ layout: "default", paipanSlot: 6, featuredTags: [] }),
  getBrandConfig: jest.fn().mockResolvedValue({ id: "default", siteName: "热卜国学", siteNameShort: "热卜" }),
  updateBrandConfig: jest.fn().mockResolvedValue({ id: "default", siteName: "道商世界" }),
};

const mockOpsActionSvc = {
  listActions: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  execute: jest.fn().mockResolvedValue({ action: "maintenance_mode", value: "true", auditId: "a1", rollbackable: true }),
};

const mockExportSvc = {
  exportUsers: jest.fn().mockResolvedValue("/tmp/test.csv"),
  exportOrders: jest.fn().mockResolvedValue("/tmp/test.csv"),
  exportContents: jest.fn().mockResolvedValue("/tmp/test.csv"),
  exportAuditLogs: jest.fn().mockResolvedValue("/tmp/test.csv"),
  exportEarnings: jest.fn().mockResolvedValue("/tmp/test.csv"),
  exportToExcel: jest.fn().mockResolvedValue(Buffer.from("test")),
  importProducts: jest.fn().mockResolvedValue({ imported: 5, errors: [] }),
};

describe("SystemController", () => {
  let ctrl: SystemController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        { provide: SystemService, useValue: mockSystemSvc },
        { provide: ExportService, useValue: mockExportSvc },
        { provide: OpsActionService, useValue: mockOpsActionSvc },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(SystemController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ── 配置管理 ──

  it("GET /system/configs — 配置列表", async () => {
    const result = await ctrl.listConfigs();
    expect(result.configs).toHaveLength(0);
  });

  it("GET /system/configs/:key — 获取配置", async () => {
    const result: any = await ctrl.getConfig("test");
    expect(result.configValue).toBe("val");
  });

  it("PUT /system/configs/:key — 更新配置", async () => {
    const req: any = { user: { id: "admin1", nickname: "管理员" } };
    const result: any = await ctrl.setConfig("test", { value: "newval" } as any, req);
    expect(result.configValue).toBe("val");
  });

  it("DELETE /system/configs/:key — 删除配置", async () => {
    const result: any = await ctrl.deleteConfig("test");
    expect(result.ok).toBe(true);
  });

  // ── 健康/维护 ──

  it("GET /system/health — 健康检查", async () => {
    const result: any = await ctrl.healthCheck();
    expect(result.status).toBe("ok");
  });

  it("GET /system/maintenance — 维护模式状态", async () => {
    const result: any = await ctrl.getMaintenanceMode();
    expect(result.maintenanceMode).toBe(false);
  });

  it("PUT /system/maintenance — 切换维护模式", async () => {
    const result: any = await ctrl.toggleMaintenance({ enabled: true });
    expect(result.maintenanceMode).toBe(true);
  });

  // ── 品牌配置（租-T0 品牌抽象） ──

  it("GET /system/public/brand-config — 公开品牌配置", async () => {
    const result: any = await ctrl.getBrandConfig();
    expect(result.siteName).toBe("热卜国学");
    expect(mockSystemSvc.getBrandConfig).toHaveBeenCalled();
  });

  it("PUT /system/brand-config — 更新品牌配置（带操作人）", async () => {
    const req: any = { user: { id: "admin1", nickname: "管理员" } };
    const result: any = await ctrl.updateBrandConfig({ siteName: "道商世界" } as any, req);
    expect(result.siteName).toBe("道商世界");
    expect(mockSystemSvc.updateBrandConfig).toHaveBeenCalledWith({ siteName: "道商世界" }, "管理员");
  });

  // ── 公开接口 ──

  it("GET /system/public/banners — 首页Banner", async () => {
    const result: any = await ctrl.getPublicBanners();
    expect(result.banners).toHaveLength(0);
  });

  it("GET /system/public/home-config — 首页布局", async () => {
    const result: any = await ctrl.getHomeConfig();
    expect(result.layout).toBeDefined();
  });

  it("GET /system/about — 不返回不可审计的固定规模数字", async () => {
    const result: any = await ctrl.getAbout();
    expect(result.stats).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/100\+|500\+|50万\+/);
    expect(result.features).toHaveLength(4);
  });

  // ── 审计日志 ──

  it("GET /system/audit-logs — 审计日志列表", async () => {
    const result: any = await ctrl.getAuditLogs();
    expect(result.items).toHaveLength(0);
  });

  it("GET /system/audit-actions — 审计动作类型", async () => {
    const result: any = await ctrl.getAuditActions();
    expect(result.actions).toContain("CREATE");
  });

  // ── 页面文案 ──

  it("GET /system/page-content — 页面文案配置", async () => {
    const result: any = await ctrl.getPageContent("home");
    expect(result).toHaveLength(0);
  });

  it("POST /system/page-content — 更新页面文案", async () => {
    const result: any = await ctrl.upsertPageContent({ pageRoute: "home", fieldKey: "title", content: "首页" } as any);
    expect(result.id).toBe("pc1");
  });

  // ── 全站公告 ──

  it("GET /system/public/site-notices — 公开公告列表", async () => {
    const result: any = await ctrl.getPublicSiteNotices();
    expect(result.items).toHaveLength(0);
  });

  it("GET /system/public/site-notices/:id — 公开公告详情", async () => {
    const result: any = await ctrl.getPublicSiteNotice("sn1");
    expect(result.id).toBe("sn1");
  });

  it("POST /system/site-notices — 创建公告", async () => {
    const result: any = await ctrl.createSiteNotice({ title: "公告", content: "内容" } as any);
    expect(result.title).toBe("公告");
  });

  it("GET /system/site-notices — 公告列表", async () => {
    const result: any = await ctrl.getSiteNotices();
    expect(result.items).toHaveLength(0);
  });

  it("PUT /system/site-notices/:id — 更新公告", async () => {
    const result: any = await ctrl.updateSiteNotice("sn1", { title: "新公告" } as any);
    expect(result.title).toBe("新公告");
  });

  it("DELETE /system/site-notices/:id — 删除公告", async () => {
    await ctrl.deleteSiteNotice("sn1");
    expect(mockSystemSvc.deleteSiteNotice).toHaveBeenCalledWith("sn1");
  });

  // ── 配置版本 ──

  it("GET /system/config-versions — 配置历史版本", async () => {
    const result: any = await ctrl.getConfigVersions("test");
    expect(result.items).toHaveLength(0);
  });

  it("POST /system/config-versions/rollback — 回滚配置", async () => {
    const result: any = await ctrl.rollbackConfig({ configKey: "test", version: 1 }, { user: { id: "u1" } } as any);
    expect(result.version).toBe(1);
  });

  it("GET /system/config-diff — 配置差异", async () => {
    const result: any = await ctrl.getConfigDiff("test", "1", "2");
    expect(result.diff).toBeDefined();
  });

  // ── 会员配置 ──

  it("GET /system/member-configs — 会员配置列表", async () => {
    const result: any = await ctrl.getMemberConfigs();
    expect(result).toHaveLength(0);
  });

  it("POST /system/member-configs — 提交会员配置审批", async () => {
    const req = { user: { id: "admin-1" } } as any;
    const dto = { level: "MONTHLY", name: "月卡", price: 19 } as any;
    const result: any = await ctrl.upsertMemberConfig(dto, req);
    expect(result.status).toBe("PENDING");
    expect(mockSystemSvc.requestUpsertMemberConfig).toHaveBeenCalledWith(dto, "admin-1");
  });

  it("PUT /system/member-configs/:id — 提交会员配置修改审批", async () => {
    const req = { user: { id: "admin-1" } } as any;
    const dto = { price: 20 } as any;
    const result: any = await ctrl.updateMemberConfig("m1", dto, req);
    expect(result.status).toBe("PENDING");
    expect(mockSystemSvc.requestUpdateMemberConfig).toHaveBeenCalledWith("m1", dto, "admin-1");
  });

  it("DELETE /system/member-configs/:id — 提交会员配置删除审批", async () => {
    const req = { user: { id: "admin-1" } } as any;
    const result: any = await ctrl.deleteMemberConfig("m1", req);
    expect(result.status).toBe("PENDING");
    expect(mockSystemSvc.requestDeleteMemberConfig).toHaveBeenCalledWith("m1", "admin-1");
  });
});
