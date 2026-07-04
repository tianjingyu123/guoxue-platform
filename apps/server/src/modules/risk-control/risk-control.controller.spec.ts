import { Test } from "@nestjs/testing";
import { RiskControlController } from "./risk-control.controller";
import { RiskControlService } from "./risk-control.service";
import { DistributionRiskService } from "./distribution-risk.service";
import { RolesGuard } from "../../common/roles.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";

const mockSvc = {
  createRule: jest.fn().mockResolvedValue({ id: "r1", name: "高频下单检测" }),
  listRules: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  updateRule: jest.fn().mockResolvedValue({ id: "r1", name: "新规则" }),
  deleteRule: jest.fn().mockResolvedValue({ id: "r1" }),

  listAlerts: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  handleAlert: jest.fn().mockResolvedValue({ id: "a1", status: "HANDLED" }),
  dismissAlert: jest.fn().mockResolvedValue({ id: "a1", status: "DISMISSED" }),
  actionAlert: jest.fn().mockResolvedValue({ id: "a1", status: "HANDLED", level: "CRITICAL" }),

  listFraudDetections: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  scanFraud: jest.fn().mockResolvedValue({ scanned: 3, results: [] }),
  confirmFraudDetection: jest.fn().mockResolvedValue({ id: "f1", status: "CONFIRMED" }),
  dismissFraudDetection: jest.fn().mockResolvedValue({ id: "f1", status: "DISMISSED" }),

  getUserTimeline: jest.fn().mockResolvedValue({ items: [{ id: "l1", action: "LOGIN" }], total: 1, page: 1, pageSize: 20, user: { id: "u1", nickname: "张三" } }),

  listAppeals: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  approveAppeal: jest.fn().mockResolvedValue({ id: "ap1", status: "APPROVED" }),
  rejectAppeal: jest.fn().mockResolvedValue({ id: "ap1", status: "REJECTED" }),

  listDeviceFingerprints: jest.fn().mockResolvedValue([]),
  getDeviceFingerprintsByUser: jest.fn().mockResolvedValue({ devices: [], suspiciousCount: 0 }),
};

const mockDistributionRisk = {
  scanAll: jest.fn().mockResolvedValue({
    scanAt: "2026-07-06T02:30:00.000Z",
    durationMs: 10,
    wordScan: { stationsScanned: 1, pagesScanned: 1, componentsScanned: 0, hits: 0, alerts: 0 },
    batchBind: 0,
    quickOrder: 0,
    mutualReferral: 1,
    bindSurge: 0,
    alertsCreated: 1,
  }),
};

describe("RiskControlController", () => {
  let ctrl: RiskControlController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [RiskControlController],
      providers: [
        { provide: RiskControlService, useValue: mockSvc },
        { provide: DistributionRiskService, useValue: mockDistributionRisk },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(RiskControlController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = () => ({ user: { id: "admin1" } } as any);

  // ─── 预警规则 ───

  it("POST /risk-control/rules — 创建规则", async () => {
    const result = await ctrl.createRule({ name: "高频下单检测", type: "FRAUD", conditions: {}, action: "ALERT" });
    expect(result.name).toBe("高频下单检测");
  });

  it("GET /risk-control/rules — 规则列表", async () => {
    const result = await ctrl.listRules({});
    expect(result.items).toHaveLength(0);
  });

  it("PUT /risk-control/rules/:id — 更新规则", async () => {
    const result = await ctrl.updateRule("r1", { name: "新规则" });
    expect(result.name).toBe("新规则");
  });

  it("DELETE /risk-control/rules/:id — 删除规则", async () => {
    const result = await ctrl.deleteRule("r1");
    expect(result.id).toBe("r1");
  });

  // ─── 预警 ───

  it("GET /risk-control/alerts — 预警列表", async () => {
    const result = await ctrl.listAlerts({});
    expect(result.items).toHaveLength(0);
  });

  it("PUT /risk-control/alerts/:id/handle — 处理预警", async () => {
    const result = await ctrl.handleAlert("a1", mockReq(), { note: "已处理" });
    expect(result.status).toBe("HANDLED");
  });

  it("PUT /risk-control/alerts/:id/dismiss — 忽略预警", async () => {
    const result = await ctrl.dismissAlert("a1");
    expect(result.status).toBe("DISMISSED");
  });

  it("POST /risk-control/alerts/:id/action — 预警处置", async () => {
    const result = await ctrl.actionAlert("a1", mockReq(), { action: "ban_user", note: "封禁" });
    expect(result.status).toBe("HANDLED");
    expect(mockSvc.actionAlert).toHaveBeenCalledWith("a1", "admin1", "ban_user", "封禁");
  });

  // ─── 刷单检测 ───

  it("GET /risk-control/fraud-detections — 刷单列表", async () => {
    const result = await ctrl.listFraudDetections({});
    expect(result.items).toHaveLength(0);
  });

  it("POST /risk-control/fraud-detections/scan — 触发扫描", async () => {
    const result = await ctrl.scanFraud();
    expect(result.scanned).toBe(3);
  });

  it("PUT /risk-control/fraud-detections/:id/confirm — 确认刷单", async () => {
    const result = await ctrl.confirmFraudDetection("f1");
    expect(result.status).toBe("CONFIRMED");
  });

  it("PUT /risk-control/fraud-detections/:id/dismiss — 标记误报", async () => {
    const result = await ctrl.dismissFraudDetection("f1");
    expect(result.status).toBe("DISMISSED");
  });

  // ─── 分销风控 ───

  it("POST /risk-control/distribution-scan — 触发分销风控扫描", async () => {
    const result = await ctrl.distributionScan();
    expect(result.alertsCreated).toBe(1);
    expect(mockDistributionRisk.scanAll).toHaveBeenCalledTimes(1);
  });

  // ─── 用户行为时间线 ───

  it("GET /risk-control/user-timeline/:userId — 行为时间线", async () => {
    const result = await ctrl.getUserTimeline("u1", {});
    expect(result.items).toHaveLength(1);
    expect(result.user).toBeDefined();
    expect(mockSvc.getUserTimeline).toHaveBeenCalledWith("u1", {});
  });

  // ─── 申诉 ───

  it("GET /risk-control/appeals — 申诉列表", async () => {
    const result = await ctrl.listAppeals({});
    expect(result.items).toHaveLength(0);
  });

  it("PUT /risk-control/appeals/:id/approve — 批准申诉", async () => {
    const result = await ctrl.approveAppeal("ap1", mockReq());
    expect(result.status).toBe("APPROVED");
  });

  it("PUT /risk-control/appeals/:id/reject — 驳回申诉", async () => {
    const result = await ctrl.rejectAppeal("ap1", mockReq(), { reviewNote: "证据不足" });
    expect(result.status).toBe("REJECTED");
  });

  // ─── 设备指纹 ───

  it("GET /risk-control/device-fingerprints — 设备列表", async () => {
    const result = await ctrl.listDeviceFingerprints({ userId: "u1" });
    expect(result).toHaveLength(0);
  });

  it("GET /risk-control/device-fingerprints/:userId — 用户设备详情", async () => {
    const result = await ctrl.getDeviceFingerprintsByUser("u1");
    expect(result.suspiciousCount).toBe(0);
  });
});
