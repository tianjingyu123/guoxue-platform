import { Test } from "@nestjs/testing";
import { OpsActionService } from "./ops-action.service";
import { SystemService } from "./system.service";
import { ErrorCode } from "../../common/error-codes";
import { AutonomyLevel } from "../../common/autonomy";

/**
 * 运维动作中心（后台管理自动化·L2 一键化试点）。
 * 验证白名单校验 + 走护栏回滚入口 setConfigWithRollback + 非法/未注册拦截。
 */
describe("OpsActionService · 运维动作中心", () => {
  let svc: OpsActionService;

  const mockSystem = {
    getConfig: jest.fn(async (key: string) => ({ configKey: key, configValue: key === "maintenance_mode" ? "false" : "5" })),
    setConfigWithRollback: jest.fn(async () => ({ key: "maintenance_mode", value: "true", previousValue: "false", auditId: "audit-x" })),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [OpsActionService, { provide: SystemService, useValue: mockSystem }],
    }).compile();
    svc = mod.get(OpsActionService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("listActions", () => {
    it("列出白名单动作 + 当前值 + 档位·且不含任何红线", async () => {
      const res = await svc.listActions();
      expect(res.total).toBeGreaterThanOrEqual(5);
      const maint = res.items.find((i) => i.key === "maintenance_mode");
      expect(maint).toBeDefined();
      expect(maint!.autonomyLevel).toBe(AutonomyLevel.L2_ONE_CLICK);
      expect(maint!.currentValue).toBe("false");
      // 护栏关键不变量：运维动作白名单只收非红线动作
      expect(res.items.every((i) => i.redLines.length === 0)).toBe(true);
    });
  });

  describe("execute", () => {
    it("合法值 → 走护栏回滚入口 setConfigWithRollback，返回可回滚 auditId", async () => {
      const res = await svc.execute("maintenance_mode", "true", "董事长", "HUMAN");
      expect(mockSystem.setConfigWithRollback).toHaveBeenCalledWith(
        "maintenance_mode", "true", expect.stringContaining("维护模式"), "董事长", AutonomyLevel.L2_ONE_CLICK,
      );
      expect(res).toMatchObject({ action: "maintenance_mode", value: "true", auditId: "audit-x", rollbackable: true });
    });

    it("布尔动作传非法值 → 400", async () => {
      await expect(svc.execute("maintenance_mode", "yes", "董事长", "HUMAN")).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
      expect(mockSystem.setConfigWithRollback).not.toHaveBeenCalled();
    });

    it("数值动作越界 → 400（ai_daily_free_limit 上限 100）", async () => {
      await expect(svc.execute("ai_daily_free_limit", "999", "董事长", "HUMAN")).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
    });

    it("枚举动作非法值 → 400（content_audit_mode 只能 PRE/POST）", async () => {
      await expect(svc.execute("content_audit_mode", "MAYBE", "董事长", "HUMAN")).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
    });

    it("未注册动作 → 404（仅白名单可执行）", async () => {
      await expect(svc.execute("drop_all_users", "true", "董事长", "HUMAN")).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
    });

    it("合法数值动作正常执行", async () => {
      await svc.execute("ai_daily_free_limit", "8", "董事长", "HUMAN");
      expect(mockSystem.setConfigWithRollback).toHaveBeenCalledWith(
        "ai_daily_free_limit", "8", expect.any(String), "董事长", AutonomyLevel.L2_ONE_CLICK,
      );
    });
  });
});
