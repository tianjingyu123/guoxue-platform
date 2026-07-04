import { Test } from "@nestjs/testing";
import { CommissionService } from "./commission.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { RedisService } from "../../redis/redis.service";
import { UserGrowthService } from "../user-growth/user-growth.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  commissionConfig: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  stationEarning: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  station: { findUnique: jest.fn(), update: jest.fn() },
  operator: { findUnique: jest.fn(), update: jest.fn() },
  order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  product: { findUnique: jest.fn() },
  operatorEarning: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  notification: { create: jest.fn().mockReturnValue({ catch: jest.fn() }) },
  withdrawal: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
  referralLink: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  platformFeeRecord: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
  ledgerEntry: { findFirst: jest.fn(), create: jest.fn() },
  settlementRule: { findUnique: jest.fn() },
  $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
};
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) };
const mockRedis = { setNX: jest.fn().mockResolvedValue(true), del: jest.fn(), get: jest.fn().mockResolvedValue(null), set: jest.fn() };
const mockGrowth = { addExp: jest.fn().mockResolvedValue(undefined) };

describe("CommissionService", () => {
  let svc: CommissionService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: RedisService, useValue: mockRedis },
        { provide: UserGrowthService, useValue: mockGrowth },
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
        id: "op-1", userId: "op-user", level: "GOLD", parentOperatorId: "op-0", status: "ACTIVE", channelType: "ONLINE", mgmtRate: null,
      });
      await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1");
      expect(mockPrisma.operatorEarning.create).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.operatorId).toBe("op-1");
      expect(arg.data.source).toBe("MGMT_BONUS");
      expect(arg.data.earned).toBe(1); // 站长佣金10 × ONLINE 默认10%（V2改制·等级率作废·2026-07-04拍板）
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

  describe("佣-V2-P1 商品级佣金（Product.commissionRate 取值链）", () => {
    function mockStation() {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "st-user", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
    }

    it("PRODUCT 订单：逐品 commissionRate 覆盖类型默认 rateA", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockStation();
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "prod-1" });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: 0.35 });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, "referrer-1");
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "prod-1" } }),
      );
      const arg = mockPrisma.stationEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.35);
      expect(arg.data.earned).toBe(35);
    });

    it("PRODUCT 订单：commissionRate 为空回落类型默认 rateA", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockStation();
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "prod-1" });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: null });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, "referrer-1");
      const arg = mockPrisma.stationEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.2);
      expect(arg.data.earned).toBe(20);
    });

    it("PRODUCT 订单：越界逐品率（≥1）视为无效回落 rateA", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockStation();
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "prod-1" });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: 1.5 });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, "referrer-1");
      const arg = mockPrisma.stationEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.2);
      expect(arg.data.earned).toBe(20);
    });

    it("非 PRODUCT 订单不受逐品率影响（不查 Product）", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.2 });
      mockStation();
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: 0.99 });
      await svc.calculateAndRecord("order-1", "COURSE", 100, "referrer-1", undefined, undefined, "buyer-1");
      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
      const arg = mockPrisma.stationEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.2);
      expect(arg.data.earned).toBe(20);
    });
  });

  describe("佣-V2-P1 管理奖改制（基数=站长实得佣金·比率=mgmtRate??渠道默认）", () => {
    // 订单 1000 × rateA 10% → 站长佣金 100（管理奖基数）
    function mockBase(operator: Record<string, unknown>) {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "course-1" });
      mockPrisma.station.findUnique
        .mockResolvedValueOnce({ id: "station-1", userId: "st-user", totalEarning: 0 })
        .mockResolvedValueOnce({ userId: "st-user", operatorId: "op-1" });
      mockPrisma.operator.findUnique.mockResolvedValue(operator);
    }

    it("ONLINE 运营商默认 10%：站长佣金 100 → 管理奖 10", async () => {
      mockBase({ id: "op-1", userId: "op-user", parentOperatorId: null, status: "ACTIVE", channelType: "ONLINE", mgmtRate: null });
      await svc.calculateAndRecord("order-1", "COURSE", 1000, "referrer-1");
      expect(mockPrisma.operatorEarning.create).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.amount).toBe(100); // 基数=站长实得佣金额（非订单原始金额 1000）
      expect(arg.data.rate).toBe(0.1);
      expect(arg.data.earned).toBe(10);
    });

    it("OFFLINE 运营商默认 20%：站长佣金 100 → 管理奖 20", async () => {
      mockBase({ id: "op-1", userId: "op-user", parentOperatorId: null, status: "ACTIVE", channelType: "OFFLINE", mgmtRate: null });
      await svc.calculateAndRecord("order-1", "COURSE", 1000, "referrer-1");
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.amount).toBe(100);
      expect(arg.data.rate).toBe(0.2);
      expect(arg.data.earned).toBe(20);
    });

    it("mgmtRate 覆盖优先于 channelType 默认：0.15 → 管理奖 15", async () => {
      mockBase({ id: "op-1", userId: "op-user", parentOperatorId: null, status: "ACTIVE", channelType: "OFFLINE", mgmtRate: 0.15 });
      await svc.calculateAndRecord("order-1", "COURSE", 1000, "referrer-1");
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.15);
      expect(arg.data.earned).toBe(15);
    });

    it("等级率(8/12/15/20%)不再参与计算：GOLD 等级 ONLINE 运营商仍按 10%", async () => {
      mockBase({ id: "op-1", userId: "op-user", level: "GOLD", parentOperatorId: null, status: "ACTIVE", channelType: "ONLINE", mgmtRate: null });
      await svc.calculateAndRecord("order-1", "COURSE", 1000, "referrer-1");
      const arg = mockPrisma.operatorEarning.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.1); // 非 GOLD 12%
      expect(arg.data.earned).toBe(10);
    });
  });

  describe("佣-V2-P2 渠道主体受益人路由（CIRCLE/OFFLINE_STATION → LedgerEntry）", () => {
    /** PRODUCT 订单 100 元·rateA 20%·临时归因命中渠道主体（Order.tempRefSubjectType） */
    function mockChannelOrder(subjectType: string, orderUserId = "buyer-1") {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: orderUserId, targetId: "prod-1", tempRefSubjectType: subjectType });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: null });
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      mockPrisma.ledgerEntry.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "le-1", ...data }));
    }

    it("CIRCLE 渠道：佣金入 LedgerEntry role=CIRCLE·不建 StationEarning·不派管理奖", async () => {
      mockChannelOrder("CIRCLE");
      const result = await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "circle-owner");
      expect(result).toBeTruthy();
      const arg = mockPrisma.ledgerEntry.create.mock.calls[0][0];
      expect(arg.data.role).toBe("CIRCLE");
      expect(arg.data.beneficiaryType).toBe("USER");
      expect(arg.data.beneficiaryId).toBe("circle-owner");
      expect(arg.data.category).toBe("COMMISSION");
      expect(arg.data.amount).toBe(20); // 100 × 0.2
      expect(arg.data.status).toBe("PENDING");
      expect(mockPrisma.stationEarning.create).not.toHaveBeenCalled();
      expect(mockPrisma.operatorEarning.create).not.toHaveBeenCalled(); // 管理奖仅 STATION 渠道派生
      expect(mockPrisma.station.findUnique).not.toHaveBeenCalled(); // 不走分站路径
    });

    it("OFFLINE_STATION 渠道：role=OFFLINE_STATION·受益人=驿站主", async () => {
      mockChannelOrder("OFFLINE_STATION");
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "offline-owner");
      const arg = mockPrisma.ledgerEntry.create.mock.calls[0][0];
      expect(arg.data.role).toBe("OFFLINE_STATION");
      expect(arg.data.beneficiaryId).toBe("offline-owner");
      expect(mockPrisma.stationEarning.create).not.toHaveBeenCalled();
      expect(mockPrisma.operatorEarning.create).not.toHaveBeenCalled();
    });

    it("渠道主体自购（付款人=受益人）：不产生佣金", async () => {
      mockChannelOrder("CIRCLE", "circle-owner"); // 订单付款人即圈主
      const result = await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "circle-owner");
      expect(result).toBeNull();
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it("幂等：同订单同渠道角色已有正向佣金则返回既有记录不重复入账", async () => {
      mockChannelOrder("CIRCLE");
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue({ id: "le-exist", role: "CIRCLE", amount: 20 });
      const result: any = await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "circle-owner");
      expect(result.id).toBe("le-exist");
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it("逐品率 Product.commissionRate 对渠道佣金同样生效", async () => {
      mockChannelOrder("CIRCLE");
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: 0.35 });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "circle-owner");
      const arg = mockPrisma.ledgerEntry.create.mock.calls[0][0];
      expect(arg.data.rate).toBe(0.35);
      expect(arg.data.amount).toBe(35);
    });

    it("SettlementRule 存在时对齐缓冲期与大额冻结", async () => {
      mockChannelOrder("CIRCLE");
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        enabled: true, bufferDays: 7, requireApproval: true, approvalThreshold: 10,
      });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "circle-owner");
      const arg = mockPrisma.ledgerEntry.create.mock.calls[0][0];
      expect(arg.data.status).toBe("FROZEN"); // 20 ≥ 阈值 10
      expect(arg.data.availableAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    });

    it("tempRefSubjectType=STATION：走现行分站路径（StationEarning·不落渠道 LedgerEntry）", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "prod-1", tempRefSubjectType: "STATION" });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: null });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "st-user", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
      await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "st-user");
      expect(mockPrisma.stationEarning.create).toHaveBeenCalled();
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it("tempRefSubjectType 为空（现行 dto 传入临时推荐人）：走现行分站路径不受影响", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "product_platform", rateA: 0.2 });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "prod-1", tempRefSubjectType: null });
      mockPrisma.product.findUnique.mockResolvedValue({ commissionRate: null });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "st-user", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
      const result = await svc.calculateAndRecord("order-1", "PRODUCT", 100, undefined, "st-user");
      expect(result).toBeTruthy();
      expect(mockPrisma.stationEarning.create).toHaveBeenCalled();
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });
  });

  describe("佣-V2-P4 非渠道分享成交 → 创作/推广积分（替代现金佣金）", () => {
    /** COURSE 订单·推荐人存在但查无 Station 且无 tempRefSubjectType（普通用户分享） */
    function mockNonChannelOrder(buyerId = "buyer-1") {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: buyerId, targetId: "course-1", tempRefSubjectType: null });
      mockPrisma.station.findUnique.mockResolvedValue(null); // 推荐人非站长
      mockPrisma.order.findFirst.mockResolvedValue(null); // 无历史同推荐人已支付单（首单）
    }

    it("非渠道推荐发积分：档位=订单金额（元）向下取整×2（99.9元→198分）·不产生现金佣金", async () => {
      mockNonChannelOrder();
      const result = await svc.calculateAndRecord("order-1", "COURSE", 99.9, "friend-1");
      expect(result).toBeNull(); // 无现金佣金
      expect(mockGrowth.addExp).toHaveBeenCalledWith("friend-1", 198, "share_conversion");
      expect(mockPrisma.stationEarning.create).not.toHaveBeenCalled();
      expect(mockPrisma.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it("积分封顶 200 分/单：500 元订单 → 发 200 分（非 1000）", async () => {
      mockNonChannelOrder();
      await svc.calculateAndRecord("order-1", "COURSE", 500, "friend-1");
      expect(mockGrowth.addExp).toHaveBeenCalledWith("friend-1", 200, "share_conversion");
    });

    it("渠道主体（推荐人有 Station）不发积分：走现金佣金主路径", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ configKey: "course_basic", rateA: 0.1 });
      mockPrisma.order.findUnique.mockResolvedValue({ userId: "buyer-1", targetId: "course-1", tempRefSubjectType: null });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "station-1", userId: "st-user", totalEarning: 0 });
      mockPrisma.stationEarning.create.mockResolvedValue({ id: "earning-1" });
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "st-user");
      expect(result).toBeTruthy();
      expect(mockPrisma.stationEarning.create).toHaveBeenCalled(); // 现金佣金
      expect(mockGrowth.addExp).not.toHaveBeenCalled(); // 不发积分
    });

    it("同一（买家,推荐人）仅首单计：历史已有同推荐人已支付单则不发", async () => {
      mockNonChannelOrder();
      mockPrisma.order.findFirst.mockResolvedValue({ id: "prior-order" }); // 已有首单
      const result = await svc.calculateAndRecord("order-2", "COURSE", 100, "friend-1");
      expect(result).toBeNull();
      expect(mockGrowth.addExp).not.toHaveBeenCalled();
      // 首单判定查询：排除本单·限已支付态·同推荐人（永久或临时）
      const arg = mockPrisma.order.findFirst.mock.calls[0][0];
      expect(arg.where.id).toEqual({ not: "order-2" });
      expect(arg.where.userId).toBe("buyer-1");
      expect(arg.where.OR).toEqual([{ tempReferrerId: "friend-1" }, { referrerId: "friend-1" }]);
    });

    it("自购（推荐人=买家）不发积分", async () => {
      mockNonChannelOrder("friend-1"); // 买家即推荐人
      const result = await svc.calculateAndRecord("order-1", "COURSE", 100, "friend-1");
      expect(result).toBeNull();
      expect(mockGrowth.addExp).not.toHaveBeenCalled();
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled(); // 自购直接短路，不查首单
    });

    it("addExp 抛错不阻断分佣主流程（静默返回 null 不抛出）", async () => {
      mockNonChannelOrder();
      mockGrowth.addExp.mockRejectedValueOnce(new Error("growth service down"));
      await expect(svc.calculateAndRecord("order-1", "COURSE", 100, "friend-1")).resolves.toBeNull();
    });
  });

  describe("佣-V2-P4 站长被临时抢佣透明化明细（getStationPreemptedOrders）", () => {
    it("非站长（查无分站）→ FORBIDDEN，只能查自己分站", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null);
      await expect(svc.getStationPreemptedOrders("user-x")).rejects.toThrow(BusinessException);
      // 按调用者 userId 定位分站（本人）而非任意传入 stationId
      expect(mockPrisma.station.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-x" } }),
      );
    });

    it("orderId 打码（仅前8位）·条件=归属我分站+tempReferrerId非空且≠我+已支付·不暴露抢佣者身份", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-1" });
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "abcdefgh-1111-2222-3333-444444444444", amount: 88.8, tempRefSubjectType: "CIRCLE", createdAt: new Date("2026-07-01") },
      ]);
      mockPrisma.order.count.mockResolvedValue(1);
      const result = await svc.getStationPreemptedOrders("st-user", 1, 20);
      expect(result.total).toBe(1);
      expect(result.list[0]).toEqual({
        orderId: "abcdefgh****", // 打码
        amount: 88.8,
        subjectType: "CIRCLE",
        createdAt: new Date("2026-07-01"),
      });
      expect(Object.keys(result.list[0])).not.toContain("tempReferrerId"); // 不暴露抢佣者身份
      const where = mockPrisma.order.findMany.mock.calls[0][0].where;
      expect(where.user).toEqual({ attributionStationId: "st-1" });
      expect(where.tempReferrerId).toEqual({ not: null });
      expect(where.NOT).toEqual({ tempReferrerId: "st-user" }); // 排除临时归因是我自己
      expect(where.status).toEqual({ in: ["PAID", "SHIPPED", "COMPLETED"] });
    });

    it("分页参数正确传导（page=2/pageSize=10 → skip=10/take=10）", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-1" });
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(23);
      const result = await svc.getStationPreemptedOrders("st-user", 2, 10);
      const arg = mockPrisma.order.findMany.mock.calls[0][0];
      expect(arg.skip).toBe(10);
      expect(arg.take).toBe(10);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(23);
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