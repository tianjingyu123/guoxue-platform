import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { safePagination } from "../../../common/pagination";
import { OfflineSharedService } from "./offline-shared.service";

/**
 * 线下驿站-商品交易域（从 offline.service 拆出·纯搬家不改逻辑）。
 * 职责：驿站商品 CRUD + 订单创建/列表/状态 + 结算创建/列表/结算 + 收益看板
 * + 驿站商品（平台监控 adminListProducts）。
 * 依赖：共享叶子域（assertStationOwner）·单向不循环。
 */
@Injectable()
export class OfflineCommerceService {
  constructor(
    private prisma: PrismaService,
    private shared: OfflineSharedService,
  ) {}

  // ───────── 驿站商品 ─────────

  async createProduct(userId: string, stationId: string, dto: { name: string; price: number; stock?: number; isPlatform?: boolean }) {
    await this.shared.assertStationOwner(userId, stationId);
    return this.prisma.stationProduct.create({
      data: {
        stationId,
        name: dto.name,
        price: dto.price,
        stock: dto.stock ?? 0,
        isPlatform: dto.isPlatform ?? false,
      },
    });
  }

  async updateProduct(userId: string, productId: string, dto: { name?: string; price?: number; stock?: number; status?: string }) {
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
    await this.shared.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationProduct.update({ where: { id: productId }, data: dto });
  }

  async listProducts(operatorUserId: string, stationId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    await this.shared.assertStationOwner(operatorUserId, stationId);
    const { status } = params || {};
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: Prisma.StationProductWhereInput = { stationId };
    if (status) where.status = status;
    const [products, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { products, total, page, pageSize };
  }

  async deleteProduct(userId: string, productId: string) {
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
    await this.shared.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationProduct.update({ where: { id: productId }, data: { status: "INACTIVE" } });
  }

  // ───────── 订单 ─────────

  async createOrder(_stationId: string, _userId: string, _dto: { orderType: string; targetId: string; amount: number }): Promise<never> {
    // StationOrder 缺少付款人、支付交易号和回调状态，不能作为在线资金订单使用。
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "驿站在线收款尚未接入统一收银台，当前仅支持到店支付，不生成平台订单",
    );
  }

  async listOrders(operatorUserId: string, stationId: string, params?: { orderType?: string; status?: string; page?: number; pageSize?: number }) {
    await this.shared.assertStationOwner(operatorUserId, stationId);
    const { orderType, status } = params || {};
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: Prisma.StationOrderWhereInput = { stationId };
    if (orderType) where.orderType = orderType;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.stationOrder.findMany({
        where,
        skip, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOrder.count({ where }),
    ]);
    return { orders, total, page, pageSize };
  }

  async updateOrderStatus(_userId: string, _orderId: string, _status: string): Promise<never> {
    // 付款状态只能由真实支付回调推进；驿站主不得手工伪造 PAID/COMPLETED。
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "驿站在线订单状态只能由支付系统更新，当前功能尚未开放",
    );
  }

  // ───────── 结算 ─────────

  async createSettlement(_stationId: string, _dto: { period: string; totalIncome: number }): Promise<never> {
    // 禁止以管理员手填金额代替已支付订单归集。
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "驿站自动归集与真实打款尚未接入，当前不可创建结算单",
    );
  }

  async listSettlements(operatorUserId: string, stationId: string, rawPage = 1, rawPageSize = 20) {
    await this.shared.assertStationOwner(operatorUserId, stationId);
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { stationId };
    const [settlements, total] = await Promise.all([
      this.prisma.stationSettlement.findMany({
        where, skip, take: pageSize,
        orderBy: { period: "desc" },
      }),
      this.prisma.stationSettlement.count({ where }),
    ]);
    return { settlements, total, page, pageSize };
  }

  async settleStation(_stationId: string, _settlementId: string): Promise<never> {
    // settled=true 不能替代真实出款凭证；通道接入前一律 fail-closed。
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "驿站真实打款通道尚未接入，禁止仅修改为已结算",
    );
  }

  // ───────── 收益看板 ─────────

  async getRevenueDashboard(userId: string, stationId: string) {
    await this.shared.assertStationOwner(userId, stationId);
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const paidStatuses = ["PAID", "COMPLETED"];
    const [orders, courses, products] = await Promise.all([
      this.prisma.stationOrder.aggregate({
        where: { stationId, status: { in: paidStatuses } },
        _sum: { amount: true, stationIncome: true },
        _count: true,
      }),
      this.prisma.offlineCourse.count({
        where: { stationId, auditStatus: "APPROVED", status: "PUBLISHED" },
      }),
      this.prisma.stationProduct.count({ where: { stationId, status: "ACTIVE" } }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await this.prisma.stationOrder.aggregate({
      where: { stationId, status: { in: paidStatuses }, createdAt: { gte: monthStart } },
      _sum: { amount: true, stationIncome: true },
      _count: true,
    });

    const totalRevenue = Number(orders._sum.amount || 0);
    const totalStationIncome = Number(orders._sum.stationIncome || 0);
    return {
      totalOrders: orders._count,
      totalRevenue,
      totalStationIncome,
      settledAmount: 0,
      platformFee: Math.max(0, totalRevenue - totalStationIncome),
      activeCourses: courses,
      activeProducts: products,
      monthOrders: monthOrders._count,
      monthRevenue: monthOrders._sum.amount || 0,
      monthStationIncome: monthOrders._sum.stationIncome || 0,
      collectionMode: "PAY_AT_STATION",
      onlineCollectionEnabled: false,
      settlementEnabled: false,
    };
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 驿站商品（跨驿站列表，平台监控）*/
  async adminListProducts(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: Prisma.StationProductWhereInput = {};
    if (params?.stationId) where.stationId = params.stationId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
