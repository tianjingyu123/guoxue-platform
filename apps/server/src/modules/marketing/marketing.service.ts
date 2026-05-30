import {
  Injectable, Logger,
} from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import {
  CreateFlashSaleDto, UpdateFlashSaleDto, FlashSaleFilterDto,
  CreateFlashSaleItemDto, UpdateFlashSaleItemDto,
  CreateGroupBuyDto, UpdateGroupBuyDto, GroupBuyFilterDto,
  CreateCouponTemplateDto, UpdateCouponTemplateDto, CouponFilterDto,
  GrantCouponDto, BatchGrantCouponDto, CouponRecordFilterDto,
  CreateDiscountDto, UpdateDiscountDto, DiscountFilterDto,
  CreateMarketingPageDto, UpdateMarketingPageDto,
  CreatePageComponentDto, UpdatePageComponentDto, SortComponentsDto,
  CreateActivityDto, UpdateActivityDto, ActivityFilterDto,
  CreateFullReductionDto, UpdateFullReductionDto,
} from "./marketing.dto";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // 秒杀管理
  // ═══════════════════════════════════════

  async createFlashSale(dto: CreateFlashSaleDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀开始时间必须早于结束时间");

    const flashSale = await this.prisma.flashSale.create({
      data: {
        name: dto.name,
        startTime: start,
        endTime: end,
        warmupMinutes: dto.warmupMinutes ?? 0,
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
    const { page = 1, pageSize = 20,status } = dto;
    const where: Prisma.FlashSaleWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.flashSale.findMany({
        where,
        include: { items: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.flashSale.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateFlashSale(id: string, dto: UpdateFlashSaleDto) {
    const existing = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀活动不存在");

    const data: Prisma.FlashSaleUpdateInput = {};
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.warmupMinutes !== undefined) data.warmupMinutes = dto.warmupMinutes;
    if (dto.status !== undefined) data.status = dto.status;

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
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀活动不存在");

    await this.prisma.flashSale.delete({ where: { id } });
    this.logger.log(`秒杀活动已删除: ${id}`);
    return { success: true };
  }

  async addFlashSaleItem(id: string, dto: CreateFlashSaleItemDto) {
    const flashSale = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!flashSale) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀活动不存在");

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
    if (!flashSale) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀活动不存在");

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
    if (!flashSale) throw new BusinessException(ErrorCode.NOT_FOUND, "秒杀活动不存在");

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
      },
    });
  }

  async listGroupBuys(dto: GroupBuyFilterDto) {
    const { page = 1, pageSize = 20,status } = dto;
    const where: Prisma.GroupBuyWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.groupBuy.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.groupBuy.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateGroupBuy(id: string, dto: UpdateGroupBuyDto) {
    const existing = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "拼团活动不存在");

    return this.prisma.groupBuy.update({
      where: { id },
      data: dto as Prisma.GroupBuyUpdateInput,
    });
  }

  async deleteGroupBuy(id: string) {
    const existing = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "拼团活动不存在");
    await this.prisma.groupBuy.delete({ where: { id } });
    this.logger.log(`拼团活动已删除: ${id}`);
    return { success: true };
  }

  async getGroupBuyParticipants(id: string) {
    const groupBuy = await this.prisma.groupBuy.findUnique({ where: { id } });
    if (!groupBuy) throw new BusinessException(ErrorCode.NOT_FOUND, "拼团活动不存在");

    return this.prisma.groupBuyParticipant.findMany({
      where: { groupBuyId: id },
      orderBy: { createdAt: "desc" },
    });
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
        scope: dto.scope ?? Prisma.DbNull,
        aiPrecision: dto.aiPrecision ?? false,
      },
    });
  }

  async listCouponTemplates(dto: CouponFilterDto) {
    const { page = 1, pageSize = 20,status, type } = dto;
    const where: Prisma.CouponTemplateWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.couponTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
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
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.aiPrecision !== undefined) data.aiPrecision = dto.aiPrecision;
    if (dto.status !== undefined) data.status = dto.status;

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

  async grantCoupon(id: string, dto: GrantCouponDto) {
    const template = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    // 检查发行量
    if (template.totalCount > 0 && template.claimedCount >= template.totalCount) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "优惠券已领完");
    }

    // 使用事务：原子增加 claimedCount + 创建领取记录
    return this.prisma.$transaction(async (tx) => {
      await tx.couponTemplate.update({
        where: { id },
        data: { claimedCount: { increment: 1 } },
      });

      return tx.couponRecord.create({
        data: {
          couponId: id,
          userId: dto.userId,
          status: "UNUSED",
        },
      });
    });
  }

  async batchGrantCoupon(id: string, dto: BatchGrantCouponDto) {
    const template = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    // 计算可发放数量
    let remaining = dto.userIds.length;
    if (template.totalCount > 0) {
      const current = await this.prisma.couponTemplate.findUnique({
        where: { id },
        select: { claimedCount: true },
      });
      remaining = Math.max(0, template.totalCount - (current?.claimedCount ?? 0));
    }

    const toGrant = dto.userIds.slice(0, remaining);
    const cannotGrant = dto.userIds.slice(remaining);
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    // 单次事务批量发放
    if (toGrant.length > 0) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.couponTemplate.update({
            where: { id },
            data: { claimedCount: { increment: toGrant.length } },
          });
          await tx.couponRecord.createMany({
            data: toGrant.map((userId) => ({ couponId: id, userId, status: "UNUSED" })),
          });
        });
        toGrant.forEach((userId) => results.push({ userId, success: true }));
      } catch (err: unknown) {
        this.logger.warn(`批量发放优惠券事务失败: ${(err as Error).message}`);
        toGrant.forEach((userId) => results.push({ userId, success: false, error: (err as Error).message }));
      }
    }

    cannotGrant.forEach((userId) => results.push({ userId, success: false, error: "优惠券已领完" }));

    return { total: dto.userIds.length, success: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, results };
  }

  async getCouponRecords(id: string, dto: CouponRecordFilterDto) {
    const template = await this.prisma.couponTemplate.findUnique({ where: { id } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "优惠券模板不存在");

    const { page = 1, pageSize = 20,status } = dto;
    const where: Prisma.CouponRecordWhereInput = { couponId: id };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.couponRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { claimedAt: "desc" },
      }),
      this.prisma.couponRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // ═══════════════════════════════════════
  // 限时折扣
  // ═══════════════════════════════════════

  async createDiscount(dto: CreateDiscountDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) throw new BusinessException(ErrorCode.BAD_REQUEST, "折扣开始时间必须早于结束时间");

    return this.prisma.discountActivity.create({
      data: {
        name: dto.name,
        discountPct: dto.discountPct,
        startTime: start,
        endTime: end,
        productIds: dto.productIds,
      },
    });
  }

  async listDiscounts(dto: DiscountFilterDto) {
    const { page = 1, pageSize = 20,status } = dto;
    const where: Prisma.DiscountActivityWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.discountActivity.findMany({
        where,
        skip: (page - 1) * pageSize,
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
    if (dto.status !== undefined) data.status = dto.status;

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
      },
    });
  }

  async listPages() {
    return this.prisma.marketingPage.findMany({
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
    const { page = 1, pageSize = 20,status } = dto;
    const where: Prisma.ActivityWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * pageSize,
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

  async getFullReductions(page = 1, pageSize = 20, status?: string) {
    const where: Prisma.FullReductionRuleWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.fullReductionRule.findMany({
        where,
        skip: (page - 1) * pageSize,
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

  async getActiveFlashSales() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: {
        status: { in: ["ACTIVE", "SCHEDULED"] },
        endTime: { gte: now },
      },
      include: { items: true },
      orderBy: { startTime: "asc" },
    });
  }

  async getActiveGroupBuys() {
    return this.prisma.groupBuy.findMany({
      where: { status: "ACTIVE" },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async joinGroupBuy(userId: string, groupBuyId: string, groupId?: string) {
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: groupBuyId } });
    if (!gb) throw new BusinessException(ErrorCode.NOT_FOUND, "拼团活动不存在");
    if (gb.status !== "ACTIVE") throw new BusinessException(ErrorCode.BAD_REQUEST, "拼团活动已结束");

    const existing = await this.prisma.groupBuyParticipant.findFirst({
      where: { groupBuyId, userId },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "您已参与此拼团");

    return this.prisma.groupBuyParticipant.create({
      data: { groupBuyId, userId, groupId: groupId ?? groupBuyId },
    });
  }

  async getMyGroupBuys(userId: string) {
    return this.prisma.groupBuyParticipant.findMany({
      where: { userId },
      include: { groupBuy: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
