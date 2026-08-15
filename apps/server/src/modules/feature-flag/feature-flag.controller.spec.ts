import { Test } from "@nestjs/testing";
import { FeatureFlagController, FeatureFlagPublicController } from "./feature-flag.controller";
import { FeatureFlagService } from "./feature-flag.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { SystemService } from "../system/system.service";

const mockFlagSvc = {
  list: jest.fn().mockResolvedValue([{ key: "merchant_onboarding", enabled: false }]),
  getByKey: jest.fn().mockResolvedValue({ key: "merchant_onboarding", enabled: false }),
  upsert: jest.fn().mockResolvedValue({ key: "merchant_onboarding", enabled: true }),
  delete: jest.fn().mockResolvedValue(undefined),
  getClientFeatures: jest.fn().mockResolvedValue({ live_start: true, client_home_v2: false }),
  getHistory: jest.fn().mockResolvedValue([{ version: 1 }]),
  rollback: jest.fn().mockResolvedValue({ key: "merchant_onboarding", enabled: false }),
};

const mockSystemSvc = {
  getUiConfig: jest.fn().mockResolvedValue({ home: { bigCardInterval: 6 } }),
  getHomeConfig: jest.fn().mockResolvedValue({ layout: "default", paipanSlot: 6, featuredTags: [] }),
  isMaintenanceMode: jest.fn().mockResolvedValue(false),
};

describe("FeatureFlagController", () => {
  let ctrl: FeatureFlagController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FeatureFlagController],
      providers: [{ provide: FeatureFlagService, useValue: mockFlagSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(FeatureFlagController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /admin/feature-flags — 列出所有开关", async () => {
    const result: any = await ctrl.list();
    expect(result).toHaveLength(1);
    expect(mockFlagSvc.list).toHaveBeenCalled();
  });

  it("GET /admin/feature-flags/:key — 获取单个开关", async () => {
    const result: any = await ctrl.get("merchant_onboarding");
    expect(result.key).toBe("merchant_onboarding");
    expect(mockFlagSvc.getByKey).toHaveBeenCalledWith("merchant_onboarding");
  });

  it("PUT /admin/feature-flags/:key — 创建/更新开关", async () => {
    const dto: any = { enabled: true, description: "商家入驻" };
    const result: any = await ctrl.upsert("merchant_onboarding", dto, { user: { id: "admin1" } } as any);
    expect(result.enabled).toBe(true);
    expect(mockFlagSvc.upsert).toHaveBeenCalledWith("merchant_onboarding", dto, "admin1");
  });

  it("GET /admin/feature-flags/:key/history — 查询开关历史", async () => {
    const result: any = await ctrl.history("merchant_onboarding");
    expect(result).toHaveLength(1);
  });

  it("POST /admin/feature-flags/:key/rollback/:version — 回滚开关", async () => {
    const result: any = await ctrl.rollback(
      "merchant_onboarding",
      1,
      { user: { nickname: "管理员" } } as any,
    );
    expect(result.enabled).toBe(false);
    expect(mockFlagSvc.rollback).toHaveBeenCalledWith("merchant_onboarding", 1, "管理员");
  });

  it("DELETE /admin/feature-flags/:key — 删除开关", async () => {
    const result: any = await ctrl.delete("merchant_onboarding");
    expect(result.success).toBe(true);
    expect(mockFlagSvc.delete).toHaveBeenCalledWith("merchant_onboarding");
  });
});

describe("FeatureFlagPublicController", () => {
  const ctrl = new FeatureFlagPublicController(
    mockFlagSvc as unknown as FeatureFlagService,
    mockSystemSvc as unknown as SystemService,
  );

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /config/features — 只返回客户端可见开关", async () => {
    const result = await ctrl.getEnabledFeatures({ user: { id: "u1" } } as any);
    expect(result.features).toEqual({ live_start: true, client_home_v2: false });
    expect(mockFlagSvc.getClientFeatures).toHaveBeenCalledWith("u1");
  });

  it("GET /config/client — 返回带版本与回滚标识的安全快照", async () => {
    const result = await ctrl.getClientConfig({ user: { id: "u1" } } as any);
    expect(result).toMatchObject({
      schemaVersion: 1,
      cacheTtlSeconds: 60,
      features: { live_start: true, client_home_v2: false },
      maintenance: { enabled: false },
    });
    expect(result.revision).toMatch(/^[0-9a-f]{16}$/);
    expect(result.generatedAt).toBeTruthy();
  });
});
