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
  afterSale: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn().mockImplementation((fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma)),
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: "" }]),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.afterSale.findFirst.mockResolvedValue(null);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("batchGrantCoupon", () => {
    const activeCoupon = {
      id: "c1",
      status: "ACTIVE",
      validStart: new Date(Date.now() - 86400000),
      validEnd: new Date(Date.now() + 86400000),
      totalCount: 100,
      usedCount: 10,
    };

    it("去重发放并跳过已持有未用者", async () => {
      mockCoupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.userCoupon.findMany.mockResolvedValue([{ userId: "u2" }]);
      mockPrisma.userCoupon.createMany.mockResolvedValue({ count: 2 });
      const result = await svc.batchGrantCoupon("c1", ["u1", "u2", "u3", "u1"]);
      expect(result).toEqual({ granted: 2, skipped: 1 });
      expect(mockPrisma.userCoupon.createMany).toHaveBeenCalledWith({
        data: [{ userId: "u1", couponId: "c1" }, { userId: "u3", couponId: "c1" }],
      });
      expect(mockCoupon.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { usedCount: { increment: 2 } },
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

    it("库存不足时整批失败且不创建", async () => {
      mockCoupon.findUnique.mockResolvedValue({ ...activeCoupon, totalCount: 11, usedCount: 10 });
      mockPrisma.userCoupon.findMany.mockResolvedValue([]);
      await expect(svc.batchGrantCoupon("c1", ["u1", "u2"])).rejects.toThrow("库存不足");
      expect(mockPrisma.userCoupon.createMany).not.toHaveBeenCalled();
      expect(mockCoupon.update).not.toHaveBeenCalled();
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
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validStart: new Date("2025-01-01"),
        validEnd: new Date("2030-12-31"), totalCount: 100, usedCount: 10,
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null);
      mockPrisma.userCoupon.create.mockResolvedValue({ id: "uc1", userId: "u1", couponId: "c1" });
      const result = await svc.grantCoupon("c1", "u1");
      expect(result.couponId).toBe("c1");
      expect(mockCoupon.update).toHaveBeenCalledWith({
        where: { id: "c1" }, data: { usedCount: { increment: 1 } },
      });
    });

    it("已持有未使用券时幂等返回且不占库存", async () => {
      const existing = { id: "uc1", userId: "u1", couponId: "c1" };
      mockCoupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validStart: new Date("2025-01-01"),
        validEnd: new Date("2030-12-31"), totalCount: 100, usedCount: 10,
      });
      mockPrisma.userCoupon.findFirst.mockResolvedValue(existing);

      await expect(svc.grantCoupon("c1", "u1")).resolves.toEqual(existing);
      expect(mockCoupon.update).not.toHaveBeenCalled();
      expect(mockPrisma.userCoupon.create).not.toHaveBeenCalled();
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
    beforeEach(() => {
      mockPrisma.afterSale.findFirst.mockResolvedValue(null);
    });

    it("仅退款申请按订单实付金额创建 canonical 售后单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", amount: 100, payAmount: 88, status: "PAID",
      });
      mockPrisma.afterSale.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "as1", ...data }));

      const result = await svc.applyAfterSale("u1", "o1", "REFUND", "不喜欢", 88);

      expect(result.id).toBe("as1");
      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "refund_only", amount: 88, status: "PENDING" }),
      });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "after-sale:o1",
      );
    });

    it("退货退款历史别名统一写入 refund_with_return", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "SHIPPED" });
      mockPrisma.afterSale.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "as1", ...data }));

      await svc.applyAfterSale("u1", "o1", "return", "质量问题", 100);

      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "refund_with_return", amount: 100 }),
      });
    });

    it("拒绝部分退款金额，避免页面部分申请但渠道整单退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "PAID" });

      await expect(svc.applyAfterSale("u1", "o1", "refund_only", "少退一些", 30))
        .rejects.toThrow("仅支持整单全额退款");
      expect(mockPrisma.afterSale.create).not.toHaveBeenCalled();
    });

    it("已有处理中售后时拒绝重复申请", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "PAID" });
      mockPrisma.afterSale.findFirst.mockResolvedValue({ id: "active" });

      await expect(svc.applyAfterSale("u1", "o1", "refund_only", "重复", 100))
        .rejects.toThrow("已有处理中售后");
    });

    it("订单不存在抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(svc.applyAfterSale("u1", "no-order", "refund_only", "原因")).rejects.toThrow("订单不存在");
    });

    it("非本人订单抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "other", amount: 100, status: "PAID" });
      await expect(svc.applyAfterSale("u1", "o1", "refund_only", "原因")).rejects.toThrow("只能对自己的订单");
    });

    it("订单状态不可售后", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "PENDING" });
      await expect(svc.applyAfterSale("u1", "o1", "refund_only", "原因")).rejects.toThrow("订单状态不可");
    });

    it("换货不写退款金额", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", amount: 100, status: "COMPLETED" });
      mockPrisma.afterSale.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "as1", ...data }));
      await svc.applyAfterSale("u1", "o1", "exchange", "尺码不合适");
      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "exchange", amount: null }),
      });
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


  describe("submitReturnLogistics", () => {
    it("买家可在退货审核通过后登记真实运单", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({
          id: "as1", userId: "u1", type: "refund_with_return", status: "APPROVED",
          logistics: JSON.stringify({ returnAddress: "北京市朝阳区测试路1号" }),
        })
        .mockResolvedValueOnce({ id: "as1", status: "APPROVED" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });

      await svc.submitReturnLogistics("as1", "u1", " 顺丰速运 ", " SF123456 ");

      const data = mockPrisma.afterSale.updateMany.mock.calls[0][0].data;
      expect(JSON.parse(data.logistics)).toEqual(expect.objectContaining({
        returnAddress: "北京市朝阳区测试路1号", company: "顺丰速运", logisticsNo: "SF123456",
      }));
    });

    it("空白快递信息无法绕过 DTO 后的服务校验", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({
        id: "as1", userId: "u1", type: "refund_with_return", status: "APPROVED",
        logistics: JSON.stringify({ returnAddress: "北京市朝阳区测试路1号" }),
      });

      await expect(svc.submitReturnLogistics("as1", "u1", "   ", "    "))
        .rejects.toThrow("请填写有效的快递公司和退货运单号");
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("processAfterSale", () => {
    it("换货审批只流转状态，不触发退款", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({ id: "as1", status: "PENDING", type: "exchange", orderId: "o1" })
        .mockResolvedValueOnce({ id: "as1", status: "APPROVED", type: "exchange" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });

      const result = await svc.processAfterSale("as1", "approve");

      expect(result?.status).toBe("APPROVED");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
    });

    it("退货退款审批只下发退货地址，不提前退款", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({ id: "as1", status: "PENDING", type: "refund_with_return", orderId: "o1" })
        .mockResolvedValueOnce({ id: "as1", status: "APPROVED" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });

      const result = await svc.processAfterSale("as1", "approve", "张三 13800138000 北京市朝阳区测试路1号");

      expect(result?.status).toBe("APPROVED");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED", logistics: expect.stringContaining("returnAddress") }),
      }));
    });

    it("退货退款审批缺少退货地址时拒绝", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({
        id: "as1", status: "PENDING", type: "refund_with_return", orderId: "o1",
      });
      await expect(svc.processAfterSale("as1", "approve")).rejects.toThrow("必须填写退货地址");
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled();
    });

    it("仅退款渠道处理中时售后保持 PROCESSING", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({ id: "as1", status: "PENDING", type: "refund_only", orderId: "o1", reason: "不想要了" })
        .mockResolvedValueOnce({ id: "as1", status: "PROCESSING" });
      mockPrisma.afterSale.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" });
      mockRefundSvc.refundOrder.mockResolvedValue({ status: "PROCESSING" });

      const result = await svc.processAfterSale("as1", "approve");

      expect(result?.status).toBe("PROCESSING");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledTimes(1);
    });

    it("仅退款成功后收敛为 COMPLETED", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({ id: "as1", status: "PENDING", type: "refund_only", orderId: "o1", reason: "不想要了" })
        .mockResolvedValueOnce({ id: "as1", status: "COMPLETED" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" });
      mockRefundSvc.refundOrder.mockResolvedValue({ status: "SUCCESS" });

      const result = await svc.processAfterSale("as1", "approve");

      expect(result?.status).toBe("COMPLETED");
      expect(mockRefundSvc.refundOrder).toHaveBeenCalledWith("o1", "不想要了");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: "as1", status: "PROCESSING" },
        data: { status: "COMPLETED" },
      });
    });

    it("退货退款完成动作才触发真实退款", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({
          id: "as1", status: "APPROVED", type: "refund_with_return", orderId: "o1", reason: "质量问题",
          logistics: JSON.stringify({ company: "顺丰", logisticsNo: "SF123", inspection: "ACCEPTED" }),
        })
        .mockResolvedValueOnce({ id: "as1", status: "COMPLETED" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED" });
      mockRefundSvc.refundOrder.mockResolvedValue({ status: "SUCCESS" });

      const result = await svc.processAfterSale("as1", "complete");

      expect(result?.status).toBe("COMPLETED");
      expect(mockRefundSvc.refundOrder).toHaveBeenCalledWith("o1", "质量问题");
    });

    it("退货未登记运单或未验收入库时平台也不能直接退款", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({
        id: "as1", status: "APPROVED", type: "refund_with_return", orderId: "o1", reason: "质量问题",
        logistics: JSON.stringify({ company: "顺丰", logisticsNo: "SF123" }),
      });

      await expect(svc.processAfterSale("as1", "complete")).rejects.toThrow("验收入库后才能退款");
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
    });

    it("退款失败时回退原阶段允许安全重试", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({
        id: "as1", status: "PENDING", type: "refund_only", orderId: "o1", reason: "不想要了",
      });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "o1", status: "PAID" })
        .mockResolvedValueOnce({ status: "PAID" });
      mockRefundSvc.refundOrder.mockRejectedValue(new Error("渠道退款失败"));

      await expect(svc.processAfterSale("as1", "approve")).rejects.toThrow("渠道退款失败");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenLastCalledWith({
        where: { id: "as1", status: "PROCESSING" },
        data: { status: "PENDING" },
      });
    });

    it("客服可处理非资金售后但不能批准真实退款", async () => {
      mockPrisma.afterSale.findUnique.mockResolvedValue({
        id: "as1", status: "PENDING", type: "refund_only", orderId: "o1",
      });

      await expect(svc.processAfterSale("as1", "approve", undefined, false))
        .rejects.toThrow("退款审批需要运营或财务权限");
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled();
      expect(mockRefundSvc.refundOrder).not.toHaveBeenCalled();
    });

    it("审批拒绝不触发退款", async () => {
      mockPrisma.afterSale.findUnique
        .mockResolvedValueOnce({ id: "as1", status: "PENDING", type: "refund_only", orderId: "o1" })
        .mockResolvedValueOnce({ id: "as1", status: "REJECTED" });
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 });
      const result = await svc.processAfterSale("as1", "reject", "不符合条件");
      expect(result?.status).toBe("REJECTED");
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
