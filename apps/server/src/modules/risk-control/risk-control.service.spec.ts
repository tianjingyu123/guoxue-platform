import { Test } from "@nestjs/testing";
import { RiskControlService } from "./risk-control.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma: any = {
  $queryRaw: jest.fn(),
  riskRule: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  riskAlert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  fraudDetection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  userBehaviorLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  appealRecord: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  deviceFingerprint: {
    findMany: jest.fn(),
  },
};

describe("RiskControlService", () => {
  let svc: RiskControlService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        RiskControlService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(RiskControlService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ─── 1. 预警规则 CRUD ───

  describe("createRule", () => {
    it("创建预警规则成功", async () => {
      mockPrisma.riskRule.create.mockResolvedValue({
        id: "r1", name: "高频下单检测", type: "FRAUD", action: "ALERT", enabled: true,
      });
      const result = await svc.createRule({
        name: "高频下单检测", type: "FRAUD", conditions: { maxOrdersPerHour: 20 }, action: "ALERT",
      });
      expect(result.name).toBe("高频下单检测");
      expect(mockPrisma.riskRule.create).toHaveBeenCalled();
    });
  });

  describe("listRules", () => {
    it("分页查询规则列表", async () => {
      mockPrisma.riskRule.findMany.mockResolvedValue([{ id: "r1", name: "高频下单检测" }]);
      mockPrisma.riskRule.count.mockResolvedValue(1);
      const result = await svc.listRules({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按类型和启用状态筛选", async () => {
      mockPrisma.riskRule.findMany.mockResolvedValue([]);
      mockPrisma.riskRule.count.mockResolvedValue(0);
      const result = await svc.listRules({ type: "FRAUD", enabled: true });
      expect(result.total).toBe(0);
    });
  });

  describe("updateRule", () => {
    it("更新规则成功", async () => {
      mockPrisma.riskRule.findUnique.mockResolvedValue({ id: "r1", name: "旧规则" });
      mockPrisma.riskRule.update.mockResolvedValue({ id: "r1", name: "新规则" });
      const result = await svc.updateRule("r1", { name: "新规则" });
      expect(result.name).toBe("新规则");
    });

    it("规则不存在抛出异常", async () => {
      mockPrisma.riskRule.findUnique.mockResolvedValue(null);
      await expect(svc.updateRule("invalid", { name: "x" })).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteRule", () => {
    it("删除规则成功", async () => {
      mockPrisma.riskRule.findUnique.mockResolvedValue({ id: "r1" });
      mockPrisma.riskRule.delete.mockResolvedValue({ id: "r1" });
      const result = await svc.deleteRule("r1");
      expect(result.id).toBe("r1");
    });

    it("规则不存在抛出异常", async () => {
      mockPrisma.riskRule.findUnique.mockResolvedValue(null);
      await expect(svc.deleteRule("invalid")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 2. 预警列表 ───

  describe("listAlerts", () => {
    it("分页查询预警列表", async () => {
      mockPrisma.riskAlert.findMany.mockResolvedValue([{ id: "a1", type: "FRAUD", level: "WARN", status: "OPEN" }]);
      mockPrisma.riskAlert.count.mockResolvedValue(1);
      const result = await svc.listAlerts({});
      expect(result.items).toHaveLength(1);
    });

    it("按类型/级别/状态筛选", async () => {
      mockPrisma.riskAlert.findMany.mockResolvedValue([]);
      mockPrisma.riskAlert.count.mockResolvedValue(0);
      const result = await svc.listAlerts({ type: "FRAUD", level: "DANGER", status: "OPEN" });
      expect(result.total).toBe(0);
    });
  });

  describe("handleAlert", () => {
    it("处理预警成功", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({ id: "a1", status: "OPEN", detail: {} });
      mockPrisma.riskAlert.update.mockResolvedValue({ id: "a1", status: "HANDLED", handledBy: "admin1" });
      const result = await svc.handleAlert("a1", "admin1", "已处理");
      expect(result.status).toBe("HANDLED");
    });

    it("预警不存在抛出异常", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue(null);
      await expect(svc.handleAlert("invalid", "admin1")).rejects.toThrow(BusinessException);
    });

    it("非OPEN状态无法处理", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({ id: "a1", status: "HANDLED" });
      await expect(svc.handleAlert("a1", "admin1")).rejects.toThrow(BusinessException);
    });
  });

  describe("dismissAlert", () => {
    it("忽略预警成功", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({ id: "a1", status: "OPEN" });
      mockPrisma.riskAlert.update.mockResolvedValue({ id: "a1", status: "DISMISSED" });
      const result = await svc.dismissAlert("a1");
      expect(result.status).toBe("DISMISSED");
    });

    it("预警不存在抛出异常", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue(null);
      await expect(svc.dismissAlert("invalid")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 3. 刷单识别 ───

  describe("listFraudDetections", () => {
    it("分页查询刷单检测列表", async () => {
      mockPrisma.fraudDetection.findMany.mockResolvedValue([{ id: "f1", type: "BRUSH_ORDER", status: "PENDING" }]);
      mockPrisma.fraudDetection.count.mockResolvedValue(1);
      const result = await svc.listFraudDetections({});
      expect(result.items).toHaveLength(1);
    });

    it("按状态筛选", async () => {
      mockPrisma.fraudDetection.findMany.mockResolvedValue([]);
      mockPrisma.fraudDetection.count.mockResolvedValue(0);
      const result = await svc.listFraudDetections({ status: "CONFIRMED" });
      expect(result.total).toBe(0);
    });
  });

  describe("scanFraud", () => {
    it("扫描刷单返回检测结果", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // deviceClusters
        .mockResolvedValueOnce([]) // highFreqIps
        .mockResolvedValueOnce([]); // refundRateUsers
      mockPrisma.fraudDetection.createMany.mockResolvedValue({ count: 0 });
      const result = await svc.scanFraud();
      expect(result.scanned).toBe(0);
    });

    it("同设备多账号被检测", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { deviceId: "dev1", userIds: ["u1", "u2", "u3"], userIdCount: BigInt(3) },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.fraudDetection.createMany.mockResolvedValue({ count: 1 });
      const result = await svc.scanFraud();
      expect(result.scanned).toBe(1);
      expect(mockPrisma.fraudDetection.createMany).toHaveBeenCalled();
    });
  });

  describe("confirmFraudDetection", () => {
    it("确认刷单成功", async () => {
      mockPrisma.fraudDetection.findUnique.mockResolvedValue({ id: "f1", status: "PENDING" });
      mockPrisma.fraudDetection.update.mockResolvedValue({ id: "f1", status: "CONFIRMED" });
      const result = await svc.confirmFraudDetection("f1");
      expect(result.status).toBe("CONFIRMED");
    });

    it("记录不存在抛出异常", async () => {
      mockPrisma.fraudDetection.findUnique.mockResolvedValue(null);
      await expect(svc.confirmFraudDetection("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("dismissFraudDetection", () => {
    it("标记误报成功", async () => {
      mockPrisma.fraudDetection.findUnique.mockResolvedValue({ id: "f1" });
      mockPrisma.fraudDetection.update.mockResolvedValue({ id: "f1", status: "DISMISSED" });
      const result = await svc.dismissFraudDetection("f1");
      expect(result.status).toBe("DISMISSED");
    });
  });

  // ─── 4. 用户行为时间线 ───

  describe("getUserTimeline", () => {
    it("返回分页行为日志及脱敏用户信息", async () => {
      mockPrisma.userBehaviorLog.findMany.mockResolvedValue([
        { id: "l1", userId: "u1", action: "LOGIN", createdAt: new Date() },
      ]);
      mockPrisma.userBehaviorLog.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1", nickname: "张三", avatar: null, phone: "13912340099", status: "ACTIVE", createdAt: new Date(),
      });
      const result = await svc.getUserTimeline("u1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.user).toBeDefined();
      // 手机号脱敏（不原样返回）
      expect(result.user?.phone).not.toBe("13912340099");
    });

    it("支持按行为类型与时间区间筛选", async () => {
      mockPrisma.userBehaviorLog.findMany.mockResolvedValue([]);
      mockPrisma.userBehaviorLog.count.mockResolvedValue(0);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await svc.getUserTimeline("u1", {
        action: "ORDER", dateFrom: "2026-01-01", dateTo: "2026-06-01", page: 2, pageSize: 10,
      });
      expect(result.total).toBe(0);
      expect(result.page).toBe(2);
      expect(result.user).toBeNull();
    });
  });

  describe("actionAlert", () => {
    it("升级预警为严重", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({ id: "a1", status: "OPEN", detail: {} });
      mockPrisma.riskAlert.update.mockResolvedValue({ id: "a1", level: "CRITICAL" });
      const result = await svc.actionAlert("a1", "admin1", "escalate", "升级处理");
      expect(result.level).toBe("CRITICAL");
    });

    it("封禁目标用户", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({
        id: "a1", status: "OPEN", detail: {}, targetId: "u1", targetType: "USER",
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u1", status: "BANNED" });
      mockPrisma.riskAlert.update.mockResolvedValue({ id: "a1", status: "HANDLED" });
      const result = await svc.actionAlert("a1", "admin1", "ban_user", "违规封禁");
      expect(result.status).toBe("HANDLED");
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it("预警不存在抛出异常", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue(null);
      await expect(svc.actionAlert("invalid", "admin1", "escalate")).rejects.toThrow(BusinessException);
    });

    it("非OPEN状态无法处置", async () => {
      mockPrisma.riskAlert.findUnique.mockResolvedValue({ id: "a1", status: "HANDLED" });
      await expect(svc.actionAlert("a1", "admin1", "escalate")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 5. 申诉处理 ───

  describe("listAppeals", () => {
    it("分页查询申诉列表", async () => {
      mockPrisma.appealRecord.findMany.mockResolvedValue([{ id: "ap1", userId: "u1", status: "PENDING" }]);
      mockPrisma.appealRecord.count.mockResolvedValue(1);
      const result = await svc.listAppeals({});
      expect(result.items).toHaveLength(1);
    });

    it("按状态与类型筛选", async () => {
      mockPrisma.appealRecord.findMany.mockResolvedValue([]);
      mockPrisma.appealRecord.count.mockResolvedValue(0);
      const result = await svc.listAppeals({ status: "PENDING", type: "USER_BAN" });
      expect(result.total).toBe(0);
      expect(mockPrisma.appealRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PENDING", type: "USER_BAN" } }),
      );
    });
  });

  describe("approveAppeal", () => {
    it("批准申诉成功", async () => {
      mockPrisma.appealRecord.findUnique.mockResolvedValue({ id: "ap1", status: "PENDING" });
      mockPrisma.appealRecord.update.mockResolvedValue({ id: "ap1", status: "APPROVED", reviewedBy: "admin1" });
      const result = await svc.approveAppeal("ap1", "admin1");
      expect(result.status).toBe("APPROVED");
    });

    it("申诉不存在抛出异常", async () => {
      mockPrisma.appealRecord.findUnique.mockResolvedValue(null);
      await expect(svc.approveAppeal("invalid", "admin1")).rejects.toThrow(BusinessException);
    });

    it("非PENDING状态无法处理", async () => {
      mockPrisma.appealRecord.findUnique.mockResolvedValue({ id: "ap1", status: "APPROVED" });
      await expect(svc.approveAppeal("ap1", "admin1")).rejects.toThrow(BusinessException);
    });
  });

  describe("rejectAppeal", () => {
    it("驳回申诉成功", async () => {
      mockPrisma.appealRecord.findUnique.mockResolvedValue({ id: "ap1", status: "PENDING" });
      mockPrisma.appealRecord.update.mockResolvedValue({ id: "ap1", status: "REJECTED", reviewNote: "证据不足" });
      const result = await svc.rejectAppeal("ap1", "admin1", "证据不足");
      expect(result.status).toBe("REJECTED");
    });
  });

  // ─── 6. 设备指纹 ───

  describe("listDeviceFingerprints", () => {
    it("按userId查询设备列表", async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { id: "d1", userId: "u1", deviceId: "dev001", platform: "ios" },
      ]);
      const result = await svc.listDeviceFingerprints({ userId: "u1" });
      expect(result).toHaveLength(1);
    });
  });

  describe("getDeviceFingerprintsByUser", () => {
    it("返回用户的设备及可疑设备数", async () => {
      const recent = new Date();
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { id: "d1", userId: "u1", deviceId: "dev001", isTrusted: true, lastSeenAt: recent },
        { id: "d2", userId: "u1", deviceId: "dev002", isTrusted: false, lastSeenAt: recent },
      ]);
      const result = await svc.getDeviceFingerprintsByUser("u1");
      expect(result.devices).toHaveLength(2);
      expect(result.suspiciousCount).toBe(1);
    });

    it("无可疑设备时返回0", async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { id: "d1", userId: "u1", deviceId: "dev001", isTrusted: false, lastSeenAt: oldDate },
      ]);
      const result = await svc.getDeviceFingerprintsByUser("u1");
      expect(result.suspiciousCount).toBe(0);
    });
  });
});
