import { Test } from "@nestjs/testing";
import { FeatureFlagController } from "./feature-flag.controller";
import { FeatureFlagService } from "./feature-flag.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockFlagSvc = {
  list: jest.fn().mockResolvedValue([{ key: "merchant_onboarding", enabled: false }]),
  getByKey: jest.fn().mockResolvedValue({ key: "merchant_onboarding", enabled: false }),
  upsert: jest.fn().mockResolvedValue({ key: "merchant_onboarding", enabled: true }),
  delete: jest.fn().mockResolvedValue(undefined),
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
    const result: any = await ctrl.upsert("merchant_onboarding", dto);
    expect(result.enabled).toBe(true);
    expect(mockFlagSvc.upsert).toHaveBeenCalledWith("merchant_onboarding", dto);
  });

  it("DELETE /admin/feature-flags/:key — 删除开关", async () => {
    const result: any = await ctrl.delete("merchant_onboarding");
    expect(result.success).toBe(true);
    expect(mockFlagSvc.delete).toHaveBeenCalledWith("merchant_onboarding");
  });
});
