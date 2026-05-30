import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { MERCHANT_CONFIG_KEYS, MERCHANT_FEATURE_FLAGS } from "./merchant.types";
import {
  CreateMerchantApplyDto, UpdateMerchantApplyDto, ApproveMerchantDto, UpdateMerchantStatusDto,
  MerchantListQueryDto, UpdateMerchantProfileDto, ProductQueryDto, MerchantOrderQueryDto,
  ShipOrderDto, ReviewQueryDto, PaginationDto,
  CreateViolationDto, HandleViolationDto, MerchantProductDto,
} from "./merchant.dto";

@Injectable()
export class MerchantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
    private readonly notification: NotificationService,
    private readonly systemService: SystemService,
  ) {}

  // ─── 入驻申请 ───

  async createApplication(userId: string, dto: CreateMerchantApplyDto) {
    const existing = await this.prisma.merchant.findUnique({ where: { userId } });
    if (existing) throw new BusinessException(ErrorCode.MERCHANT_ALREADY_EXISTS, "您已提交过入驻申请");

    return this.prisma.merchant.create({
      data: {
        userId,
        shopName: dto.shopName,
        shopLogo: dto.shopLogo,
        shopIntro: dto.shopIntro,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        idCardNumber: dto.idCardNumber,
        idCardFront: dto.idCardFront,
        idCardBack: dto.idCardBack,
        businessLicense: dto.businessLicense,
        brandAuth: dto.brandAuth,
        categoryIds: dto.categoryIds ?? [],
        status: "PENDING_REVIEW",
      },
    });
  }

  async getApplication(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "未找到入驻申请");
    return merchant;
  }

  async updateApplication(userId: string, dto: UpdateMerchantApplyDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "未找到入驻申请");
    if (merchant.status !== "PENDING_REVIEW" && merchant.status !== "REVIEW_FAILED") {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "当前状态不可修改");
    }

    return this.prisma.merchant.update({
      where: { userId },
      data: {
        ...dto,
        ...(merchant.status === "REVIEW_FAILED" ? { status: "PENDING_REVIEW", rejectReason: null } : {}),
      },
    });
  }

  async submitForReview(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "未找到入驻申请");
    if (merchant.status !== "PENDING_REVIEW") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可提交");

    if (!merchant.contactName || !merchant.idCardNumber || !merchant.contactPhone) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请完善入驻信息");
    }

    // 自动计算保证金
    let depositAmount: any = merchant.depositAmount;
    const autoCalc = await this.featureFlag.isEnabled(MERCHANT_FEATURE_FLAGS.DEPOSIT_AUTO);
    if (autoCalc) {
      depositAmount = await this.calculateDeposit(merchant.categoryIds);
    }

    return this.prisma.merchant.update({
      where: { userId },
      data: { status: "PENDING_REVIEW", depositAmount, reviewedAt: null, rejectReason: null },
    });
  }

  // ─── 保证金自动计算 ───

  async calculateDeposit(categoryIds: string[]): Promise<number> {
    const baseCfg = await this.systemService.getConfig(MERCHANT_CONFIG_KEYS.DEPOSIT_BASE);
    const baseAmount = baseCfg ? parseFloat(baseCfg.configValue) : 1000;

    const catCfg = await this.systemService.getConfig(MERCHANT_CONFIG_KEYS.DEPOSIT_PER_CATEGORY);
    const perCategory = catCfg ? parseFloat(catCfg.configValue) : 500;

    return baseAmount + (categoryIds.length * perCategory);
  }

  // ─── 保证金缴纳后回调 ───

  async handleDepositPaid(merchantId: string) {
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { depositPaid: true, status: "AGREEMENT_PENDING" },
    });

    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "保证金已到账",
      content: "您的保证金已确认到账，请签署入驻协议以完成开店。",
      targetType: "MERCHANT",
      targetId: merchantId,
    });

    return merchant;
  }

  // ─── 协议签署后回调 ───

  async handleAgreementSigned(merchantId: string, ipAddress?: string) {
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        agreementSigned: true,
        signedAt: new Date(),
        signedIp: ipAddress ?? null,
        status: "ACTIVE",
        openedAt: new Date(),
      },
    });

    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "入驻成功",
      content: "恭喜！您的店铺已成功开通，现在可以开始上架商品了。",
      targetType: "MERCHANT",
      targetId: merchantId,
    });

    await this.systemService.logAudit({
      userId: merchant.userId,
      action: "MERCHANT_ACTIVATED",
      targetType: "Merchant",
      targetId: merchantId,
    });

    return merchant;
  }

  // ─── 管理员操作 ───

  async listMerchants(query: MerchantListQueryDto) {
    const { status, keyword, page = 1, pageSize = 20 } = query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.shopName = { contains: keyword, mode: "insensitive" };

    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async getMerchantById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, phone: true, avatar: true } },
        violations: { orderBy: { createdAt: "desc" }, take: 10 },
        depositRecords: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    return merchant;
  }

  async approveApplication(merchantId: string, reviewerId: string, dto: ApproveMerchantDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.status !== "PENDING_REVIEW") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可审核");

    const updateData: any = {
      status: "DEPOSIT_PENDING",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      remark: dto.remark ?? null,
    };
    if (dto.depositAmount != null) updateData.depositAmount = dto.depositAmount;
    if (dto.commissionRate != null) updateData.commissionRate = dto.commissionRate;

    const updated = await this.prisma.merchant.update({ where: { id: merchantId }, data: updateData });

    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "入驻审核通过",
      content: `您的入驻申请已通过审核${dto.depositAmount != null ? "，保证金金额：" + dto.depositAmount + "元" : ""}。请缴纳保证金以继续。`,
      targetType: "MERCHANT",
      targetId: merchantId,
    });

    await this.systemService.logAudit({
      userId: reviewerId,
      action: "MERCHANT_APPROVED",
      targetType: "Merchant",
      targetId: merchantId,
      detail: JSON.stringify(dto),
    });

    return updated;
  }

  async rejectApplication(merchantId: string, reviewerId: string, reason: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.status !== "PENDING_REVIEW") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可审核");

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: "REVIEW_FAILED", rejectReason: reason, reviewedBy: reviewerId, reviewedAt: new Date() },
    });

    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "入驻审核未通过",
      content: `您的入驻申请未通过审核，原因：${reason}。请修改后重新提交。`,
      targetType: "MERCHANT",
      targetId: merchantId,
    });

    await this.systemService.logAudit({
      userId: reviewerId,
      action: "MERCHANT_REJECTED",
      targetType: "Merchant",
      targetId: merchantId,
      detail: reason,
    });

    return updated;
  }

  async updateMerchantStatus(merchantId: string, operatorId: string, dto: UpdateMerchantStatusDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const updateData: any = { status: dto.status };
    if (dto.status === "CLOSED") updateData.closedAt = new Date();

    const updated = await this.prisma.merchant.update({ where: { id: merchantId }, data: updateData });

    const statusLabels: Record<string, string> = { ACTIVE: "已恢复经营", SUSPENDED: "已暂停经营", CLOSED: "已永久关闭" };
    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "店铺状态变更",
      content: `您的店铺${statusLabels[dto.status] ?? "状态已变更"}${dto.reason ? "，原因：" + dto.reason : ""}。`,
      targetType: "MERCHANT",
      targetId: merchantId,
    });

    await this.systemService.logAudit({
      userId: operatorId,
      action: "MERCHANT_STATUS_CHANGE",
      targetType: "Merchant",
      targetId: merchantId,
      detail: `${merchant.status} → ${dto.status}${dto.reason ? " / " + dto.reason : ""}`,
    });

    return updated;
  }

  // ─── 数据统计 ───

  async getMerchantStats(merchantId: string) {
    const [salesAgg, orderCount, violationCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: { merchantId, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.order.count({ where: { merchantId } }),
      this.prisma.merchantViolation.count({ where: { merchantId } }),
    ]);

    return {
      totalSales: Number(salesAgg._sum.amount ?? 0),
      totalOrders: orderCount,
      violationCount,
    };
  }

  async getDashboard(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todaySales, totalProducts, pendingReviews] = await Promise.all([
      this.prisma.order.count({ where: { merchantId: merchant.id, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { merchantId: merchant.id, createdAt: { gte: today }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.product.count({ where: { userId } }),
      this.prisma.productReview.count({ where: { product: { userId }, reply: null } }),
    ]);

    return {
      todayOrders,
      todaySales: Number(todaySales._sum.amount ?? 0),
      totalProducts,
      pendingReviews,
      totalSales: Number(merchant.totalSales),
      totalOrders: merchant.totalOrders,
      rating: Number(merchant.rating),
    };
  }

  // ─── 店铺信息 ───

  async updateProfile(merchantId: string, dto: UpdateMerchantProfileDto) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.shopName != null ? { shopName: dto.shopName } : {}),
        ...(dto.shopLogo != null ? { shopLogo: dto.shopLogo } : {}),
        ...(dto.shopIntro != null ? { shopIntro: dto.shopIntro } : {}),
      },
    });
  }

  // ─── 商品管理 ───

  async listProducts(userId: string, q: ProductQueryDto) {
    const { page = 1, pageSize = 20, status } = q;
    const where: Record<string, unknown> = { userId, supplierType: "CERTIFIED_MERCHANT" };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async createProduct(userId: string, dto: MerchantProductDto) {
    return this.prisma.product.create({
      data: {
        userId, title: dto.title, intro: dto.intro, detail: dto.detail,
        images: dto.images ?? [], price: dto.price, stock: dto.stock,
        categoryId: dto.categoryId, tags: dto.tags ?? [],
        isPlatform: false, supplierType: "CERTIFIED_MERCHANT", status: "PENDING",
      },
    });
  }

  async getProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return product;
  }

  async updateProduct(userId: string, productId: string, dto: Partial<MerchantProductDto>) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return this.prisma.product.delete({ where: { id: productId } });
  }

  async listProduct(userId: string, productId: string) {
    return this.prisma.product.updateMany({
      where: { id: productId, userId }, data: { status: "ON_SALE" },
    });
  }

  async unlistProduct(userId: string, productId: string) {
    return this.prisma.product.updateMany({
      where: { id: productId, userId }, data: { status: "OFF_SHELF" },
    });
  }

  // ─── 订单管理 ───

  async listOrders(merchantId: string, q: MerchantOrderQueryDto) {
    const { page = 1, pageSize = 20, status } = q;
    const where: Record<string, unknown> = { merchantId };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async getOrder(merchantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    return order;
  }

  async shipOrder(merchantId: string, orderId: string, dto: ShipOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    if (order.status !== "PAID") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前订单状态不可发货");

    await this.prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED", shippedAt: new Date() } });
    await this.prisma.orderLogistics.create({
      data: { orderId, company: dto.company, logisticsNo: dto.trackingNo },
    });
    return { success: true };
  }

  async approveRefund(merchantId: string, orderId: string) {
    return this.prisma.order.updateMany({
      where: { id: orderId, merchantId }, data: { status: "REFUNDED", refundedAt: new Date() },
    });
  }

  async rejectRefund(merchantId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    // 拒绝退款：暂不改变订单状态（OrderStatus枚举无REFUND_REJECTED），先验证订单归属后返回
    return { orderId, status: "REFUND_REJECTED", reason };
  }

  // ─── 评价管理 ───

  async listReviews(userId: string, q: ReviewQueryDto) {
    const { page = 1, pageSize = 20, rating } = q;
    const where: Record<string, unknown> = { product: { userId } };
    if (rating) where.rating = rating;

    const [list, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
        include: { product: { select: { title: true } } },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async replyReview(userId: string, reviewId: string, reply: string) {
    const review = await this.prisma.productReview.findFirst({
      where: { id: reviewId, product: { userId } },
    });
    if (!review) throw new BusinessException(ErrorCode.BAD_REQUEST, "评价不存在");
    return this.prisma.productReview.update({
      where: { id: reviewId }, data: { reply, repliedAt: new Date() },
    });
  }

  // ─── 违规管理（商家端+管理端） ───

  async listViolations(merchantId: string, q: PaginationDto) {
    const { page = 1, pageSize = 20 } = q;
    const [list, total] = await Promise.all([
      this.prisma.merchantViolation.findMany({
        where: { merchantId }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantViolation.count({ where: { merchantId } }),
    ]);
    return { list, total, page, pageSize };
  }

  async appealViolation(merchantId: string, violationId: string, appeal: string) {
    const violation = await this.prisma.merchantViolation.findFirst({
      where: { id: violationId, merchantId },
    });
    if (!violation) throw new BusinessException(ErrorCode.BAD_REQUEST, "违规记录不存在");
    return this.prisma.merchantViolation.update({
      where: { id: violationId }, data: { appeal, appealAt: new Date() },
    });
  }

  // ─── 违规管理（管理端） ───

  async createViolation(merchantId: string, dto: CreateViolationDto, handlerId: string) {
    return this.prisma.merchantViolation.create({
      data: {
        merchantId, type: dto.type as any, title: dto.title,
        description: dto.description, penalty: dto.penalty, evidence: dto.evidence,
        handledBy: handlerId, handledAt: new Date(), status: "CONFIRMED",
      },
    });
  }

  async handleViolation(violationId: string, dto: HandleViolationDto, handlerId: string) {
    return this.prisma.merchantViolation.update({
      where: { id: violationId },
      data: { status: dto.status as any, handledBy: handlerId, handledAt: new Date() },
    });
  }

  // ─── 售后管理 ───

  async listAfterSales(merchantId: string, q?: { type?: string; status?: string; page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = q || {};
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      select: { id: true, amount: true, status: true },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const orderIds = [...orderMap.keys()];
    if (orderIds.length === 0) return { list: [], total: 0, page, pageSize };

    const where: any = { orderId: { in: orderIds } };
    if (q?.type) where.type = q.type;
    if (q?.status) where.status = q.status;

    const [list, total] = await Promise.all([
      this.prisma.afterSale.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.afterSale.count({ where }),
    ]);
    return {
      list: list.map((a) => ({ ...a, order: orderMap.get(a.orderId) })),
      total, page, pageSize,
    };
  }

  async getAfterSale(merchantId: string, afterSaleId: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    if (!record) return null;
    const order = await this.prisma.order.findFirst({ where: { id: record.orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后单不属于您的店铺");
    return record;
  }

  async processAfterSale(merchantId: string, afterSaleId: string, dto: { action: string; remark?: string }) {
    await this.getAfterSale(merchantId, afterSaleId);
    const status = dto.action === "approve" ? "APPROVED" : dto.action === "reject" ? "REJECTED" : dto.action === "complete" ? "COMPLETED" : undefined;
    if (!status) throw new BusinessException(ErrorCode.BAD_REQUEST, "无效操作: " + dto.action);
    return this.prisma.afterSale.update({
      where: { id: afterSaleId },
      data: { status },
    });
  }

  // ─── 客户管理 ───

  async listCustomers(merchantId: string, q?: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = q || {};
    // 查询在该商家下过单的用户，按 userId 聚合
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        u.id, u.nickname, u.avatar, u.phone,
        COUNT(o.id)::int as "orderCount",
        COALESCE(SUM(o."amount"), 0)::decimal as "totalSpent",
        MAX(o."createdAt") as "lastOrderAt"
      FROM "User" u
      JOIN "Order" o ON o."userId" = u.id AND o."merchantId" = $1
      GROUP BY u.id, u.nickname, u.avatar, u.phone
      ORDER BY "totalSpent" DESC
      LIMIT $2 OFFSET $3
    `, merchantId, pageSize, (page - 1) * pageSize);

    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(DISTINCT o."userId")::int as cnt
      FROM "Order" o
      WHERE o."merchantId" = $1
    `, merchantId);

    return { list: result, total: countResult[0]?.cnt || 0, page, pageSize };
  }
}
