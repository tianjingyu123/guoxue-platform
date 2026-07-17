import { Test } from "@nestjs/testing";
import { ShopCouponService } from "./shop-coupon.service";
import { ShopRefundService } from "./shop-refund.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockCoupon = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findUnique: jest.fn(),
  findUniqueOrThrow: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = {
  coupon: mockCoupon,
  userCoupon: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), createMany: jest.fn() },
  order: { findUnique: jest.fn() },
  afterSale: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn().mockImplementation((fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

const mockRefundSvc = { refundOrder: jest.fn() };

describe("ShopCouponService", () => {
  let svc: ShopCouponService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopCouponService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopRefundService, useValue: mockRefundSvc },
      ],
    }).compile();
    svc = mod.get(ShopCouponService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("batchGrantCoupon", () => {
    const activeCoupon = { id: "c1", status: "ACTIVE", validEnd: new Date(Date.now() + 86400000) };

    it("去重发放并跳过已持有未用者", async () => {
      mockCoupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.userCoupon.findMany.mockResolvedValue([{ userId: "u2" }]);
      mockPrisma.userCoupon.createMany.mockResolvedValue({ count: 2 });
      const result = await svc.batchGrantCoupon("c1", ["u1", "u2", "u3", "u1"]);
      expect(result).toEqual({ granted: 2, skipped: 1 });
      expect(mockPrisma.userCoupon.createMany).toHaveBeenCalledWith({
        data: [{ userId: "u1", couponId: "c1" }, { userId: "u3", couponId: "c1" }],
      });
    });

    it("券已失效拒绝发放", async () => {
      mockCoupon.findUnique.mockResolvedValue({ ...activeCoupon, status: "DISABLED" });
      await expect(svc.batchGrantCoupon("c1", ["u1"])).rejects.toThrow("优惠券已失效");
      expect(mockPrisma.userCoupon.createMany).not.toHaveBeenCalled();
    });

    it("券已过期拒绝发放", async () => {
      mockCoupon.findUnique.mockResolvedValue({ ...activeCoupon, validEnd: new Date(Date.now() - 1000) });
      await expect(svc.batchGrantCoupon("c1", ["u1"])).rejects.toThrow("优惠券已过期");
    });

    it("全部已持有时不执行创建", async () => {
      mockCoupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.userCoupon.findMany.mockResolvedValue([{ userId: "u1" }]);
      const result = await svc.batchGrantCoupon("c1", ["u1"]);
      expect(result).toEqual({ granted: 0, skipped: 1 });
      expect(mockPrisma.userCoupon.createMany).not.toHaveBeenCalled();
    });
  });

  describe("createCoupon", () => {
    it("创建满减券", async () => {
      mockCoupon.create.mockResolvedValue({ id: "c1", type: "FULL_REDUCE", name: "满100减20" });
      const result = await svc.createCoupon({
        type: "FULL_REDUCE", name: "满100减20", value: 20, minAmount: 100,
        validStart: "2025-01-01", validEnd: "2025-12-31",
      } as any);
      expect(result.id).toBe("c1");
      expect(mockCoupon.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: "FULL_REDUCE", value: 20, minAmount: 100 }),
      }));
    });

    it("创建折扣券自动计算折扣率", async () => {
      mockCoupon.create.mockResolvedValue({ id: "c2", type: "DISCOUNT", value: 80, discountRate: 0.8 });
      const result = await svc.createCoupon({
        type: "DISCOUNT", name: "8折券", value: 80,
        validStart: "2025-01-01", validEnd: "2025-12-31",
      } as any);
      expect(result.id).toBe("c2");
    });

    it("无门槛券默认value从discountAmount取", async () => {
      mockCoupon.create.mockResolvedValue({});
      await svc.createCoupon({
        type: "NO_THRESHOLD", name: "无门槛券", discountAmount: 10,
        validStart: "2025-01-01", validEnd: "2025-12-31",
      } as any);
      expect(mockCoupon.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ value: 10, discountAmount: 10 }),
      }));
    });
  });

  describe("listCoupons", () => {
    it("用户端只返回有效券", async () => {
      mockCoupon.findMany.mockResolvedValue([{ id: "c1" }]);
      mockCoupon.count.mockResolvedValue(1);
      const result = await svc.listCoupons();
      expect(result.coupons).toHaveLength(1);
      expect(mockCoupon.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }));
    });

    it("管理端返回所有券", async () => {
      mockCoupon.findMany.mockResolvedValue([]);
      mockCoupon.count.mockResolvedValue(0);
      const result = await svc.listCoupons(1, 20, true);
      expect(result.total).toBe(0);
    });
  });

  describe("updateCoupon", () => {
    it("更新优惠券信息", async () => {
      mockCoupon.findUnique.mockResolvedValue({ id: "c1" });
      mockCoupon.update.mockResolvedValue({ id: "c1", name: "新名称" });
      const result = await svc.updateCoupon("c1", { name: "新名称" } as any);
      expect(result.name).toBe("新名称");
    });

    it("券不存在抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue(null);
      await expect(svc.updateCoupon("no-coupon", { name: "X" } as any)).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteCoupon", () => {
    it("删除优惠券", async () => {
      mockCoupon.findUnique.mockResolvedValue({ id: "c1" });
      mockCoupon.delete.mockResolvedValue({});
      const result = await svc.deleteCoupon("c1");
      expect(result.success).toBe(true);
    });

    it("券不存在抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue(null);
      await expect(svc.deleteCoupon("no-coupon")).rejects.toThrow("不存在");
    });
  });

  describe("updateCouponStatus", () => {
    it("更新券状态", async () => {
      mockCoupon.findUniqueOrThrow.mockResolvedValue({ id: "c1" });
      mockCoupon.update.mockResolvedValue({ id: "c1", status: "INACTIVE" });
      const result = await svc.updateCouponStatus("c1", "INACTIVE");
      expect(result.status).toBe("INACTIVE");
    });
  });

  describe("claimCoupon", () => {
    it("成功领取优惠券", async () => {
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validEnd: new Date("2030-12-31"), totalCount: 100, usedCount: 50,
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null);
      mockCoupon.update.mockResolvedValue({});
      mockPrisma.userCoupon.create.mockResolvedValue({ id: "uc1" });

      const result = await svc.claimCoupon("u1", "c1");
      expect(result.id).toBe("uc1");
    });

    it("券已过期抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validEnd: new Date("2020-01-01"), totalCount: 100, usedCount: 50,
      });
      await expect(svc.claimCoupon("u1", "c1")).rejects.toThrow("已过期");
    });

    it("券已领完抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validEnd: new Date("2030-12-31"), totalCount: 100, usedCount: 100,
      });
      await expect(svc.claimCoupon("u1", "c1")).rejects.toThrow("已被领完");
    });

    it("重复领取抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validEnd: new Date("2030-12-31"), totalCount: 100, usedCount: 50,
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue({ id: "uc1" });
      await expect(svc.claimCoupon("u1", "c1")).rejects.toThrow("已领取");
    });

    it("优惠券不存在抛出异常", async () => {
      mockCoupon.findUnique.mockResolvedValue(null);
      await expect(svc.claimCoupon("u1", "no-coupon")).rejects.toThrow("优惠券不存在");
    });
  });

  describe("grantCoupon", () => {
    it("管理员发放优惠券", async () => {
      mockPrisma.userCoupon.create.mockResolvedValue({ id: "uc1", userId: "u1", couponId: "c1" });
      const result = await svc.grantCoupon("c1", "u1");
      expect(result.couponId).toBe("c1");
    });
  });

  describe("getUserCoupons", () => {
    it("获取用户未使用的优惠券", async () => {
      mockPrisma.userCoupon.findMany.mockResolvedValue([{ id: "uc1", coupon: { id: "c1", name: "满减券" } }]);
      const result = await svc.getUserCoupons("u1");
      expect(result).toHaveLength(1);
      expect(result[0].coupon.name).toBe("满减券");
    });
  });

  describe("applyAfterSale", () => {
    it("申请售后成功", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", amount: 100, status: "PAID",
      });
      mockPrisma.afterSale.create.mockResolvedValue({ id: "as1", status: "PENDING" });
      const result = await svc.applyAfterSale("u1", "o1", "REFUND", "不喜欢");
      expect(result.id).toBe("as1");
    });

    it("订单不存在抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(svc.applyAfterSale("u1", "no-order", "REFUND", "原因")).rejects.toThrow("订单不存在");
    });

    it("非本人订单抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "other", amount: 100, status: "PAID" });
      await expect(svc.applyAfterSale("u1", "o1", "REFUND", "原因")).rejects.toThrow("只能对自己的订单");
    });

    it("订单状态不可售后", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "PENDING" });
      await expect(svc.applyAfterSale("u1", "o1", "REFUND", "原因")).rejects.toThrow("订单状态不可");
    });
  });

  describe("getAfterSale", () => {
    it("查看自己的售后记录", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", userId: "u1" });
      const result = await svc.getAfterSale("as1", "u1");
      expect(result.id).toBe("as1");
    });

    it("查看他人售后记录被拒绝", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", userId: "other" });
      await expect(svc.getAfterSale("as1", "u1")).rejects.toThrow("只能查看自己的");
    });
  });

  describe("cancelAfterSale", () => {
    it("取消售后申请", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", userId: "u1", status: "PENDING" });
      mockPrisma.afterSale.update.mockResolvedValue({ id: "as1", status: "CANCELLED" });
      const result = await svc.cancelAfterSale("as1", "u1");
      expect(result.status).toBe("CANCELLED");
    });

    it("非待处理状态不可取消", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", userId: "u1", status: "APPROVED" });
      await expect(svc.cancelAfterSale("as1", "u1")).rejects.toThrow("仅待处理状态");
    });
  });

  describe("processAfterSale", () => {
    it("审批通过（非退款类·换货不触发退款）", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "exchange", orderId: "o1" });
      mockPrisma.afterSale.update.mockResolvedValue({ id: "as1", status: "APPROVED" });
      const result = await svc.processAfterSale("as1", "approve");
      expect(result.status).toBe("APPROVED");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
    });

    it("退款类审批通过=先真退款再标记（资金原子化）", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "refund_only", orderId: "o1", reason: "不想要了" });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" });
      mockRefundSvc.refundOrder.mockResolvedValue({ status: "SUCCESS" });
      mockPrisma.afterSale.update.mockResolvedValue({ id: "as1", status: "APPROVED" });
      const result = await svc.processAfterSale("as1", "approve");
      expect(mockRefundSvc.refundOrder).toHaveBeenCalledWith("o1", "不想要了");
      expect(result.status).toBe("APPROVED");
    });

    it("退款类·订单已REFUNDED则幂等跳过退款只标状态（防RefundList两连调二次退款）", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "refund", orderId: "o1" });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "REFUNDED" });
      mockPrisma.afterSale.update.mockResolvedValue({ id: "as1", status: "APPROVED" });
      const result = await svc.processAfterSale("as1", "approve");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
      expect(result.status).toBe("APPROVED");
    });

    it("退款类·退款失败则process整体失败（售后单不被标APPROVED）", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "refund_with_return", orderId: "o1" });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" });
      mockRefundSvc.refundOrder.mockRejectedValue(new Error("渠道退款失败"));
      await expect(svc.processAfterSale("as1", "approve")).rejects.toThrow("渠道退款失败");
      expect(mockPrisma.afterSale.update).not.toHaveBeenCalled();
    });

    it("退款类·关联订单不存在拒绝审批", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "REFUND", orderId: "o-gone" });
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(svc.processAfterSale("as1", "approve")).rejects.toThrow("售后关联订单不存在");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
      expect(mockPrisma.afterSale.update).not.toHaveBeenCalled();
    });

    it("审批拒绝（退款类也不触发退款）", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({ id: "as1", status: "PENDING", type: "refund_only", orderId: "o1" });
      mockPrisma.afterSale.update.mockResolvedValue({ id: "as1", status: "REJECTED" });
      const result = await svc.processAfterSale("as1", "reject");
      expect(result.status).toBe("REJECTED");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
    });

    it("售后单不存在抛出异常", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue(null);
      await expect(svc.processAfterSale("no-as", "approve")).rejects.toThrow("不存在");
    });
  });

  describe("listAfterSales", () => {
    it("按状态筛选售后列表", async () => {
      mockPrisma.afterSale.findMany.mockResolvedValue([{ id: "as1" }]);
      mockPrisma.afterSale.count.mockResolvedValue(1);
      const result = await svc.listAfterSales(1, 20, "PENDING");
      expect(result.items).toHaveLength(1);
    });
  });
});
