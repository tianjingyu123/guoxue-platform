import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";

/** C 端列表摘要截断长度（未购可见的试读） */
const SUMMARY_LEN = 100;
/** C 端详情试读截断长度（未购 ARTICLE） */
const PREVIEW_LEN = 200;

@Injectable()
export class InstituteContentService {
  private readonly logger = new Logger(InstituteContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly coin?: CoinService,
  ) {}

  async create(dto: { title: string; content: string; instituteId: string; contentType?: string; summary?: string; price?: number }, authorId: string) {
    return this.prisma.instituteContent.create({
      data: { ...dto, authorId, price: dto.price ?? 0 },
    });
  }

  async list(params: { instituteId?: string; status?: string; page?: number; pageSize?: number }) {
    const { instituteId, status, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (instituteId) where.instituteId = instituteId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.instituteContent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.instituteContent.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const c = await this.prisma.instituteContent.findUnique({
      where: { id },
      include: { purchases: { take: 20, orderBy: { purchasedAt: "desc" } } },
    });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "内容不存在");
    return c;
  }

  async update(id: string, dto: { title?: string; content?: string; summary?: string; price?: number; status?: string }) {
    const existing = await this.prisma.instituteContent.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院内容不存在");
    return this.prisma.instituteContent.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const existing = await this.prisma.instituteContent.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院内容不存在");
    return this.prisma.instituteContent.update({ where: { id }, data: { status: "ARCHIVED" } });
  }

  async getStats(instituteId?: string) {
    const where: any = instituteId ? { instituteId } : {};
    const [total, published, draft] = await Promise.all([
      this.prisma.instituteContent.count({ where }),
      this.prisma.instituteContent.count({ where: { ...where, status: "PUBLISHED" } }),
      this.prisma.instituteContent.count({ where: { ...where, status: "DRAFT" } }),
    ]);
    const purchases = await this.prisma.instituteContentPurchase.count({
      where: instituteId ? { content: { instituteId } } : {},
    });
    return { total, published, draft, purchases };
  }

  async getPurchaseRecords(contentId: string, page = 1, pageSize = 20) {
    const where = { contentId };
    const [items, total] = await Promise.all([
      this.prisma.instituteContentPurchase.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { purchasedAt: "desc" },
      }),
      this.prisma.instituteContentPurchase.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  // ════════════════════════════════════════
  // C 端（大师讲堂付费知识库·T9-P0b）
  // ════════════════════════════════════════

  /** 币价：Decimal(10,2) → 整数国学币（币为 Int，向上取整防止 0.5 币漏价） */
  private coinPrice(price: unknown): number {
    return Math.ceil(Number(price ?? 0));
  }

  /**
   * 列表摘要（未购可见的试读）：优先 summary；ARTICLE 无摘要时截 content 前 100 字；
   * VIDEO/DOCUMENT 的 content 存的是 URL，绝不能作为摘要外泄（等于免费送全量）。
   */
  private buildSummary(c: { contentType: string; content: string; summary: string | null }): string {
    if (c.summary) return c.summary.slice(0, SUMMARY_LEN);
    if (c.contentType === "ARTICLE") return c.content.slice(0, SUMMARY_LEN);
    return "";
  }

  /** C 端列表（公开·仅 PUBLISHED；登录时附带 purchased 已购标记） */
  async listPublic(params: { type?: string; page?: number; pageSize?: number }, userId?: string) {
    const { type, page = 1, pageSize = 20 } = params;
    const where: { status: string; contentType?: string } = { status: "PUBLISHED" };
    if (type) where.contentType = type;

    const [rows, total] = await Promise.all([
      this.prisma.instituteContent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { purchases: true } } },
      }),
      this.prisma.instituteContent.count({ where }),
    ]);

    // 登录时批量查已购集合（避免 N+1）
    let purchasedSet = new Set<string>();
    if (userId && rows.length) {
      const bought = await this.prisma.instituteContentPurchase.findMany({
        where: { userId, contentId: { in: rows.map((r) => r.id) } },
        select: { contentId: true },
      });
      purchasedSet = new Set(bought.map((b) => b.contentId));
    }

    const items = rows.map((c) => {
      const price = this.coinPrice(c.price);
      return {
        id: c.id,
        contentType: c.contentType,
        title: c.title,
        price,
        summary: this.buildSummary(c),
        purchaseCount: c._count.purchases,
        createdAt: c.createdAt,
        purchased: price === 0 || purchasedSet.has(c.id),
      };
    });
    return { items, total, page, pageSize };
  }

  /**
   * C 端详情（OptionalAuth）：
   * - 已购或免费(price=0)：全量 content + purchased:true
   * - 未购：试读（ARTICLE 给 content 前 200 字；VIDEO/DOCUMENT 的 content 是 URL 不外泄，只给简介）
   */
  async getPublic(id: string, userId?: string) {
    const c = await this.prisma.instituteContent.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    });
    if (!c || c.status !== "PUBLISHED") throw new BusinessException(ErrorCode.NOT_FOUND, "内容不存在或未发布");

    const price = this.coinPrice(c.price);
    let purchased = price === 0;
    if (!purchased && userId) {
      const bought = await this.prisma.instituteContentPurchase.findFirst({
        where: { contentId: id, userId },
        select: { id: true },
      });
      purchased = !!bought;
    }

    // 作者公开名片（authorId 为发布管理员/讲师的 User.id，容错查询）
    const author = await this.prisma.user
      .findUnique({ where: { id: c.authorId }, select: { id: true, nickname: true, avatar: true } })
      .catch(() => null);

    return {
      id: c.id,
      contentType: c.contentType,
      title: c.title,
      summary: this.buildSummary(c),
      price,
      purchaseCount: c._count.purchases,
      createdAt: c.createdAt,
      author,
      purchased,
      // 未购试读：仅 ARTICLE 给正文前 200 字；VIDEO/DOCUMENT 不给 content（URL 即全量）
      content: purchased ? c.content : c.contentType === "ARTICLE" ? c.content.slice(0, PREVIEW_LEN) : "",
    };
  }

  /**
   * 购买（登录）：coin.spend 原子扣币（与购买落库同一事务）+ 事务内防重购。
   * scene 用 PEEK_ANSWER（CoinScene 无内容购买专值，语义最近=付费解锁查看内容；
   * refId=contentId + description 区分业务，勿新增枚举值以免 DB 拒绝落库）。
   */
  async purchase(id: string, userId: string) {
    const c = await this.prisma.instituteContent.findUnique({ where: { id } });
    if (!c || c.status !== "PUBLISHED") throw new BusinessException(ErrorCode.NOT_FOUND, "内容不存在或未发布");

    const price = this.coinPrice(c.price);
    if (price <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "免费内容无需购买，可直接阅读");
    if (!this.coin) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用，请稍后再试");

    return this.prisma.$transaction(async (tx) => {
      // 防重购：模型无 (contentId,userId) 唯一约束，事务内 count 校验
      const dup = await tx.instituteContentPurchase.count({ where: { contentId: id, userId } });
      if (dup > 0) throw new BusinessException(ErrorCode.INTERACTION_DUPLICATE, "已购买过该内容，可直接阅读");

      try {
        await this.coin!.spend(
          userId,
          { amountCoin: price, scene: "PEEK_ANSWER", refId: id, description: `购买大师讲堂「${c.title}」` },
          tx,
        );
      } catch (e) {
        if (e instanceof BusinessException && e.errorCode === ErrorCode.COIN_BALANCE_INSUFFICIENT) {
          // 余额不足带价格，前端据此引导充值
          throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, `国学币余额不足，本内容需 ${price} 币，请先充值`);
        }
        throw e;
      }

      const record = await tx.instituteContentPurchase.create({
        data: { contentId: id, userId, price: c.price },
      });
      this.logger.log(`用户 ${userId} 购买研究院内容 ${id}（${price} 币）`);
      return { purchased: true, price, purchaseId: record.id, purchasedAt: record.purchasedAt };
    });
  }
}
