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

  async createOrder(stationId: string, userId: string, dto: { orderType: string; targetId: string; amount: number }) {
    // 服务端校验金额：从数据库查询实际价格，忽略前端传入的 amount
    let actualAmount: number;
    if (dto.orderType === "COURSE") {
      const course = await this.prisma.offlineCourse.findUnique({ where: { id: dto.targetId } });
      if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
      actualAmount = Number(course.price);
    } else if (dto.orderType === "PRODUCT") {
      const product = await this.prisma.stationProduct.findUnique({ where: { id: dto.targetId } });
      if (!product) throw new BusinessException(ErrorCode.NOT_FOUND, "商品不存在");
      actualAmount = Number(product.price);
    } else if (dto.orderType === "TEACHER_BOOKING") {
      // 教师预约：从预约记录查询价格
      const booking = await this.prisma.stationTeacherBooking.findUnique({ where: { id: dto.targetId }, select: { price: true } });
      if (!booking) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
      actualAmount = Number(booking.price || 0);
      if (actualAmount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "预约金额异常");
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的订单类型: ${dto.orderType}`);
    }

    const stationIncome = actualAmount * 0.7;
    return this.prisma.stationOrder.create({
      data: {
        stationId,
        orderType: dto.orderType,
        targetId: dto.targetId,
        amount: actualAmount,
        stationIncome,
      },
    });
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

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const existing = await this.prisma.stationOrder.findUnique({ where: { id: orderId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站订单不存在");
    await this.shared.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationOrder.update({ where: { id: orderId }, data: { status } });
  }

  // ───────── 结算 ─────────

  async createSettlement(stationId: string, dto: { period: string; totalIncome: number }) {
    const platformShare = dto.totalIncome * 0.3; // 平台抽成30%
    const stationShare = dto.totalIncome * 0.7;

    return this.prisma.stationSettlement.create({
      data: {
        stationId,
        period: dto.period,
        totalIncome: dto.totalIncome,
        stationShare,
        platformShare,
      },
    });
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

  async settleStation(stationId: string, settlementId: string) {
    const settlement = await this.prisma.stationSettlement.findFirst({
      where: { id: settlementId, stationId },
    });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    if (settlement.settled) throw new BusinessException(ErrorCode.BAD_REQUEST, "已结算");

    return this.prisma.stationSettlement.update({
      where: { id: settlementId },
      data: { settled: true, settledAt: new Date() },
    });
  }

  // ───────── 收益看板 ─────────

  async getRevenueDashboard(stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const [orders, settlements, courses, products] = await Promise.all([
      this.prisma.stationOrder.aggregate({
        where: { stationId },
        _sum: { amount: true, stationIncome: true },
        _count: true,
      }),
      this.prisma.stationSettlement.aggregate({
        where: { stationId, settled: true },
        _sum: { stationShare: true, platformShare: true, totalIncome: true },
      }),
      this.prisma.offlineCourse.count({ where: { stationId } }),
      this.prisma.stationProduct.count({ where: { stationId, status: "ACTIVE" } }),
    ]);

    // 本月订单
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await this.prisma.stationOrder.aggregate({
      where: { stationId, createdAt: { gte: monthStart } },
      _sum: { amount: true, stationIncome: true },
      _count: true,
    });

    return {
      totalOrders: orders._count,
      totalRevenue: orders._sum.amount || 0,
      totalStationIncome: orders._sum.stationIncome || 0,
      settledAmount: settlements._sum.stationShare || 0,
      platformFee: settlements._sum.platformShare || 0,
      activeCourses: courses,
      activeProducts: products,
      monthOrders: monthOrders._count,
      monthRevenue: monthOrders._sum.amount || 0,
      monthStationIncome: monthOrders._sum.stationIncome || 0,
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
