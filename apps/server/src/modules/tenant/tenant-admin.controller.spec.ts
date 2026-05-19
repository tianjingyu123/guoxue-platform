import { Test } from "@nestjs/testing";
import { TenantAdminController } from "./tenant-admin.controller";
import { TenantService } from "./tenant.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockTenantSvc = {
  create: jest.fn().mockResolvedValue({ id: "t1", name: "新租户" }),
  list: jest.fn().mockResolvedValue({ items: [{ id: "t1", name: "租户1" }], total: 1, page: 1, pageSize: 20 }),
  getById: jest.fn().mockResolvedValue({ id: "t1", name: "租户1" }),
  update: jest.fn().mockResolvedValue({ id: "t1", name: "更新租户" }),
  deleteTenant: jest.fn().mockResolvedValue({ success: true }),
  recharge: jest.fn().mockResolvedValue({ total: 200, used: 10 }),
  regenerateApiKey: jest.fn().mockResolvedValue({ apiKey: "new-key-xxx" }),
  getUsageStats: jest.fn().mockResolvedValue({ totalCalls: 100, dailyStats: [] }),
  resetMonthlyQuotas: jest.fn().mockResolvedValue({ reset: 10 }),
};

describe("TenantAdminController", () => {
  let ctrl: TenantAdminController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TenantAdminController],
      providers: [
        { provide: TenantService, useValue: mockTenantSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(TenantAdminController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("should be defined", () => {
    expect(ctrl).toBeDefined();
  });

  it("POST /admin/tenants — 创建租户", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "新租户" };
    const result = await ctrl.create(req, dto);
    expect(result).toBeDefined();
    expect(mockTenantSvc.create).toHaveBeenCalledWith(dto, "u1");
  });

  it("GET /admin/tenants — 租户列表", async () => {
    const result = await ctrl.list("1", "20", "active", "keyword");
    expect(result).toBeDefined();
    expect(mockTenantSvc.list).toHaveBeenCalledWith({ page: 1, pageSize: 20, status: "active", keyword: "keyword" });
  });

  it("GET /admin/tenants/:id — 租户详情", async () => {
    const result = await ctrl.getById("t1");
    expect(result).toBeDefined();
    expect(mockTenantSvc.getById).toHaveBeenCalledWith("t1");
  });

  it("PUT /admin/tenants/:id — 更新租户", async () => {
    const dto: any = { name: "更新租户" };
    const result = await ctrl.update("t1", dto);
    expect(result).toBeDefined();
    expect(mockTenantSvc.update).toHaveBeenCalledWith("t1", dto);
  });

  it("DELETE /admin/tenants/:id — 删除租户", async () => {
    const result = await ctrl.delete("t1");
    expect(result).toBeDefined();
    expect(mockTenantSvc.deleteTenant).toHaveBeenCalledWith("t1");
  });

  it("POST /admin/tenants/:id/recharge — 充值配额", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { amount: 100 };
    const result = await ctrl.recharge(req, "t1", dto);
    expect(result).toBeDefined();
    expect(mockTenantSvc.recharge).toHaveBeenCalledWith("t1", dto, "u1");
  });

  it("POST /admin/tenants/:id/reset-key — 重置 API Key", async () => {
    const result = await ctrl.regenerateKey("t1");
    expect(result).toBeDefined();
    expect(mockTenantSvc.regenerateApiKey).toHaveBeenCalledWith("t1");
  });

  it("GET /admin/tenants/:id/usage — 用量统计", async () => {
    const result = await ctrl.getUsage("t1", "7");
    expect(result).toBeDefined();
    expect(mockTenantSvc.getUsageStats).toHaveBeenCalledWith("t1", 7);
  });

  it("POST /admin/tenants/reset-quotas — 手动触发月度配额重置", async () => {
    const result = await ctrl.resetMonthlyQuotas();
    expect(result).toBeDefined();
    expect(mockTenantSvc.resetMonthlyQuotas).toHaveBeenCalled();
  });
});
