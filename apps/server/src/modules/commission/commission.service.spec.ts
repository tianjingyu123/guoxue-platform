import { Test } from "@nestjs/testing";
import { CommissionService } from "./commission.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  commissionConfig: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  stationEarning: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  station: { findUnique: jest.fn(), update: jest.fn() },
  operator: { findUnique: jest.fn(), update: jest.fn() },
  operatorEarning: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  notification: { create: jest.fn().mockReturnValue({ catch: jest.fn() }) },
  withdrawal: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
  referralLink: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  platformFeeRecord: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };
const mockRedis = { setNX: jest.fn().mockResolvedValue(true), del: jest.fn(), get: jest.fn().mockResolvedValue(null), set: jest.fn() };

describe("CommissionService", () => {
  let svc: CommissionService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(CommissionService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("reverseCommission", () => {
    it("并发冲正：抢不到分布式锁时幂等跳过，不重复倒扣（防双入口双倍 decrement）", async () => {
      mockRedis.setNX.mockResolvedValueOnce(false); // 另一路正在冲正
      const result = await svc.reverseCommission("order1");
      expect(result).toBeNull();
      // 未进入锁体：不查记录、不写冲正
      expect(mockPrisma.stationEarning.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.stationEarning.create).not.toHaveBeenCalled();
      expect(mockPrisma.operatorEarning.createMany).not.toHaveBeenCalled();
    });

    it("单次冲正：抢到锁后正常执行并在结束时释放锁", async () => {
      mockPrisma.stationEarning.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ stationId: "s1", earned: 10, rate: 0.1 });
      mockPrisma.operatorEarning.findFirst.mockResolvedValue(null);
      mockPrisma.operatorEarning.findMany.mockResolvedValue([]);
      mockPrisma.platformFeeRecord.findMany.mockResolvedValue([]);
      const result = await svc.reverseCommission("order1");
      expect(result).toEqual({ reversed: true });
      expect(mockRedis.setNX).toHaveBeenCalledWith("commission:reverse:order1", "1", 30);
      expect(mockRedis.del).toHaveBeenCalledWith("commission:reverse:order1");
    });

    it("已冲正则幂等跳过，不重复倒扣", async () => {
      mockPrisma.stationEarning.findFirst.mockResolvedValue({ id: "se-r", earned: -10 });
      const result = await svc.reverseCommission("order1");
      expect(result).toBeNull();
      expect(mockPrisma.stationEarning.create).not.toHaveBeenCalled();
      expect(mockPrisma.operatorEarning.createMany).not.toHaveBeenCalled();
    });

    it("无分佣记录则跳过", async () => {
      mockPrisma.stationEarning.findFirst.mockResolvedValue(null);
      mockPrisma.operatorEarning.findFirst.mockResolvedValue(null);
      mockPrisma.operatorEarning.findMany.mockResolvedValue([]);
      mockPrisma.platformFeeRecord.findMany.mockResolvedValue([]);
      const result = await svc.reverseCommission("order1");
      expect(result).toBeNull();
    });

    it("有正向分佣则创建 REFUND 冲正", async () => {
      // 守卫查冲正(earned<0)→无；正向查(earned>0)→有
      mockPrisma.stationEarning.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ stationId: "s1", earned: 10, rate: 0.1 });
      mockPrisma.operatorEarning.findFirst.mockResolvedValue(null);
      mockPrisma.operatorEarning.findMany.mockResolvedValue([]);
      mockPrisma.platformFeeRecord.findMany.mockResolvedValue([]);
      const result = await svc.reverseCommission("order1");
      expect(result).toEqual({ reversed: true });
      expect(mockPrisma.stationEarning.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "REFUND", earned: -10 }) }),
      );
    });
  });

  describe("getAllConfigs", () => {
    it("返回所有配置", async () => {
      const data = [{ configKey: "course_basic", rateA: 0.1 }];
      mockPrisma.commissionConfig.findMany.mockResolvedValue(data);
      const result = await svc.getAllConfigs();
      expect(result).toEqual(data);
    });
  });

  describe("updateConfig", () => {
    it("配置存在时更新成功", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic" });
      mockPrisma.commissionConfig.update.mockResolvedValue({ configKey: "course_basic", rateA: 0.15 });
      const result = await svc.updateConfig("course_basic", { rateA: 0.15 });
      expect(result.rateA).toBe(0.15);
    });
    it("配置不存在抛出 NotFoundException", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      await expect(svc.updateConfig("invalid", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("calculateAndRecord", () => {
    it("有效推荐计算佣金并创建记录", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "user-1", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1", stationId: "station-1", amount: 100, earned: 10 });
      mockPrisma.notification.create.mockResolvedValue({});
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(result).toBeTruthy();
      expect(mockPrisma.stationEarning.create).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.station.update).toHaveBeenCalled();
    });
    it("无配置时返回 null", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(result).toBeNull();
    });
    it("无推荐人时返回 null", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100);
      expect(result).toBeNull();
    });
    it("佣金金额规整到分，避免 JS 浮点尾数", async () => {
      // 99.9 * 0.7 = 69.93000000000001（JS 浮点），应规整为 69.93 再存储与累加
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.7 });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "user-1", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
      await svc.calculateAndRecord("order-1", "COURSE", 99.9, "referrer-1");
      const createArg = mockPrisma.stationEarning.create.mock.calls[0][0];
      expect(createArg.data.earned).toBe(69.93);
      const updateArg = mockPrisma.station.update.mock.calls[0][0];
      expect(updateArg.data.totalEarning.increment).toBe(69.93);
    });
  });

  describe("calculateOperatorBonus 两级计酬合规", () => {
    // 通过 calculateAndRecord 间接触发：站长佣金(一级) + 唯一一笔管理奖(二级)，禁止第三层
    function mockCourseConfig() {
      mockPrisma.commissionConfig.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.configKey.startsWith("operator_") ? null : { configKey: where.configKey, rateA: 0.1 }),
      );
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
    }

    it("普通站长的分站：管理奖归其运营商，且单笔订单仅一笔管理奖", async () => {
      mockCourseConfig();
      mockPrisma.station.findUnique
        .mockResolvedValueOnce({ id: "station-1", userId: "st-user", totalEarning: 0 })
        .mockResolvedValueOnce({ userId: "st-user", operatorId: "op-1" });
      mockPrisma.operator.findUnique.mockResolvedValue({
        id: "op-1", userId: "op-user", level: "GOLD", parentOperatorId: "op-0", status: "ACTIVE",
      });
      await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(mockPrisma.operatorEarning.create).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.operatorId).toBe("op-1");
      expect(arg.data.source).toBe("MGMT_BONUS");
      expect(arg.data.earned).toBe(1.2); // 站长佣金10 × GOLD 12%
      expect(arg.data.sourceOperatorId).toBeUndefined();
    });

    it("运营商自营分站：管理奖上浮给上级运营商（上级只对下级站长角色收入计酬）", async () => {
      mockCourseConfig();
      mockPrisma.station.findUnique
        .mockResolvedValueOnce({ id: "station-1", userId: "op-user", totalEarning: 0 })
        .mockResolvedValueOnce({ userId: "op-user", operatorId: "op-1" });
      mockPrisma.operator.findUnique
        .mockResolvedValueOnce({ id: "op-1", userId: "op-user", level: "GOLD", parentOperatorId: "op-0", status: "ACTIVE" })
        .mockResolvedValueOnce({ id: "op-0", userId: "parent-user", level: "GOLD", parentOperatorId: null, status: "ACTIVE" });
      await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(mockPrisma.operatorEarning.create).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.operatorId).toBe("op-0");
      expect(arg.data.source).toBe("MGMT_BONUS");
      expect(arg.data.sourceOperatorId).toBe("op-1"); // 审计追溯下级运营商
    });

    it("顶级运营商自营分站：无管理奖（平台留存），不产生任何计酬", async () => {
      mockCourseConfig();
      mockPrisma.station.findUnique
        .mockResolvedValueOnce({ id: "station-1", userId: "op-user", totalEarning: 0 })
        .mockResolvedValueOnce({ userId: "op-user", operatorId: "op-1" });
      mockPrisma.operator.findUnique.mockResolvedValue({
        id: "op-1", userId: "op-user", level: "GOLD", parentOperatorId: null, status: "ACTIVE",
      });
      await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(mockPrisma.operatorEarning.create).not.toHaveBeenCalled();
    });
  });

  describe("getStationEarnings", () => {
    it("返回分页收益列表", async () => {
      mockPrisma.stationEarning.findMany.mockResolvedValue([{ id: "e1", earned: 10 }]);
      mockPrisma.stationEarning.count.mockResolvedValue(1);
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 10 } });
      const result = await svc.getStationEarnings("station-1");
      expect(result.earnings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalEarned).toBe(10);
    });
  });

  describe("getStationBalance", () => {
    it("计算余额正确", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", totalEarning: 500 });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 200 } });
      const result = await svc.getStationBalance("station-1");
      expect(result.totalEarned).toBe(500);
      expect(result.totalWithdrawn).toBe(200);
      expect(result.balance).toBe(300);
    });
    it("分站不存在抛出 NotFoundException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getStationBalance("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("applyWithdrawal", () => {
    it("余额充足时创建提现申请", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "user-1" });
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 500 } });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null);
      mockPrisma.withdrawal.create.mockResolvedValue({ id: "w-1", amount: 200, status: "PENDING" });
      const result = await svc.applyWithdrawal("user-1", { amount: 200, alipayAccount: "test@alipay.com" });
      expect(result.status).toBe("PENDING");
      expect(result.amount).toBe(200);
    });
    it("余额不足抛出 BadRequestException", async () => {
      // applyWithdrawal 先查 userId -> 分站
      mockPrisma.station.findUnique.mockResolvedValueOnce({ id: "station-1", userId: "user-1" });
      // getStationBalance 再查 id -> 收益
      mockPrisma.station.findUnique.mockResolvedValueOnce({ id: "station-1", totalEarning: 50 });
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 50 } });
      mockPrisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      await expect(svc.applyWithdrawal("user-1", { amount: 200 })).rejects.toThrow(BusinessException);
    });
    it("无分站抛出 BadRequestException", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.applyWithdrawal("user-1", { amount: 200 })).rejects.toThrow(BusinessException);
    });
  });

  describe("auditWithdrawal", () => {
    it("审核通过", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue({ id: "w-1", userId: "user-1", status: "PENDING" });
      mockPrisma.withdrawal.update.mockResolvedValue({ id: "w-1", status: "APPROVED" });
      const result = await svc.auditWithdrawal("w-1", { status: "APPROVED" }, "admin1");
      expect(result.status).toBe("APPROVED");
    });
    it("不存在抛出 NotFoundException", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue(null);
      await expect(svc.auditWithdrawal("w-1", { status: "APPROVED" }, "admin1")).rejects.toThrow(BusinessException);
    });
    it("已处理记录不可重复审核", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue({ id: "w-1", userId: "user-1", status: "APPROVED" });
      await expect(svc.auditWithdrawal("w-1", { status: "PAID" }, "admin1")).rejects.toThrow(BusinessException);
    });
    it("不能审核自己的提现申请（防自审自批）", async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValue({ id: "w-1", userId: "user-1", status: "PENDING" });
      await expect(svc.auditWithdrawal("w-1", { status: "APPROVED" }, "user-1")).rejects.toThrow(BusinessException);
    });
  });

  describe("trackClick", () => {
    it("有效链接增加点击计数", async () => {
      mockPrisma.referralLink.findUnique.mockResolvedValue({ code: "abc123", userId: "user-1", targetType: "COURSE", targetId: "course-1", clickCount: 0 });
      const result = await svc.trackClick("abc123");
      expect(result).toBeTruthy();
      expect(result!.referrerId).toBe("user-1");
    });
    it("无效链接返回 null", async () => {
      mockPrisma.referralLink.findUnique.mockResolvedValue(null);
      const result = await svc.trackClick("invalid");
      expect(result).toBeNull();
    });
  });
});