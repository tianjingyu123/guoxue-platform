import {
  CollaborationService,
  CollaborationActionHandler,
} from "../ai-gateway/collaboration.service";
import {
  CollaborationInspectionService,
  INSPECTION_HANDLER_KEY,
} from "./collaboration-inspection.service";
import { InspectionService } from "./inspection.service";

describe("CollaborationInspectionService", () => {
  let handler: CollaborationActionHandler;
  const unregister = jest.fn();
  const collaboration = { registerActionHandler: jest.fn() };
  const inspection = { runInspection: jest.fn() };
  let service: CollaborationInspectionService;

  beforeEach(() => {
    jest.resetAllMocks();
    collaboration.registerActionHandler.mockImplementation(
      (_key: string, registered: CollaborationActionHandler) => {
        handler = registered;
        return unregister;
      },
    );
    inspection.runInspection.mockResolvedValue({
      reportTaskId: "report-1",
      date: "2026-09-02",
      anomalies: 1,
      tasksCreated: 1,
      autoFixed: 0,
      items: [{ key: "health", status: "anomaly", detail: { error: "不得复制的底层错误" } }],
    });
    service = new CollaborationInspectionService(
      collaboration as unknown as CollaborationService,
      inspection as unknown as InspectionService,
    );
    service.onModuleInit();
  });

  it("生产生命周期注册并注销真实执行器，不伪造回滚能力", () => {
    expect(collaboration.registerActionHandler).toHaveBeenCalledWith(
      INSPECTION_HANDLER_KEY,
      expect.any(Object),
    );
    expect(handler.rollback).toBeUndefined();
    service.onModuleDestroy();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it("只运行无自动修复的诊断并返回可追溯报告，不把异常说成已解决", async () => {
    const result = await handler.execute(
      { riskLevel: "low", executionPlan: { handlerKey: INSPECTION_HANDLER_KEY } },
      "admin-1",
    );
    expect(inspection.runInspection).toHaveBeenCalledWith("MANUAL", { allowAutoFix: false });
    expect(result).toEqual({
      mode: "diagnostic_only",
      reportTaskId: "report-1",
      date: "2026-09-02",
      anomalies: 1,
      tasksCreated: 1,
      autoFixed: 0,
      requiresHumanReview: true,
      checks: [{ key: "health", status: "anomaly" }],
    });
    expect(JSON.stringify(result)).not.toContain("底层错误");
  });

  it.each([
    { riskLevel: "high", executionPlan: { handlerKey: INSPECTION_HANDLER_KEY } },
    { riskLevel: "medium", executionPlan: { handlerKey: INSPECTION_HANDLER_KEY } },
    {
      riskLevel: "low",
      executionPlan: { handlerKey: INSPECTION_HANDLER_KEY, command: "任意命令" },
    },
    { riskLevel: "low", executionPlan: { handlerKey: "other" } },
    { riskLevel: "low", executionPlan: null },
  ])("拒绝越界计划 %j", async (proposal) => {
    await expect(handler.execute(proposal, "admin-1")).rejects.toThrow("无额外参数");
    expect(inspection.runInspection).not.toHaveBeenCalled();
  });

  it("报告未留存不能声称完成", async () => {
    inspection.runInspection.mockResolvedValue({ anomalies: 0, items: [] });
    await expect(
      handler.execute(
        { riskLevel: "low", executionPlan: { handlerKey: INSPECTION_HANDLER_KEY } },
        "admin-1",
      ),
    ).rejects.toThrow("未成功留存");
  });
});
