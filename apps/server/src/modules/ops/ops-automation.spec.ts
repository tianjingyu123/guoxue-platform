import { ForbiddenException } from "@nestjs/common";
import { RequireAutomationGuard } from "../../common/require-automation.guard";
import { SystemService } from "../system/system.service";

/**
 * 一键接管（OS-P1）— 两组用例：
 * 1. 开关关时 @RequireAutomation() 写操作（ops complete 示范端点）403
 * 2. POST /system/automation/toggle 落审计
 */
describe("RequireAutomationGuard — 开关关时写操作 403", () => {
  const mockSystemSvc = { isAutomationEnabled: jest.fn() };
  const mockReflector = { getAllAndOverride: jest.fn() };

  const ctx = () =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ method: "PUT", url: "/api/v1/ops/tasks/t1/complete" }) }),
    }) as any;

  let guard: RequireAutomationGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RequireAutomationGuard(mockReflector as any, mockSystemSvc as any);
  });

  it("automation_enabled=false 时拒绝 complete 写操作 → 403 提示管理员已暂停", async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockSystemSvc.isAutomationEnabled.mockResolvedValue(false);
    await expect(guard.canActivate(ctx())).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx())).rejects.toThrow("数字员工自动化已被管理员暂停");
  });

  it("开关开启时放行", async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockSystemSvc.isAutomationEnabled.mockResolvedValue(true);
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
  });

  it("未标记 @RequireAutomation() 的端点不受约束（不读开关）", async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
    expect(mockSystemSvc.isAutomationEnabled).not.toHaveBeenCalled();
  });
});

describe("SystemService.toggleAutomation — 开关切换落审计", () => {
  const mockPrisma = {
    configSystem: { upsert: jest.fn().mockResolvedValue({ configKey: "automation_enabled" }), findUnique: jest.fn() },
  };
  const mockRedis = {
    del: jest.fn().mockResolvedValue(1),
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue("OK"),
  };
  const mockAudit = { log: jest.fn().mockResolvedValue({}) };
  const mockThirdParty = { isThirdPartyKey: jest.fn().mockReturnValue(false) };
  const mockScheduler = { getCronJobs: jest.fn().mockReturnValue(new Map()) };

  let svc: SystemService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new SystemService(mockPrisma as any, mockRedis as any, mockAudit as any, mockThirdParty as any, mockScheduler as any);
  });

  it("关闭开关 — 写 ConfigSystem automation_enabled=false 并审计 automation.disabled", async () => {
    const res = await svc.toggleAutomation(false, "admin-1");
    expect(res.automationEnabled).toBe(false);
    expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { configKey: "automation_enabled" },
        update: expect.objectContaining({ configValue: "false" }),
      }),
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "automation.disabled", targetType: "system", targetId: "automation" }),
    );
  });

  it("开启开关 — 审计 automation.enabled", async () => {
    const res = await svc.toggleAutomation(true, "admin-1");
    expect(res.automationEnabled).toBe(true);
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "automation.enabled" }));
  });

  it("isAutomationEnabled — 配置为 false 时判定关闭，缺省视为开启", async () => {
    mockPrisma.configSystem.findUnique.mockResolvedValueOnce({ configKey: "automation_enabled", configValue: "false" });
    await expect(svc.isAutomationEnabled()).resolves.toBe(false);
    mockPrisma.configSystem.findUnique.mockResolvedValueOnce(null);
    await expect(svc.isAutomationEnabled()).resolves.toBe(true);
  });
});
