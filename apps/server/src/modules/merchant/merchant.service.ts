import { Injectable, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { NotificationService } from "../notification/notification.service";
import { SystemService } from "../system/system.service";
import { AuditService } from "../audit/audit.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import {
  isImmediateRefundType,
  isReturnRefundType,
  stringifyAfterSaleLogistics,
} from "../shop/after-sale-type";
import { MERCHANT_CONFIG_KEYS, MERCHANT_FEATURE_FLAGS } from "./merchant.types";
import { encrypt, decrypt, maskIdCard, maskPhone, phoneHmac } from "../../common/crypto.util";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import {
  CreateMerchantApplyDto, UpdateMerchantApplyDto, ApproveMerchantDto, UpdateMerchantStatusDto,
  MerchantListQueryDto, UpdateMerchantProfileDto, ProductQueryDto, MerchantOrderQueryDto,
  ReviewQueryDto, PaginationDto,
  CreateViolationDto, HandleViolationDto, MerchantProductDto,
} from "./merchant.dto";

@Injectable()
export class MerchantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
    private readonly notification: NotificationService,
    private readonly systemService: SystemService,
    private readonly audit: AuditService,
    // 退款必须走统一退款服务（真实渠道退款/线下降级 + CAS 置 REFUNDED + 冲正分佣）
    @Optional() private readonly shopRefund?: ShopRefundService,
  ) {}

  // ─── 入驻申请 ───

  async createApplication(userId: string, dto: CreateMerchantApplyDto) {
    const existing = await this.prisma.merchant.findUnique({ where: { userId } });
    if (existing) throw new BusinessException(ErrorCode.MERCHANT_ALREADY_EXISTS, "您已提交过入驻申请");

    // 统一内容审核：店铺名 + 店铺简介（三层漏斗，违规抛异常，空串自动跳过）
    await this.audit.moderateTextOrThrow(
      [dto.shopName, dto.shopIntro].filter(Boolean).join(" "),
      { scene: "MERCHANT_APPLICATION", userId },
    );

    return this.prisma.merchant.create({
      data: {
        userId,
        shopName: dto.shopName,
        shopLogo: dto.shopLogo,
        shopIntro: dto.shopIntro,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        // 法人身份证号加密入库（PII，禁止明文落库）
        idCardNumber: dto.idCardNumber ? encrypt(dto.idCardNumber) : dto.idCardNumber,
        idCardFront: dto.idCardFront,
        idCardBack: dto.idCardBack,
        businessLicense: dto.businessLicense,
        brandAuth: dto.brandAuth,
        categoryIds: dto.categoryIds ?? [],
        status: "PENDING_REVIEW",
      },
    });
  }

  /** 出库脱敏：身份证号解密后掩码、联系电话/关联用户手机号掩码，防管理端与本人回显泄露完整 PII。
   *  审核可凭 idCardFront/Back 照片核验，无需明文号码；如确需完整号应走独立的解密+审计接口。 */
  private maskMerchant<T extends Record<string, any>>(m: T): T {
    if (!m) return m;
    return {
      ...m,
      idCardNumber: m.idCardNumber ? maskIdCard(decrypt(m.idCardNumber)) : m.idCardNumber,
      contactPhone: m.contactPhone ? maskPhone(m.contactPhone) : m.contactPhone,
      ...(m.user ? { user: { ...m.user, phone: maskPhone(m.user.phone ?? null) } } : {}),
    };
  }

  async getApplication(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "未找到入驻申请");
    return this.maskMerchant(merchant);
  }

  async updateApplication(userId: string, dto: UpdateMerchantApplyDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "未找到入驻申请");
    if (merchant.status !== "PENDING_REVIEW" && merchant.status !== "REVIEW_FAILED") {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "当前状态不可修改");
    }

    // 统一内容审核：店铺名 + 店铺简介（违规抛异常，空串自动跳过）
    await this.audit.moderateTextOrThrow(
      [dto.shopName, dto.shopIntro].filter(Boolean).join(" "),
      { scene: "MERCHANT_EDIT", userId, dataId: merchant.id },
    );

    // 身份证号若更新则加密入库（其余字段透传）
    const { idCardNumber, ...rest } = dto;
    return this.prisma.merchant.update({
      where: { userId },
      data: {
        ...rest,
        ...(idCardNumber !== undefined ? { idCardNumber: idCardNumber ? encrypt(idCardNumber) : idCardNumber } : {}),
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
    if (!merchant.businessLicense?.trim()) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "请上传营业执照：无有效营业执照无法完成主体核验和商户进件",
      );
    }

    // 当前实行免保证金入驻：自动审核通过后直接进入待签约，不制造待缴费状态。
    const autoApprove = await this.featureFlag.isEnabled(MERCHANT_FEATURE_FLAGS.AUTO_APPROVE);

    return this.prisma.merchant.update({
      where: { userId },
      data: {
        status: autoApprove ? "AGREEMENT_PENDING" : "PENDING_REVIEW",
        ...(autoApprove ? { depositAmount: 0, depositPaid: false } : {}),
        reviewedAt: autoApprove ? new Date() : null,
        rejectReason: null,
      },
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
    const { status, keyword } = query;
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize, NO_PAGE_LIMIT);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.shopName = { contains: keyword, mode: "insensitive" };

    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return { list: list.map((m) => this.maskMerchant(m)), total, page, pageSize };
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
    return this.maskMerchant(merchant);
  }

  // ─── 操作员管理（多操作员·官方旗舰店等；operator 仅鉴权+审计，归属仍记 owner） ───

  /** 列出该商家的成员（店主 + ACTIVE 操作员），手机号脱敏。 */
  async listMembers(merchantId: string, actingUserId?: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { userId: true },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    const members = await this.prisma.merchantMember.findMany({
      where: { merchantId, status: "ACTIVE" },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    // owner 兜底：即使未在 MerchantMember 里落一条 OWNER，也在列表里体现店主身份
    const ids = new Set(members.map((m) => m.userId));
    ids.add(merchant.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, nickname: true, avatar: true, phone: true },
    });
    const uMap = new Map(users.map((u) => [u.id, u]));
    const rowOf = (userId: string, role: string, status: string, createdAt: Date | null) => {
      const u = uMap.get(userId);
      return {
        userId,
        isCurrent: userId === actingUserId,
        nickname: u?.nickname ?? "",
        avatar: u?.avatar ?? "",
        phone: u?.phone ? maskPhone(u.phone) : "",
        role,
        status,
        createdAt,
      };
    };
    const rows = members.map((m) => rowOf(m.userId, m.role, m.status, m.createdAt));
    if (!rows.some((r) => r.userId === merchant.userId)) {
      rows.unshift(rowOf(merchant.userId, "OWNER", "ACTIVE", null));
    }
    return rows;
  }

  private describeMerchantAudit(action: string, detail: string | null): string {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(action)) return action;
    const requestLine = detail?.includes(" | ") ? detail.split(" | ", 2)[1] : detail || "";
    const rules: Array<[RegExp, string]> = [
      [/POST .*\/products\/[^/]+\/skus$/, "添加商品规格"],
      [/DELETE .*\/skus\/[^/]+$/, "删除商品规格"],
      [/POST .*\/products\/[^/]+\/list$/, "商品上架"],
      [/POST .*\/products\/[^/]+\/unlist$/, "商品下架"],
      [/DELETE .*\/products\/[^/]+$/, "删除商品"],
      [/POST .*\/products$/, "发布商品"],
      [/POST .*\/orders\/batch-ship$/, "批量发货"],
      [/PUT .*\/orders\/[^/]+\/ship$/, "订单发货"],
      [/PUT .*\/orders\/[^/]+\/shipment$/, "修改物流单号"],
      [/POST .*\/orders\/[^/]+\/refund\/approve$/, "同意退款"],
      [/POST .*\/orders\/[^/]+\/refund\/reject$/, "拒绝退款"],
      [/POST .*\/reviews\/[^/]+\/reply$/, "回复评价"],
      [/POST .*\/violations\/[^/]+\/appeal$/, "提交违规申诉"],
      [/PUT .*\/after-sales\/[^/]+\/process$/, "处理售后"],
      [/POST .*\/after-sales\/[^/]+\/return-inspection$/, "退货验收入库"],
      [/POST .*\/inventory\/adjustments$/, "调整库存"],
      [/PUT .*\/inventory\/alerts$/, "设置库存预警"],
      [/POST .*\/purchase-orders\/[^/]+\/submit$/, "确认采购下单"],
      [/POST .*\/purchase-orders\/[^/]+\/receive$/, "采购到货入库"],
      [/POST .*\/purchase-orders\/[^/]+\/cancel$/, "取消采购单"],
      [/POST .*\/purchase-orders$/, "新建采购单"],
      [/PUT .*\/profile$/, "更新店铺资料"],
      [/POST .*\/members$/, "添加操作员"],
      [/DELETE .*\/members\/[^/]+$/, "移除操作员"],
    ];
    return rules.find(([pattern]) => pattern.test(requestLine))?.[1]
      ?? ({ POST: "新增记录", PUT: "更新记录", PATCH: "更新记录", DELETE: "删除记录" }[action] || action);
  }

  private describeMerchantAuditTarget(targetType: string | null): string | null {
    if (!targetType || targetType === "unknown") return null;
    return ({
      MERCHANT: "店铺",
      PRODUCT: "商品",
      ORDER: "订单",
      AFTER_SALE: "售后",
      PURCHASE_ORDER: "采购单",
    } as Record<string, string>)[targetType] || null;
  }

  /** 本店操作审计：账号集合命中 userId 索引，merchant 前缀二次隔离，避免跨店串线。 */
  async listMemberAudit(merchantId: string, q: PaginationDto) {
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize);
    const [merchant, memberships] = await Promise.all([
      this.prisma.merchant.findUnique({ where: { id: merchantId }, select: { userId: true } }),
      this.prisma.merchantMember.findMany({ where: { merchantId }, select: { userId: true } }),
    ]);
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    const actorIds = [...new Set([merchant.userId, ...memberships.map((member) => member.userId)])];
    const marker = `merchant:${merchantId} | `;
    const where = {
      userId: { in: actorIds },
      detail: { startsWith: marker },
    };
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.auditLog.count({ where }),
    ]);
    const userIds = [...new Set(logs.map((log) => log.userId).filter((id): id is string => Boolean(id)))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true },
        })
      : [];
    const names = new Map(users.map((user) => [user.id, user.nickname || "平台用户"]));
    return {
      items: logs.map((log) => ({
        id: log.id,
        memberId: log.userId || "SYSTEM",
        operatorName: log.userId ? names.get(log.userId) || "已注销账号" : "系统",
        action: this.describeMerchantAudit(log.action, log.detail),
        target: this.describeMerchantAuditTarget(log.targetType),
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 按手机号添加操作员（幂等）。手机号以 phoneHash 查用户。 */
  async addMemberByPhone(merchantId: string, phone: string, invitedBy: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, userId: true },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    const user = await this.prisma.user.findFirst({
      where: { phoneHash: phoneHmac(phone) },
      select: { id: true, nickname: true },
    });
    if (!user) throw new BusinessException(ErrorCode.BAD_REQUEST, "该手机号未注册平台，请对方先登录一次");
    if (user.id === merchant.userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户是店主，无需添加为操作员");
    await this.prisma.merchantMember.upsert({
      where: { merchantId_userId: { merchantId, userId: user.id } },
      create: { merchantId, userId: user.id, role: "OPERATOR", status: "ACTIVE", invitedBy },
      update: { status: "ACTIVE", role: "OPERATOR" },
    });
    return { success: true, userId: user.id, nickname: user.nickname ?? "" };
  }

  /** 移除操作员（软删 status=REMOVED）。不可移除店主。 */
  async removeMember(merchantId: string, userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { userId: true },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.userId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能移除店主");
    await this.prisma.merchantMember.updateMany({
      where: { merchantId, userId }, data: { status: "REMOVED" },
    });
    return { success: true };
  }

  async approveApplication(merchantId: string, reviewerId: string, dto: ApproveMerchantDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.status !== "PENDING_REVIEW") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可审核");

    if (dto.depositAmount != null && dto.depositAmount > 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "当前实行免保证金入驻，不可设置保证金金额");
    }

    const updateData: any = {
      status: "AGREEMENT_PENDING",
      depositAmount: 0,
      depositPaid: false,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      remark: dto.remark ?? null,
    };
    if (dto.commissionRate != null) updateData.commissionRate = dto.commissionRate;

    const updated = await this.prisma.merchant.update({ where: { id: merchantId }, data: updateData });

    await this.notification.send(merchant.userId, {
      type: "SYSTEM",
      title: "入驻审核通过",
      content: "您的入驻申请已通过审核，当前免缴保证金。请签署入驻协议以完成开店。",
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

    const [todayOrders, todaySales, totalProducts, pendingReviews, cumSalesAgg, cumOrderCount, ratingAgg] = await Promise.all([
      this.prisma.order.count({ where: { merchantId: merchant.id, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { merchantId: merchant.id, createdAt: { gte: today }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.product.count({ where: { userId } }),
      this.prisma.productReview.count({ where: { product: { userId }, reply: null } }),
      // 累计口径实时聚合（去规范化字段 merchant.totalSales/totalOrders/rating 全库无 writer·恒为种子值→改实时算）
      this.prisma.order.aggregate({
        where: { merchantId: merchant.id, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.order.count({ where: { merchantId: merchant.id } }),
      this.prisma.productReview.aggregate({ where: { product: { userId } }, _avg: { rating: true }, _count: true }),
    ]);

    return {
      todayOrders,
      todaySales: Number(todaySales._sum.amount ?? 0),
      totalProducts,
      pendingReviews,
      totalSales: Number(cumSalesAgg._sum.amount ?? 0),
      totalOrders: cumOrderCount,
      // 有评价→真实均分(1位小数)·无评价→保持 5.0 默认(不破坏前端·避免误伤新店显示0分)
      rating: ratingAgg._count > 0 && ratingAgg._avg.rating != null ? Math.round(Number(ratingAgg._avg.rating) * 10) / 10 : 5.0,
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
    const { status } = q;
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize, NO_PAGE_LIMIT);
    const where: Record<string, unknown> = { userId, supplierType: "CERTIFIED_MERCHANT" };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /** 该 owner 是否为官方旗舰店（ConfigSystem.official_merchant_id）。官方店发商品免审自动上架。 */
  private async isOfficialMerchant(userId: string): Promise<boolean> {
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "official_merchant_id" } });
    if (!cfg?.configValue) return false;
    const m = await this.prisma.merchant.findUnique({ where: { userId }, select: { id: true } });
    return !!m && m.id === cfg.configValue;
  }

  async createProduct(userId: string, dto: MerchantProductDto) {
    const official = await this.isOfficialMerchant(userId);
    return this.prisma.product.create({
      data: {
        userId, title: dto.title, intro: dto.intro, detail: dto.detail,
        images: dto.images ?? [], price: dto.price, originalPrice: dto.originalPrice, stock: dto.stock,
        categoryId: dto.categoryId, tags: dto.tags ?? [],
        isPlatform: false, supplierType: "CERTIFIED_MERCHANT",
        // 官方旗舰店免审自动上架；普通商家仍走 PENDING 审核（标准不变）
        status: official ? "ON_SALE" : "PENDING",
      },
    });
  }

  async getProduct(userId: string, productId: string) {
    // include skus：编辑态需回填多规格矩阵（B3 商品编辑器）
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      include: { skus: { orderBy: { createdAt: "asc" } } },
    });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return product;
  }

  async updateProduct(userId: string, productId: string, dto: Partial<MerchantProductDto>) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  /** 店铺身份加 SKU（操作员经 merchant.guard 归一到 owner·与 shop.addSku 同校验逻辑） */
  async addProductSku(userId: string, productId: string, dto: { name?: string; specs?: Record<string, string>; price: number; stock?: number }) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    let specs = dto.specs || {};
    if (!dto.specs && dto.name) {
      const parts = dto.name.split(":");
      specs = parts.length >= 2 ? { [parts[0].trim()]: parts.slice(1).join(":").trim() } : { name: dto.name };
    }
    return this.prisma.productSku.create({
      data: { productId, specs, price: dto.price, stock: dto.stock ?? 0 },
    });
  }

  /** 店铺身份删 SKU */
  async deleteProductSku(userId: string, skuId: string) {
    const sku = await this.prisma.productSku.findUnique({ where: { id: skuId }, include: { product: { select: { userId: true } } } });
    if (!sku || sku.product.userId !== userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "SKU不存在或无权操作");
    await this.prisma.productSku.delete({ where: { id: skuId } });
    return { success: true };
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    return this.prisma.product.delete({ where: { id: productId } });
  }

  async listProduct(userId: string, productId: string) {
    // 🔴 上架前置状态校验：只有「已下架(OFF_SHELF)」的商品可自助重新上架。
    //    PENDING(待审核)商品若允许自助上架 = 商家绕过平台审核直接售卖，属审核旁路漏洞。
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId }, select: { id: true, status: true } });
    if (!product) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在");
    if (product.status === "ON_SALE") return { count: 0, message: "商品已在售" };
    if (product.status !== "OFF_SHELF") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "商品尚未通过平台审核，暂不能上架");
    }
    // where 带 status 条件 = CAS，防并发下 PENDING 被套进来
    return this.prisma.product.updateMany({
      where: { id: productId, userId, status: "OFF_SHELF" }, data: { status: "ON_SALE" },
    });
  }

  async unlistProduct(userId: string, productId: string) {
    return this.prisma.product.updateMany({
      where: { id: productId, userId }, data: { status: "OFF_SHELF" },
    });
  }

  // ─── 订单管理 ───

  async listOrders(merchantId: string, q: MerchantOrderQueryDto) {
    const { status } = q;
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize, NO_PAGE_LIMIT);
    const where: Record<string, unknown> = { merchantId };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { list: await this.enrichOrders(list), total, page, pageSize };
  }

  /**
   * 订单补全：商品标题/首图（targetId→Product）+ 买家脱敏昵称/手机号（userId→User）。
   * 白标贺卡（供-P2）：订单行自带 giftCardMeta（{fromName,blessing,qrRef}·发货时打印随包裹放入），
   * 此处补 hasGiftCard 布尔位供列表视图轻量露出贺卡任务标记。
   */
  private async enrichOrders<T extends { targetId: string; userId: string }>(orders: T[]) {
    if (orders.length === 0) return orders;
    const productIds = [...new Set(orders.map((o) => o.targetId))];
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const [products, users] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, images: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, phone: true } }),
    ]);
    const pm = new Map(products.map((p) => [p.id, p]));
    const um = new Map(users.map((u) => [u.id, u]));
    return orders.map((o) => {
      const prod = pm.get(o.targetId);
      const usr = um.get(o.userId);
      return {
        ...o,
        productTitle: prod?.title ?? "商品",
        productImage: prod?.images?.[0] ?? null,
        buyerNickname: usr?.nickname ?? "用户",
        buyerPhone: usr?.phone ? maskPhone(usr.phone) : null,
        hasGiftCard: Boolean((o as { giftCardMeta?: unknown }).giftCardMeta), // 白标贺卡任务标记（供-P2）
        // 收货地址快照显式透传（Order.shippingInfo Json·下单时落库），供商家端发货视图直接读；Order 无 orderNo 列，前端以 id 为单号
        shippingInfo: (o as { shippingInfo?: unknown }).shippingInfo ?? null,
      };
    });
  }

  async getOrder(merchantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    const [[enriched], logistics] = await Promise.all([
      this.enrichOrders([order]),
      this.prisma.orderLogistics.findUnique({ where: { orderId } }),
    ]);
    return { ...enriched, logistics: logistics || null };
  }

  async approveRefund(merchantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    if (order.status === "REFUNDED") throw new BusinessException(ErrorCode.BAD_REQUEST, "订单已退款");
    // 🔴 绝不能只把状态改成 REFUNDED：那样买家的钱不会退、已发的分佣不冲正，
    //    还会把订单锁死在终态、令正规退款路径(refundOrder)因 status!==REFUNDED 永久失效。
    //    必须委托统一退款服务：真实渠道退款（未配置则降级线下打款）+ CAS 置 REFUNDED + 冲正分佣 + webhook。
    if (!this.shopRefund) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款服务暂不可用，请稍后重试");
    }
    const result = await this.shopRefund.refundOrder(orderId, "商家同意退款");
    return { success: true, refundStatus: result.status };
  }

  async rejectRefund(merchantId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantId } });
    if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单不存在");
    if (order.status === "REFUNDED") throw new BusinessException(ErrorCode.BAD_REQUEST, "订单已退款，无法拒绝");
    // 真实语义：把该订单待处理的退款类售后单置为 REJECTED 并落拒绝理由。
    // 原实现只回显 {status:"REFUND_REJECTED"} 不落库 = 假操作：买家侧售后单永远 PENDING，理由被丢弃。
    const afterSale = await this.prisma.afterSale.findFirst({
      where: { orderId, status: "PENDING", type: { contains: "refund", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    if (!afterSale) throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单没有待处理的退款申请");
    // CAS：仅当仍为 PENDING 时置 REJECTED，防与管理端处理并发互踩
    const res = await this.prisma.afterSale.updateMany({
      where: { id: afterSale.id, status: "PENDING" },
      // AfterSale 无专用备注字段，拒绝理由与 shop 版 processAfterSale 同口径落 logistics（shop-coupon.service.ts 范式）
      data: { status: "REJECTED", logistics: `商家拒绝退款：${reason}` },
    });
    if (res.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后单状态已变更，请刷新后重试");
    return { orderId, afterSaleId: afterSale.id, status: "REJECTED", reason };
  }

  // ─── 评价管理 ───

  async listReviews(userId: string, q: ReviewQueryDto) {
    const { rating } = q;
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize, NO_PAGE_LIMIT);
    const where: Record<string, unknown> = { product: { userId } };
    if (rating) where.rating = rating;

    const [list, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: "desc" },
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
    const { page, pageSize, skip } = safePagination(q.page, q.pageSize, NO_PAGE_LIMIT);
    const [list, total] = await Promise.all([
      this.prisma.merchantViolation.findMany({
        where: { merchantId }, skip, take: pageSize, orderBy: { createdAt: "desc" },
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
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    return this.prisma.merchantViolation.create({
      data: {
        merchantId, type: dto.type as any, title: dto.title,
        description: dto.description, penalty: dto.penalty, evidence: dto.evidence,
        handledBy: handlerId, handledAt: new Date(), status: "CONFIRMED",
      },
    });
  }

  async handleViolation(violationId: string, dto: HandleViolationDto, handlerId: string) {
    const violation = await this.prisma.merchantViolation.findUnique({ where: { id: violationId } });
    if (!violation) throw new BusinessException(ErrorCode.NOT_FOUND, "违规记录不存在");
    return this.prisma.merchantViolation.update({
      where: { id: violationId },
      data: { status: dto.status as any, handledBy: handlerId, handledAt: new Date() },
    });
  }

  // ─── 售后管理 ───

  async listAfterSales(merchantId: string, q?: { type?: string; status?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(q?.page, q?.pageSize, NO_PAGE_LIMIT);
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      select: { id: true, targetId: true, amount: true, status: true },
    });
    const productIds = [...new Set(orders.map((o) => o.targetId))];
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, images: true } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderMap = new Map(orders.map((o) => {
      const product = productMap.get(o.targetId);
      return [o.id, {
        id: o.id,
        amount: o.amount,
        status: o.status,
        productTitle: product?.title ?? "订单商品",
        productImage: product?.images?.[0] ?? null,
      }];
    }));
    const orderIds = [...orderMap.keys()];
    if (orderIds.length === 0) return { list: [], total: 0, page, pageSize };

    const where: any = { orderId: { in: orderIds } };
    if (q?.type) where.type = q.type;
    if (q?.status) where.status = q.status;

    const [list, total] = await Promise.all([
      this.prisma.afterSale.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: "desc" },
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

  /**
   * 商家售后状态机与平台端同口径。退货退款审核只下发退货地址，
   * 必须经 return-inspection 验收入库后才允许真实退款。
   */
  async processAfterSale(merchantId: string, afterSaleId: string, dto: { action: string; remark?: string }) {
    const record = await this.getAfterSale(merchantId, afterSaleId);
    if (!record) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后单不存在");

    if (dto.action === "complete") {
      if (isReturnRefundType(record.type)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "退货退款请使用退货验收操作，验收入库后系统自动退款");
      }
      if (isImmediateRefundType(record.type)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "仅退款在审核通过时已自动完成退款");
      }
      const changed = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "APPROVED" },
        data: { status: "COMPLETED", ...(dto.remark?.trim() ? { logistics: dto.remark.trim() } : {}) },
      });
      if (changed.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已同意的售后可确认完成，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    }

    if (record.status !== "PENDING") {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        record.status === "PROCESSING" ? "售后正在处理中，请勿重复操作" : "售后状态已变更，请刷新后重试",
      );
    }

    if (dto.action === "reject") {
      const changed = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PENDING" },
        data: { status: "REJECTED", ...(dto.remark?.trim() ? { logistics: dto.remark.trim() } : {}) },
      });
      if (changed.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变更，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    }

    if (dto.action !== "approve") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效操作: " + dto.action);
    }

    if (isReturnRefundType(record.type)) {
      const returnAddress = dto.remark?.trim();
      if (!returnAddress) throw new BusinessException(ErrorCode.BAD_REQUEST, "同意退货退款时必须填写退货地址");
      const changed = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PENDING" },
        data: { status: "APPROVED", logistics: stringifyAfterSaleLogistics({ returnAddress }) },
      });
      if (changed.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变更，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    }

    if (!isImmediateRefundType(record.type)) {
      const changed = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PENDING" },
        data: { status: "APPROVED", ...(dto.remark?.trim() ? { logistics: dto.remark.trim() } : {}) },
      });
      if (changed.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变更，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    }

    // 仅退款先以 CAS 抢占 PROCESSING，拒绝/重复点击无法与真实退款并发互踩。
    const reserved = await this.prisma.afterSale.updateMany({
      where: { id: afterSaleId, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (reserved.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变更，请刷新后重试");

    try {
      const order = await this.prisma.order.findFirst({ where: { id: record.orderId, merchantId } });
      if (!order) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后关联订单不存在，无法退款");
      if (order.status !== "REFUNDED") {
        if (!this.shopRefund) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款服务暂不可用，请稍后重试");
        const refundResult = await this.shopRefund.refundOrder(record.orderId, record.reason || "商家同意售后退款");
        if (refundResult.status === "PROCESSING") {
          return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
        }
      }
      const finalized = await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PROCESSING" },
        data: { status: "COMPLETED" },
      });
      if (finalized.count === 0) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款已完成，但售后状态同步失败");
      return this.prisma.afterSale.findUnique({ where: { id: afterSaleId } });
    } catch (error) {
      const latestOrder = await this.prisma.order.findFirst({
        where: { id: record.orderId, merchantId },
        select: { status: true },
      });
      if (latestOrder?.status === "REFUNDED") {
        return this.prisma.afterSale.update({ where: { id: afterSaleId }, data: { status: "COMPLETED" } });
      }
      await this.prisma.afterSale.updateMany({
        where: { id: afterSaleId, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
      throw error;
    }
  }
  // ─── 客户管理 ───

  async listCustomers(merchantId: string, q?: { page?: number; pageSize?: number; keyword?: string }) {
    const { page, pageSize, skip } = safePagination(q?.page, q?.pageSize, NO_PAGE_LIMIT);
    const keyword = q?.keyword?.trim();
    // keyword 过滤：昵称模糊匹配（参数化占位符防注入）；整串是 11 位手机号时另走 phoneHmac 精确匹配
    // （手机号已 HMAC 哈希化，无法模糊搜，只能整号等值命中 phoneHash；明文列仍在则同时 OR 等值兜底）
    let keywordCond = "";
    const params: unknown[] = [merchantId, pageSize, skip];
    if (keyword) {
      if (/^1\d{10}$/.test(keyword)) {
        keywordCond = `AND (u."phoneHash" = $4 OR u.phone = $5)`;
        params.push(phoneHmac(keyword), keyword);
      } else {
        keywordCond = `AND u.nickname ILIKE $4`;
        params.push(`%${keyword}%`);
      }
    }
    // 查询在该商家下过单的用户，按 userId 聚合
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        u.id, u.nickname, u.avatar, u.phone, u."createdAt",
        COUNT(o.id)::int as "orderCount",
        COALESCE(SUM(o."amount"), 0)::decimal as "totalSpent",
        MAX(o."createdAt") as "lastOrderAt"
      FROM "User" u
      JOIN "Order" o ON o."userId" = u.id AND o."merchantId" = $1
      WHERE 1=1 ${keywordCond}
      GROUP BY u.id, u.nickname, u.avatar, u.phone, u."createdAt"
      ORDER BY "totalSpent" DESC
      LIMIT $2 OFFSET $3
    `, ...params);

    // 计数与列表同 keyword 口径（占位符序号重排：count 语句只有 merchantId + keyword 参数）
    const countParams: unknown[] = [merchantId];
    let countCond = "";
    if (keyword) {
      if (/^1\d{10}$/.test(keyword)) {
        countCond = `AND (u."phoneHash" = $2 OR u.phone = $3)`;
        countParams.push(phoneHmac(keyword), keyword);
      } else {
        countCond = `AND u.nickname ILIKE $2`;
        countParams.push(`%${keyword}%`);
      }
    }
    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(DISTINCT o."userId")::int as cnt
      FROM "Order" o
      JOIN "User" u ON u.id = o."userId"
      WHERE o."merchantId" = $1 ${countCond}
    `, ...countParams);

    // PII 脱敏：商家(非平台管理员)不应看到客户完整手机号，与 enrichOrders 的 buyerPhone 一致
    const masked = result.map((r) => ({ ...r, phone: r.phone ? maskPhone(r.phone) : null }));
    return { list: masked, total: countResult[0]?.cnt || 0, page, pageSize };
  }

  /** 平台通知 — 返回活跃站点公告 */
  async getNotices(_userId: string) {
    const notices = await this.prisma.siteNotice.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type.toLowerCase(),
      category: n.type,
      time: n.createdAt.toISOString().slice(0, 16).replace("T", " "),
      read: false,
    }));
  }

  /**
   * 旧版客户咨询兼容端点。平台尚未建立咨询模型，必须返回诚实空集；
   * 绝不能把 AfterSale 伪装成咨询，否则字段错位且会隐藏真实待售后入口。
   */
  async listInquiries(_merchantId: string, paging: { page: number; pageSize: number }) {
    const { page, pageSize } = safePagination(paging.page, paging.pageSize, NO_PAGE_LIMIT);
    return { items: [], total: 0, page, pageSize };
  }
  /** 内容统计 — 商品/文章数量聚合 */
  async getContentStats(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId }, select: { userId: true } });
    const userId = merchant?.userId;

    const [productCount, publishedCount] = userId ? await Promise.all([
      this.prisma.product.count({ where: { userId, deletedAt: null } }),
      this.prisma.product.count({ where: { userId, status: "ON_SALE", deletedAt: null } }),
    ]) : [0, 0];

    return {
      totalProducts: productCount,
      publishedProducts: publishedCount,
      draftProducts: productCount - publishedCount,
      publishedArticles: 0,
      totalViews: 0,
      totalLikes: 0,
    };
  }
}
