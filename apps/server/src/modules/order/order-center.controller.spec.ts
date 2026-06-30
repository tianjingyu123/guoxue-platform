import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { OrderCenterController } from "./order-center.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockGuard: CanActivate = { canActivate: () => true };

describe("OrderCenterController", () => {
  let ctrl: OrderCenterController;
  let prisma: any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [OrderCenterController],
      providers: [{
        provide: PrismaService,
        useValue: {
          order: { findMany: jest.fn() },
          memberPurchase: { findMany: jest.fn() },
          stationBundleAccess: { findMany: jest.fn() },
          station: { findFirst: jest.fn() },
          operator: { findFirst: jest.fn() },
          product: { findMany: jest.fn().mockResolvedValue([]) },
        },
      }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(OrderCenterController);
    prisma = mod.get(PrismaService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("getMyOrders", () => {
    it("默认查全部类型", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.station.findFirst.mockResolvedValue(null);
      prisma.operator.findFirst.mockResolvedValue(null);
      prisma.memberPurchase.findMany.mockResolvedValue([]);

      const result = await ctrl.getMyOrders({ user: { id: "u1" } } as any);
      expect(result.orders).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(prisma.memberPurchase.findMany).toHaveBeenCalled();
    });

    it("按类型 SHOP 筛选", async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: "o1", type: "COURSE", targetId: "c1", status: "PAID", amount: 100, payAmount: 99, createdAt: new Date() },
      ]);
      const result = await ctrl.getMyOrders({ user: { id: "u1" } } as any, "SHOP");
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderType).toBe("SHOP");
      expect(prisma.memberPurchase.findMany).not.toHaveBeenCalled();
    });

    it("按类型 MEMBER 筛选", async () => {
      prisma.memberPurchase.findMany.mockResolvedValue([
        { id: "mp1", amount: 299, memberType: "VIP", paidAt: new Date() },
      ]);
      const result = await ctrl.getMyOrders({ user: { id: "u1" } } as any, "MEMBER");
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderType).toBe("MEMBER");
    });

    it("按状态筛选商城订单", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.memberPurchase.findMany.mockResolvedValue([]);
      await ctrl.getMyOrders({ user: { id: "u1" } } as any, "SHOP", "PAID");
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", status: "PAID" } }),
      );
    });

    it("BUNDLE — 分站有数据时合并", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.memberPurchase.findMany.mockResolvedValue([]);
      prisma.station.findFirst.mockResolvedValue({ id: "st1" });
      prisma.operator.findFirst.mockResolvedValue(null);
      prisma.stationBundleAccess.findMany.mockResolvedValue([
        { id: "a1", bundle: { id: "b1", name: "新手包", type: "FREE" }, createdAt: new Date() },
      ]);

      const result = await ctrl.getMyOrders({ user: { id: "u1" } } as any, "BUNDLE");
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderType).toBe("BUNDLE");
    });

    it("分页计算正确", async () => {
      const orders = Array.from({ length: 25 }, (_, i) => ({
        id: `o${i}`, orderType: "SHOP", type: "COURSE", targetId: "c1",
        status: "PAID", amount: 100, payAmount: 99, createdAt: new Date(),
      }));
      prisma.order.findMany.mockResolvedValue(orders);
      prisma.memberPurchase.findMany.mockResolvedValue([]);
      prisma.station.findFirst.mockResolvedValue(null);
      prisma.operator.findFirst.mockResolvedValue(null);

      const result = await ctrl.getMyOrders({ user: { id: "u1" } } as any, "SHOP", undefined, "2" as any, "10" as any);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
      expect(result.orders).toHaveLength(10);
    });
  });

  describe("adminAllOrders", () => {
    it("管理员查全部类型", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.memberPurchase.findMany.mockResolvedValue([]);
      const result = await ctrl.adminAllOrders();
      expect(result.orders).toEqual([]);
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(prisma.memberPurchase.findMany).toHaveBeenCalled();
    });

    it("按类型+关键词筛选", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      await ctrl.adminAllOrders("SHOP", "PAID", "testUser");
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PAID", OR: [
            { id: { contains: "testUser" } },
            { user: { nickname: { contains: "testUser" } } },
          ]},
        }),
      );
    });

    it("MEMBER类型带关键词", async () => {
      prisma.memberPurchase.findMany.mockResolvedValue([]);
      await ctrl.adminAllOrders("MEMBER", undefined, "testUser");
      expect(prisma.memberPurchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { nickname: { contains: "testUser" } } },
        }),
      );
    });
  });
});
