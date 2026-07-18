import {
  Injectable, Logger,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { ShopService } from "../shop/shop.service";
import { ShopCouponService } from "../shop/shop-coupon.service";
import { Prisma } from "@prisma/client";
import { Cacheable } from "../../common/cache.decorator";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import {
  CreateFlashSaleDto, UpdateFlashSaleDto, FlashSaleFilterDto,
  CreateFlashSaleItemDto, UpdateFlashSaleItemDto,
  CreateGroupBuyDto, UpdateGroupBuyDto, GroupBuyFilterDto,
  CreateCouponTemplateDto, UpdateCouponTemplateDto, CouponFilterDto,
  GrantCouponDto, BatchGrantCouponDto, CouponRecordFilterDto, MyCouponFilterDto,
  CreateDiscountDto, UpdateDiscountDto, DiscountFilterDto,
  CreateMarketingPageDto, UpdateMarketingPageDto,
  CreatePageComponentDto, UpdatePageComponentDto, SortComponentsDto,
  CreateActivityDto, UpdateActivityDto, ActivityFilterDto,
  CreateFullReductionDto, UpdateFullReductionDto,
} from "./marketing.dto";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private shop: ShopService,
    private shopCoupon: ShopCouponService,
  ) {}

  // ═══════════════════════════════════════
  // 秒杀管理
  // ═══════════════════════════════════════

  async createFlashSale(dto: CreateFlashSaleDto) {
    if (!dto.startTime || !dto.endTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写活动开始和结束时间");
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀开始时间必须早于结束时间");

    const flashSale = await this.prisma.flashSale.create({
      data: {
        name: dto.name,
        startTime: start,
        endTime: end,
        warmupMinutes: dto.warmupMinutes ?? 0,
        scope: dto.scope ?? "GLOBAL",
        scopePageId: dto.scopePageId,
      },
    });

    // 如果传了商品信息，同时创建秒杀项
    if (dto.productId && dto.flashPrice != null) {
      await this.prisma.flashSaleItem.create({
        data: {
          flashSaleId: flashSale.id,
          productId: dto.productId,
          flashPrice: dto.flashPrice,
          limitCount: dto.limitPerUser ?? 1,
          stock: 999,
        },
      });
    }

    return this.prisma.flashSale.findUnique({
      where: { id: flashSale.id },
      include: { items: true },
    });
  }

  async listFlashSales(dto: FlashSaleFilterDto) {
    const { status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.FlashSaleWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.flashSale.findMany({
        where,
        include: { items: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.flashSale.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateFlashSale(id: string, dto: UpdateFlashSaleDto) {
    const existing = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);

    const data: Prisma.FlashSaleUpdateInput = {};
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.warmupMinutes !== undefined) data.warmupMinutes = dto.warmupMinutes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.scopePageId !== undefined) data.scopePageId = dto.scopePageId;

    // 如果同时修改了起止时间，校验
    const start = data.startTime ?? existing.startTime;
    const end = data.endTime ?? existing.endTime;
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀开始时间必须早于结束时间");

    return this.prisma.flashSale.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  async deleteFlashSale(id: string) {
    const existing = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);

    await this.prisma.flashSale.delete({ where: { id } });
    this.logger.log(`秒杀活动已删除: ${id}`);
    return { success: true };
  }

  async addFlashSaleItem(id: string, dto: CreateFlashSaleItemDto) {
    const flashSale = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!flashSale) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);

    return this.prisma.flashSaleItem.create({
      data: {
        flashSaleId: id,
        productId: dto.productId,
        skuId: dto.skuId,
        flashPrice: dto.flashPrice,
        limitCount: dto.limitCount ?? 1,
        stock: dto.stock,
        sold: 0,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateFlashSaleItem(id: string, itemId: string, dto: UpdateFlashSaleItemDto) {
    const item = await this.prisma.flashSaleItem.findFirst({
      where: { id: itemId, flashSaleId: id },
    });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀商品不存在");

    return this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: dto as Prisma.FlashSaleItemUpdateInput,
    });
  }

  async deleteFlashSaleItem(id: string, itemId: string) {
    const item = await this.prisma.flashSaleItem.findFirst({
      where: { id: itemId, flashSaleId: id },
    });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀商品不存在");

    await this.prisma.flashSaleItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async startFlashSale(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({ where: { id }, include: { items: true } });
    if (!flashSale) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);

    if (flashSale.items.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀活动没有商品，无法启动");
    }

    return this.prisma.flashSale.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { items: true },
    });
  }

  async endFlashSale(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!flashSale) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);

    return this.prisma.flashSale.update({
      where: { id },
      data: { status: "ENDED" },
      include: { items: true },
    });
  }

  // ═══════════════════════════════════════
  // 拼团管理
  // ═══════════════════════════════════════

  async createGroupBuy(dto: CreateGroupBuyDto) {
    return this.prisma.groupBuy.create({
      data: {
        productId: dto.productId,
        skuId: dto.skuId,
        groupPrice: dto.groupPrice,
        minMembers: dto.minMembers ?? 2,
        expireMinutes: dto.expireMinutes ?? 1440,
        autoComplete: dto.autoComplete ?? false,
        scope: dto.scope ?? "GLOBAL",
        scopePageId: dto.scopePageId,
      },
    });
  }

  async listGroupBuys(dto: GroupBuyFilterDto) {
    const { status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.GroupBuyWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.groupBuy.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.groupBuy.count({ where }),
    ]);

    // GroupBuy 无 name 列，活动展示名=关联商品标题。批量 join Product 补 productTitle
    // 别名字段（GroupBuy 与 Product 无 Prisma relation，只能按 productId 批量查）。
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleMap = new Map(products.map(p => [p.id, p.title]));
    const enriched = items.map(i => ({ ...i, productTitle: titleMap.get(i.productId) ?? null }));

    return { items: enriched, total, page, pageSize };
  }

  async updateGroupBuy(id: string, dto: UpdateGroupBuyDto) {
    const existing = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);

    return this.prisma.groupBuy.update({
      where: { id },
      data: dto as Prisma.GroupBuyUpdateInput,
    });
  }

  async deleteGroupBuy(id: string) {
    const existing = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);
    await this.prisma.groupBuy.delete({ where: { id } });
    this.logger.log(`拼团活动已删除: ${id}`);
    return { success: true };
  }

  async getGroupBuyParticipants(id: string) {
    const groupBuy = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!groupBuy) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);

    return this.prisma.groupBuyParticipant.findMany({
      where: { groupBuyId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 拼团详情（用户端公开）：拼团活动 + 商品信息 + 进行中的团（按 groupId 聚合，含成员昵称/头像）。
   * 供 C 端拼团详情页渲染；participants 端点是管理员专属，此方法对用户公开且补全展示字段。
   */
  async getGroupBuyDetailPublic(id: string) {
    const gb = await this.prisma.groupBuy.findUnique({
      where: { id },
      include: { _count: { select: { participants: true } } },
    });
    if (!gb) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);

    const product = await this.prisma.product.findUnique({
      where: { id: gb.productId },
      select: { id: true, title: true, images: true, price: true, originalPrice: true, intro: true },
    });

    // 进行中的团（WAITING 状态），按 groupId 聚合，补成员 user 信息
    const participants = await this.prisma.groupBuyParticipant.findMany({
      where: { groupBuyId: id, status: "WAITING" },
      orderBy: { createdAt: "asc" },
    });
    const userIds = [...new Set(participants.map(p => p.userId))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatar: true } })
      : [];
    const uMap = new Map(users.map(u => [u.id, u]));

    const groupMap = new Map<string, any[]>();
    for (const pt of participants) {
      const arr = groupMap.get(pt.groupId) || [];
      const u = uMap.get(pt.userId);
      arr.push({ userId: pt.userId, isLeader: pt.isLeader, nickname: u?.nickname || "团员", avatar: u?.avatar || null, joinedAt: pt.createdAt });
      groupMap.set(pt.groupId, arr);
    }
    const groups = [...groupMap.entries()].map(([groupId, members]) => ({
      groupId,
      members,
      currentMembers: members.length,
      minMembers: gb.minMembers,
    }));

    return {
      ...gb,
      joinedCount: gb._count.participants,
      product: product
        ? {
            id: product.id, title: product.title, image: product.images?.[0] || null,
            price: Number(product.price), originalPrice: Number(product.originalPrice ?? product.price),
            intro: product.intro || null,
          }
        : null,
      groups,
    };
  }

  // ═══════════════════════════════════════
  // 优惠券管理
  // ═══════════════════════════════════════

  async createCouponTemplate(dto: CreateCouponTemplateDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "领取开始时间必须早于结束时间");

    return this.prisma.couponTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        faceValue: dto.faceValue,
        threshold: dto.threshold,
        totalCount: dto.totalCount ?? 0,
        startTime: start,
        endTime: end,
        validDays: dto.validDays ?? 7,
        applicableScope: dto.applicableScope ?? Prisma.DbNull,
        aiPrecision: dto.aiPrecision ?? false,
        scope: dto.scope ?? "GLOBAL",
        scopePageId: dto.scopePageId,
      },
    });
  }

  async listCouponTemplates(dto: CouponFilterDto) {
    const { status, type } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.CouponTemplateWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.couponTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.couponTemplate.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateCouponTemplate(id: string, dto: UpdateCouponTemplateDto) {
    const existing = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    const data: Prisma.CouponTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.faceValue !== undefined) data.faceValue = dto.faceValue;
    if (dto.threshold !== undefined) data.threshold = dto.threshold;
    if (dto.totalCount !== undefined) data.totalCount = dto.totalCount;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.validDays !== undefined) data.validDays = dto.validDays;
    if (dto.applicableScope !== undefined) data.applicableScope = dto.applicableScope as any;
    if (dto.aiPrecision !== undefined) data.aiPrecision = dto.aiPrecision;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.scopePageId !== undefined) data.scopePageId = dto.scopePageId;

    return this.prisma.couponTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteCouponTemplate(id: string) {
    const existing = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");
    await this.prisma.couponTemplate.delete({ where: { id } });
    this.logger.log(`优惠券模板已删除: ${id}`);
    return { success: true };
  }

  /**
   * 发放优惠券给指定用户（券体系已统一到「商城优惠券」Coupon/UserCoupon）。
   *
   * 背景（转化失血命门·2026-07-18）：营销 CouponTemplate/CouponRecord 体系发放的券**无任何下单核销路径**
   * （全库无地方把 CouponRecord.status 改 USED，结算只读 UserCoupon）——营销发的券、churn 召回券用户全用不了、核销率结构性恒 0。
   * 该体系已归档只读（admin「优惠券模板」页停止新建与发放）。故此处 `id` 现指「商城优惠券」(Coupon) id，
   * 发放即建 UserCoupon → 在商城结算 shop-order.applyCouponPricing/updateMany 真核销抵扣（含单用 CAS 防重复核销）。
   *
   * 幂等：已持有该券未使用记录则跳过重复发放，避免召回重复触发累积废券（并防同一用户被多次发同一券）。
   * churn COUPON 动作 couponId 需为「商城优惠券」id；若传旧模板 id → 券不存在，抛错由 churn 标 FAILED（诚实失败胜过静默废券）。
   */
  async grantCoupon(id: string, dto: GrantCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券不存在（券体系已统一，请使用「商城优惠券」ID 发放）");
    if (coupon.status !== "ACTIVE") throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已失效，无法发放");
    if (new Date() > coupon.validEnd) throw new BusinessException(ErrorCode.COUPON_EXPIRED, "优惠券已过期，无法发放");

    // 幂等：已持有该券未使用则跳过（返回既有记录，不重复发放）
    const existing = await this.prisma.userCoupon.findFirst({
      where: { userId: dto.userId, couponId: id, used: false },
    });
    if (existing) return existing;

    // 委托商城统一发放口：建可核销 UserCoupon
    return this.shopCoupon.grantCoupon(id, dto.userId);
  }

  /**
   * 批量发放优惠券（券体系已统一，委托「商城优惠券」统一批量发放口 ShopCouponService.batchGrantCoupon）。
   * 建可核销 UserCoupon（内含 券存在/状态 ACTIVE/未过期 校验 + 已持有未使用去重），返回 { granted, skipped }。
   * `id` = 「商城优惠券」(Coupon) id。理由同 grantCoupon（原 CouponRecord 无下单核销路径）。
   */
  async batchGrantCoupon(id: string, dto: BatchGrantCouponDto) {
    return this.shopCoupon.batchGrantCoupon(id, dto.userIds);
  }

  async getCouponRecords(id: string, dto: CouponRecordFilterDto) {
    const template = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    const { status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.CouponRecordWhereInput = { couponId: id };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.couponRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { claimedAt: "desc" },
      }),
      this.prisma.couponRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // ═══════════════════════════════════════
  // 优惠券中心（用户端·主动领券）
  // ═══════════════════════════════════════

  /**
   * 每人限领数。CouponTemplate 模型无 perUserLimit 字段（本次不改 schema），
   * 固定每人限领 1 张，按该用户在此模板下的历史领取记录总数计（含已使用/已过期）。
   * 并发兜底：CouponRecord @@unique([couponId, userId, status]) 唯一约束防同状态重复插入。
   */
  private static readonly COUPON_PER_USER_LIMIT = 1;

  /** 领取后有效期截止时间 = 领取时间 + 模板 validDays 天 */
  private couponExpiresAt(claimedAt: Date, validDays: number): Date {
    return new Date(claimedAt.getTime() + validDays * 86_400_000);
  }

  /**
   * 可领券模板列表（用户端）。
   * 「可领」判定规则：status=ACTIVE 且当前时间在 [startTime, endTime] 领取窗口内
   * （CouponTemplate 无独立"上架"字段，以 status + 领取时间窗联合判定）。
   */
  async listAvailableCoupons(userId: string) {
    const now = new Date();
    const templates = await this.prisma.couponTemplate.findMany({
      where: { status: "ACTIVE", startTime: { lte: now }, endTime: { gte: now } },
      orderBy: { createdAt: "desc" },
    });

    // 当前用户在各模板下的已领数（含已使用/已过期，与限领口径一致）
    const claimedGroups = templates.length
      ? await this.prisma.couponRecord.groupBy({
          by: ["couponId"],
          where: { userId, couponId: { in: templates.map((t) => t.id) } },
          _count: { _all: true },
        })
      : [];
    const claimedMap = new Map(claimedGroups.map((g) => [g.couponId, g._count._all]));

    const items = templates.map((t) => {
      const claimed = claimedMap.get(t.id) ?? 0;
      const remaining = t.totalCount > 0 ? Math.max(0, t.totalCount - t.claimedCount) : null;
      return {
        id: t.id,
        name: t.name,
        type: t.type, // FIXED=满减 / PERCENT=折扣 / SHIPPING=免邮
        faceValue: Number(t.faceValue),
        threshold: t.threshold != null ? Number(t.threshold) : null,
        totalCount: t.totalCount, // 0=不限量
        remaining, // 剩余可领量，null=不限量
        perUserLimit: MarketingService.COUPON_PER_USER_LIMIT,
        claimed, // 当前用户已领数（前端据此置灰"已领取"）
        claimable: (remaining === null || remaining > 0) && claimed < MarketingService.COUPON_PER_USER_LIMIT,
        startTime: t.startTime, // 领取开始时间
        endTime: t.endTime, // 领取结束时间
        validDays: t.validDays, // 领取后有效期（天）
        applicableScope: t.applicableScope ?? null,
      };
    });

    return { items };
  }

  /**
   * 用户主动领取一张优惠券。
   * 原子性：事务内「每人限领 count 校验 + 条件更新扣库存（CAS：仅 claimedCount < totalCount 时递增）+ 建领取记录」，
   * 任一步失败整体回滚；并发双击由 CouponRecord 唯一约束 (couponId,userId,status) 兜底（P2002 转业务异常）。
   * 创建路径与 admin grant/batch-grant 完全一致（CouponRecord status=UNUSED），下单用券链路兼容。
   */
  async claimCouponTemplate(userId: string, templateId: string) {
    const template = await this.prisma.couponTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    const now = new Date();
    if (template.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该优惠券活动未开始或已结束");
    }
    if (now < template.startTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "活动未开始");
    if (now > template.endTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已结束");

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 每人限领校验（事务内 count；唯一约束二次兜底并发）
        const claimed = await tx.couponRecord.count({ where: { couponId: templateId, userId } });
        if (claimed >= MarketingService.COUPON_PER_USER_LIMIT) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "已达领取上限");
        }

        // 原子库存扣减：条件更新，仅剩余>0 时递增 claimedCount，防超发
        if (template.totalCount > 0) {
          const updated = await tx.couponTemplate.updateMany({
            where: { id: templateId, claimedCount: { lt: template.totalCount } },
            data: { claimedCount: { increment: 1 } },
          });
          if (updated.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "优惠券已抢完");
        } else {
          // totalCount=0 不限量，直接计数
          await tx.couponTemplate.update({
            where: { id: templateId },
            data: { claimedCount: { increment: 1 } },
          });
        }

        // 与 grantCoupon/batchGrantCoupon 同一创建路径
        const record = await tx.couponRecord.create({
          data: { couponId: templateId, userId, status: "UNUSED" },
        });

        this.logger.log(`用户领券成功: user=${userId} template=${templateId} record=${record.id}`);
        return {
          couponId: record.id,
          templateId,
          name: template.name,
          expiresAt: this.couponExpiresAt(record.claimedAt, template.validDays),
        };
      });
    } catch (err: unknown) {
      // 并发双击：唯一约束 (couponId,userId,status) 冲突
      if ((err as { code?: string })?.code === "P2002") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "已达领取上限");
      }
      throw err;
    }
  }

  /**
   * 我的优惠券列表（用户端）。
   * EXPIRED 为派生态：status=UNUSED 但已过 claimedAt+validDays 的记录按 EXPIRED 返回/筛选。
   */
  async getMyCoupons(userId: string, dto: MyCouponFilterDto) {
    const records = await this.prisma.couponRecord.findMany({
      where: { userId },
      include: { coupon: true },
      orderBy: { claimedAt: "desc" },
    });

    const now = Date.now();
    const items = records.map((r) => {
      const expiresAt = this.couponExpiresAt(r.claimedAt, r.coupon?.validDays ?? 0);
      const status = r.status === "UNUSED" && expiresAt.getTime() < now ? "EXPIRED" : r.status;
      return {
        id: r.id, // 券记录 id（下单用券/claim 返回的 couponId 即此 id）
        templateId: r.couponId,
        name: r.coupon?.name ?? null,
        type: r.coupon?.type ?? null,
        faceValue: r.coupon ? Number(r.coupon.faceValue) : null,
        threshold: r.coupon?.threshold != null ? Number(r.coupon.threshold) : null,
        applicableScope: r.coupon?.applicableScope ?? null,
        status, // UNUSED / USED / EXPIRED（含时间派生过期）
        claimedAt: r.claimedAt,
        usedAt: r.usedAt,
        expiresAt,
      };
    });

    const filtered = dto.status ? items.filter((i) => i.status === dto.status) : items;
    return { items: filtered, total: filtered.length };
  }

  // ═══════════════════════════════════════
  // 限时折扣
  // ═══════════════════════════════════════

  async createDiscount(dto: CreateDiscountDto) {
    if (!dto.startTime || !dto.endTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写活动开始和结束时间");
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "折扣开始时间必须早于结束时间");

    return this.prisma.discountActivity.create({
      data: {
        name: dto.name,
        discountPct: dto.discountPct,
        startTime: start,
        endTime: end,
        productIds: dto.productIds ?? [],
        courseIds: dto.courseIds ?? [],
        circleIds: dto.circleIds ?? [],
        scope: dto.scope ?? "GLOBAL",
        scopePageId: dto.scopePageId,
      },
    });
  }

  async listDiscounts(dto: DiscountFilterDto) {
    const { status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.DiscountActivityWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.discountActivity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.discountActivity.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateDiscount(id: string, dto: UpdateDiscountDto) {
    const existing = await this.prisma.discountActivity.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "限时折扣不存在");

    const data: Prisma.DiscountActivityUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.discountPct !== undefined) data.discountPct = dto.discountPct;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.productIds !== undefined) data.productIds = dto.productIds;
    if (dto.courseIds !== undefined) data.courseIds = dto.courseIds;
    if (dto.circleIds !== undefined) data.circleIds = dto.circleIds;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.scopePageId !== undefined) data.scopePageId = dto.scopePageId;

    return this.prisma.discountActivity.update({
      where: { id },
      data,
    });
  }

  async deleteDiscount(id: string) {
    const existing = await this.prisma.discountActivity.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "限时折扣不存在");

    await this.prisma.discountActivity.delete({ where: { id } });
    this.logger.log(`限时折扣已删除: ${id}`);
    return { success: true };
  }

  // ═══════════════════════════════════════
  // 微页面编辑器后端
  // ═══════════════════════════════════════

  async createPage(dto: CreateMarketingPageDto) {
    return this.prisma.marketingPage.create({
      data: {
        name: dto.name,
        route: dto.route,
        description: dto.description || null,
        stationId: dto.stationId || null,
      },
    });
  }

  async listPages(stationId?: string) {
    const where: Prisma.MarketingPageWhereInput = {};
    if (stationId !== undefined) where.stationId = stationId;
    return this.prisma.marketingPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getPage(id: string) {
    const page = await this.prisma.marketingPage.findUnique({
      where: { id },
      include: { components: { orderBy: { sortOrder: "asc" } } },
    });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");
    return page;
  }

  async updatePage(id: string, dto: UpdateMarketingPageDto) {
    const existing = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    return this.prisma.marketingPage.update({
      where: { id },
      data: dto as Prisma.MarketingPageUpdateInput,
    });
  }

  async deletePage(id: string) {
    const existing = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");
    await this.prisma.marketingPageComponent.deleteMany({ where: { pageId: id } });
    await this.prisma.marketingPage.delete({ where: { id } });
    this.logger.log(`微页面已删除: ${id}`);
    return { success: true };
  }

  async addPageComponent(id: string, dto: CreatePageComponentDto) {
    const page = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    return this.prisma.marketingPageComponent.create({
      data: {
        pageId: id,
        type: dto.type,
        title: dto.title,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        sortOrder: dto.sortOrder ?? 0,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        audience: (dto.audience ?? null) as Prisma.InputJsonValue,
      },
    });
  }

  async updatePageComponent(id: string, compId: string, dto: UpdatePageComponentDto) {
    const comp = await this.prisma.marketingPageComponent.findFirst({
      where: { id: compId, pageId: id },
    });
    if (!comp) throw new BusinessException(ErrorCode.NOT_FOUND, "页面组件不存在");

    const data: Prisma.MarketingPageComponentUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.audience !== undefined) data.audience = dto.audience;

    return this.prisma.marketingPageComponent.update({
      where: { id: compId },
      data,
    });
  }

  async deletePageComponent(id: string, compId: string) {
    const comp = await this.prisma.marketingPageComponent.findFirst({
      where: { id: compId, pageId: id },
    });
    if (!comp) throw new BusinessException(ErrorCode.NOT_FOUND, "页面组件不存在");

    await this.prisma.marketingPageComponent.delete({ where: { id: compId } });
    return { success: true };
  }

  async sortPageComponents(id: string, dto: SortComponentsDto) {
    const page = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    // 批量更新排序值
    const updates = dto.componentIds.map((compId, index) =>
      this.prisma.marketingPageComponent.update({
        where: { id: compId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async publishPage(id: string) {
    const page = await this.prisma.marketingPage.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    // 保存历史版本到 ConfigVersion 表
    await this.prisma.configVersion.create({
      data: {
        configKey: `marketing_page_${id}`,
        value: page as Prisma.InputJsonValue,
        version: page.version,
        comment: "页面发布",
      },
    });

    // 更新页面状态和版本号
    return this.prisma.marketingPage.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        version: { increment: 1 },
        publishedAt: new Date(),
      },
    });
  }

  async getPageVersions(id: string) {
    const page = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    return this.prisma.configVersion.findMany({
      where: { configKey: `marketing_page_${id}` },
      orderBy: { version: "desc" },
    });
  }

  async rollbackPage(id: string, versionId: string) {
    const page = await this.prisma.marketingPage.findUnique({ where: { id } });
    if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "微页面不存在");

    const versionRecord = await this.prisma.configVersion.findUnique({ where: { id: versionId } });
    if (!versionRecord || versionRecord.configKey !== `marketing_page_${id}`) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
    }

    const snapshot = versionRecord.value as any;

    // 删除当前所有组件，从快照重建
    await this.prisma.marketingPageComponent.deleteMany({ where: { pageId: id } });

    if (snapshot.components?.length) {
      await this.prisma.marketingPageComponent.createMany({
        data: snapshot.components.map((c: any) => ({
          pageId: id,
          type: c.type,
          title: c.title,
          config: c.config ?? {},
          sortOrder: c.sortOrder ?? 0,
          startTime: c.startTime ? new Date(c.startTime) : null,
          endTime: c.endTime ? new Date(c.endTime) : null,
          audience: c.audience ?? null,
        })),
      });
    }

    const newVersion = page.version + 1;
    await this.prisma.marketingPage.update({
      where: { id },
      data: {
        name: snapshot.name ?? page.name,
        route: snapshot.route ?? page.route,
        version: newVersion,
        status: snapshot.status ?? page.status,
      },
    });

    // 记录回滚操作
    await this.prisma.configVersion.create({
      data: {
        configKey: `marketing_page_${id}`,
        value: { action: "rollback", fromVersion: versionRecord.version, toVersion: newVersion } as any,
        version: newVersion,
        comment: `从版本 ${versionRecord.version} 回滚`,
      },
    });

    this.logger.log(`微页面 ${id} 已回滚到版本 ${versionRecord.version}`);
    return this.getPage(id);
  }

  // 用户端：根据路由获取已发布的微页面
  async getPublishedPageByRoute(route: string) {
    const page = await this.prisma.marketingPage.findUnique({
      where: { route },
      include: { components: { orderBy: { sortOrder: "asc" } } },
    });
    if (!page || page.status !== "PUBLISHED") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "页面不存在或未发布");
    }
    // 过滤掉不在展示时间范围内的组件
    const now = new Date();
    page.components = page.components.filter((c) => {
      if (c.startTime && new Date(c.startTime) > now) return false;
      if (c.endTime && new Date(c.endTime) < now) return false;
      return true;
    });
    return page;
  }

  // ═══════════════════════════════════════
  // 活动管理
  // ═══════════════════════════════════════

  async createActivity(dto: CreateActivityDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "活动开始时间必须早于结束时间");

    // 如果指定了 pageId，验证页面存在
    if (dto.pageId) {
      const page = await this.prisma.marketingPage.findUnique({ where: { id: dto.pageId } });
      if (!page) throw new BusinessException(ErrorCode.NOT_FOUND, "关联的微页面不存在");
    }

    return this.prisma.activity.create({
      data: {
        name: dto.name,
        description: dto.description,
        startTime: start,
        endTime: end,
        pageId: dto.pageId,
      },
    });
  }

  async listActivities(dto: ActivityFilterDto) {
    const { status } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.ActivityWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateActivity(id: string, dto: UpdateActivityDto) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");

    const data: Prisma.ActivityUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.pageId !== undefined) data.pageId = dto.pageId;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.activity.update({
      where: { id },
      data,
    });
  }

  async deleteActivity(id: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    await this.prisma.activity.delete({ where: { id } });
    this.logger.log(`活动已删除: ${id}`);
    return { success: true };
  }

  async getActivityMetrics(id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { metrics: true },
    });
    if (!activity) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");

    return activity.metrics || { pv: 0, uv: 0, conversions: 0, revenue: 0 };
  }

  // ═══════════════════════════════════════
  // 满减送管理
  // ═══════════════════════════════════════

  async createFullReduction(dto: CreateFullReductionDto) {
    if (!dto.startTime || !dto.endTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写活动开始和结束时间");
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "满减送开始时间必须早于结束时间");
    if (dto.reduction >= dto.threshold) throw new BusinessException(ErrorCode.BAD_REQUEST, "减金额必须小于满金额");

    return this.prisma.fullReductionRule.create({
      data: {
        name: dto.name,
        threshold: dto.threshold,
        reduction: dto.reduction,
        giftProductId: dto.giftProductId,
        giftCount: dto.giftCount ?? 0,
        startTime: start,
        endTime: end,
        productIds: dto.productIds ?? [],
        scope: dto.scope ?? "GLOBAL",
        scopePageId: dto.scopePageId,
        status: dto.status ?? "DRAFT",
      },
    });
  }

  async updateFullReduction(id: string, dto: UpdateFullReductionDto) {
    const existing = await this.prisma.fullReductionRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "满减送活动不存在");

    const data: Prisma.FullReductionRuleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.threshold !== undefined) data.threshold = dto.threshold;
    if (dto.reduction !== undefined) data.reduction = dto.reduction;
    if (dto.giftProductId !== undefined) data.giftProductId = dto.giftProductId;
    if (dto.giftCount !== undefined) data.giftCount = dto.giftCount;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.productIds !== undefined) data.productIds = dto.productIds;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.scopePageId !== undefined) data.scopePageId = dto.scopePageId;

    // 校验
    const threshold = dto.threshold ?? Number(existing.threshold);
    const reduction = dto.reduction ?? Number(existing.reduction);
    if (reduction >= threshold) throw new BusinessException(ErrorCode.BAD_REQUEST, "减金额必须小于满金额");

    return this.prisma.fullReductionRule.update({
      where: { id },
      data,
    });
  }

  async deleteFullReduction(id: string) {
    const existing = await this.prisma.fullReductionRule.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "满减送活动不存在");

    await this.prisma.fullReductionRule.delete({ where: { id } });
    this.logger.log(`满减送活动已删除: ${id}`);
    return { success: true };
  }

  async getFullReductions(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Prisma.FullReductionRuleWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.fullReductionRule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.fullReductionRule.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getFullReduction(id: string) {
    const rule = await this.prisma.fullReductionRule.findUnique({ where: { id } });
    if (!rule) throw new BusinessException(ErrorCode.NOT_FOUND, "满减送活动不存在");
    return rule;
  }

  async getActiveFullReductions() {
    const now = new Date();
    return this.prisma.fullReductionRule.findMany({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ═══════════════════════════════════════
  // 用户端公开接口
  // ═══════════════════════════════════════

  @Cacheable({ key: "flash:sales:active", ttl: 30 })
  async getActiveFlashSales() {
    const now = new Date();
    const sales = await this.prisma.flashSale.findMany({
      where: {
        status: { in: ["ACTIVE", "SCHEDULED"] },
        endTime: { gte: now },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { startTime: "asc" },
    });
    // 补全秒杀商品信息（item 仅有 productId）
    const productIds = [...new Set(sales.flatMap(s => s.items.map(i => i.productId)))];
    const products = productIds.length > 0 ? await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, images: true, price: true, originalPrice: true },
    }) : [];
    const pMap = new Map(products.map(p => [p.id, p]));
    return sales.map(s => ({
      ...s,
      items: s.items.map(it => {
        const p = pMap.get(it.productId);
        return {
          ...it,
          product: p ? {
            id: p.id, title: p.title, image: p.images?.[0] || null,
            price: Number(p.price), originalPrice: Number(p.originalPrice ?? p.price),
          } : null,
        };
      }),
    }));
  }

  @Cacheable({ key: "groupbuy:active", ttl: 30 })
  async getActiveGroupBuys() {
    const groupBuys = await this.prisma.groupBuy.findMany({
      where: { status: "ACTIVE" },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: "desc" },
    });
    // 补全拼团商品信息（仅有 productId）
    const productIds = [...new Set(groupBuys.map(g => g.productId))];
    const products = productIds.length > 0 ? await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, images: true, price: true, originalPrice: true },
    }) : [];
    const pMap = new Map(products.map(p => [p.id, p]));
    return groupBuys.map(g => {
      const p = pMap.get(g.productId);
      return {
        ...g,
        joinedCount: g._count.participants,
        product: p ? {
          id: p.id, title: p.title, image: p.images?.[0] || null,
          price: Number(p.price), originalPrice: Number(p.originalPrice ?? p.price),
        } : null,
      };
    });
  }

  /**
   * 参与拼团（付费拼团）：校验活动/团容量/未重复 → 委托 shop 用拼团价创建 PENDING 订单 → 返回订单供前端支付。
   * 支付成功后由 ShopService.settleGroupBuyIfNeeded 创建参与者并判定成团（参与者恒为已付）。
   * @param groupId 传入则加入已有团（校验未满），否则开新团
   */
  async joinGroupBuy(userId: string, groupBuyId: string, groupId?: string) {
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: groupBuyId } });
    if (!gb) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);
    if (gb.status !== "ACTIVE") throw new BusinessException(ErrorCode.BAD_REQUEST, "拼团活动已结束");

    // 已参与校验：仅已付（WAITING/SUCCESS）算已参与，未付订单不占名额（允许重新发起）
    const existing = await this.prisma.groupBuyParticipant.findFirst({
      where: { groupBuyId, userId, status: { in: ["WAITING", "SUCCESS"] } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "您已参与此拼团");

    // 确定团：加入已有团需校验未满；否则开新团
    let targetGroupId = groupId;
    if (targetGroupId) {
      const cnt = await this.prisma.groupBuyParticipant.count({
        where: { groupId: targetGroupId, status: { in: ["WAITING", "SUCCESS"] } },
      });
      if (cnt >= gb.minMembers) throw new BusinessException(ErrorCode.BAD_REQUEST, "该团已满，请开新团参与");
    } else {
      targetGroupId = randomUUID();
    }

    // 委托 shop 用拼团价创建订单（扣库存、防篡改），前端拿 orderId 走支付链路
    const order = await this.shop.createGroupBuyOrder(userId, {
      groupBuyId,
      productId: gb.productId,
      skuId: gb.skuId ?? undefined,
      groupPrice: Number(gb.groupPrice),
      groupId: targetGroupId,
    });
    return { orderId: order.id, amount: Number(order.amount), groupId: targetGroupId, groupBuyId };
  }

  async getMyGroupBuys(userId: string) {
    const records = await this.prisma.groupBuyParticipant.findMany({
      where: { userId },
      include: { groupBuy: { include: { _count: { select: { participants: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    // 补全拼团商品信息（groupBuy 仅有 productId），供「我的拼团」列表渲染
    const productIds = [...new Set(records.map(r => r.groupBuy.productId))];
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true, images: true } })
      : [];
    const pMap = new Map(products.map(p => [p.id, p]));
    return records.map(r => {
      const p = pMap.get(r.groupBuy.productId);
      return {
        ...r,
        joinedCount: r.groupBuy._count.participants,
        product: p ? { id: p.id, title: p.title, image: p.images?.[0] || null } : null,
      };
    });
  }

  /**
   * 我的拼团结果（成功/失败结果页数据源）：返回参与状态 + 商品 + 同团成员 + 订单 + 退款信息。
   * status: WAITING(拼团中) / SUCCESS(已成团) / REFUNDED(超时退款)。前端按 status 渲染成功/失败页。
   */
  async getMyGroupBuyResult(userId: string, groupBuyId: string) {
    const part = await this.prisma.groupBuyParticipant.findFirst({
      where: { groupBuyId, userId },
      orderBy: { createdAt: "desc" },
    });
    if (!part) throw new BusinessException(ErrorCode.NOT_FOUND, "未参与该拼团");
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: groupBuyId } });
    if (!gb) throw new BusinessException(ErrorCode.GROUP_BUY_NOT_FOUND);

    const product = await this.prisma.product.findUnique({
      where: { id: gb.productId },
      select: { id: true, title: true, images: true, price: true, originalPrice: true },
    });

    // 同团已付成员（含团长在前）
    const members = await this.prisma.groupBuyParticipant.findMany({
      where: { groupId: part.groupId, status: { in: ["WAITING", "SUCCESS"] } },
      orderBy: { createdAt: "asc" },
    });
    const userIds = [...new Set(members.map((m) => m.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatar: true } })
      : [];
    const uMap = new Map(users.map((u) => [u.id, u]));

    const order = part.orderId ? await this.prisma.order.findUnique({ where: { id: part.orderId } }) : null;

    return {
      status: part.status,
      groupId: part.groupId,
      orderId: part.orderId,
      minMembers: gb.minMembers,
      currentMembers: members.length,
      product: product
        ? {
            id: product.id,
            title: product.title,
            image: product.images?.[0] || null,
            price: Number(gb.groupPrice),
            originalPrice: Number(product.originalPrice ?? product.price),
          }
        : null,
      members: members.map((m) => {
        const u = uMap.get(m.userId);
        return { userId: m.userId, nickname: u?.nickname || "团员", avatar: u?.avatar || null, isLeader: m.isLeader };
      }),
      paidAt: order?.paidAt || null,
      refundedAt: order?.refundedAt || null,
      refundAmount: part.status === "REFUNDED" ? Number(order?.amount ?? gb.groupPrice) : 0,
    };
  }
}
