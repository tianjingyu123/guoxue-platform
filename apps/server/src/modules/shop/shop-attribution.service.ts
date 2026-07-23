import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";

/**
 * 商城分销归因域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：下单/支付成功时的推荐人解析、渠道点击归因（佣-V2-P2/P3）、
 * 自购立减资格判定、白标贺卡 meta 组装、订单分佣+平台费统一记账。
 * 由 ShopOrderService（下单）与 ShopPaymentService（支付回调）复用。
 */
@Injectable()
export class ShopAttributionService {
  private readonly logger = new Logger(ShopAttributionService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
  ) {}

  /**
   * 解析归因 ref 值（分享者用户ID 或 分站推广码）→ 推荐人 userId。
   * 无效值静默丢弃（按无临时推荐人处理）；ref=买家本人时保留（供自购立减判定）。
   */
  /** 白标贺卡（供-P2）：全局开关 ConfigSystem key（默认开·configValue='false'/'0'/'off' 关闭） */
  private static readonly GIFT_CARD_CONFIG_KEY = "shop.gift_card.enabled";
  /** 白标贺卡默认祝语（从业者未自定义时使用·R4 合规：寓意表述，无功效承诺） */
  private static readonly GIFT_CARD_DEFAULT_BLESSING = "山川异域，风月同天。愿此雅物承美意，伴君岁岁皆安澜。";
  /** 名片页 H5 链接模板（课题一 P2 从业者名片·扫码归因回流平台） */
  private static readonly GIFT_CARD_QR_BASE = "https://api.rebugx.cn/h5/#/pkg-creator/teacher-profile/index";

  /**
   * 组装白标贺卡任务 meta（供-P2）。
   * - 全局开关 shop.gift_card.enabled 关闭 → 不生成；
   * - 归因者不存在 → 不生成；
   * - fromName：归因者昵称，未设置昵称回落平台署名（TODO 个人级署名：User/分销配置加专属署名列后优先取）；
   * - TODO 个人级开关：从业者可关（User 或分销配置加 giftCardEnabled 列后在此跳过关闭者）；
   * - qrRef：归因者名片页链接（userId=归因者·ref=归因者，客户扫码即建立归因）。
   * 任何失败返回 null（订单不附贺卡，不阻塞下单）。
   */
  async buildGiftCardMeta(
    referrerUserId: string,
  ): Promise<{ fromName: string; blessing?: string; qrRef: string } | null> {
    try {
      const cfg = await this.prisma.configSystem.findUnique({
        where: { configKey: ShopAttributionService.GIFT_CARD_CONFIG_KEY },
        select: { configValue: true },
      });
      if (cfg && ["false", "0", "off"].includes(cfg.configValue.trim().toLowerCase())) return null;

      const referrer = await this.prisma.user.findUnique({
        where: { id: referrerUserId },
        select: { id: true, nickname: true },
      });
      if (!referrer) return null;

      const fromName = (referrer.nickname || "").trim() || "国学甄选";
      return {
        fromName,
        blessing: ShopAttributionService.GIFT_CARD_DEFAULT_BLESSING,
        qrRef: `${ShopAttributionService.GIFT_CARD_QR_BASE}?userId=${referrer.id}&ref=${referrer.id}`,
      };
    } catch (e) {
      this.logger.warn("白标贺卡信息组装失败，本单不附贺卡", e);
      return null;
    }
  }

  /**
   * 自购立减资格判定（供-P3 泛化·2026-07-04）：
   * 复用站长自购立减机制，扩展到全部分销角色——任一角色成立即享（比例统一取 CommissionConfig.rateA·后台可配）：
   * ① 站长（Station ACTIVE）② 圈主（Circle ACTIVE 且未软删）③ 驿站运营者（StationOffline ACTIVE）
   * ④ 认证从业者（TeacherCertification APPROVED）⑤ 运营商（Operator ACTIVE）。
   * 防套利与站长版一致：立减单清空推荐关系（referrerId/tempReferrerId 置空）→ 佣金天然不产生；
   * 白标贺卡不生成；退款按实付价退。查询失败由调用方兜底按原价下单，不阻塞交易。
   */
  async isDistributorSelfPurchaseEligible(userId: string): Promise<boolean> {
    const [station, circle, offlineStation, teacherCert, operator] = await Promise.all([
      this.prisma.station.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true } }),
      this.prisma.circle.findFirst({ where: { ownerId: userId, status: "ACTIVE", deletedAt: null }, select: { id: true } }),
      this.prisma.stationOffline.findFirst({ where: { ownerUserId: userId, status: "ACTIVE" }, select: { id: true } }),
      this.prisma.teacherCertification.findFirst({ where: { userId, status: "APPROVED" }, select: { id: true } }),
      this.prisma.operator.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true } }),
    ]);
    return Boolean(station || circle || offlineStation || teacherCert || operator);
  }

  /** 佣-V2-P2 归因灰度开关键（ConfigSystem·"true" 才启用新判定·缺省/其他值=旧逻辑·回滚路径） */
  private static readonly CHANNEL_ATTRIBUTION_FLAG = "commission_v2_attribution";

  /** 佣-V2-P2：渠道归因灰度开关是否开启（默认 false=完全走现行归因逻辑） */
  async isChannelAttributionEnabled(): Promise<boolean> {
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: ShopAttributionService.CHANNEL_ATTRIBUTION_FLAG },
        select: { configValue: true },
      });
      return row?.configValue?.trim().toLowerCase() === "true";
    } catch {
      return false; // 开关查询失败视为关闭，走旧逻辑
    }
  }

  /**
   * 佣-V2-P2：查该用户对该商品的最新有效渠道点击（last-click·7天窗在写入侧钉死 expiresAt）。
   * targetId 精确匹配优先（单品链接），其次 SHOP_ALL 全店链接兜底。
   */
  async findLatestChannelClick(
    userId: string,
    targetId: string,
  ): Promise<{ beneficiaryUserId: string; subjectType: string } | null> {
    const now = new Date();
    const select = { beneficiaryUserId: true, subjectType: true } as const;
    const exact = await this.prisma.channelClick.findFirst({
      where: { userId, targetId, expiresAt: { gt: now } },
      orderBy: { clickedAt: "desc" },
      select,
    });
    if (exact) return exact;
    return this.prisma.channelClick.findFirst({
      where: { userId, targetType: "SHOP_ALL", expiresAt: { gt: now } },
      orderBy: { clickedAt: "desc" },
      select,
    });
  }

  /**
   * 佣-V2-P3：解析直播间所属圈子的圈主（直播购买视同圈子渠道点击的受益人）。
   * LiveRoom.circleId 为圈子归属字段（schema 已核实）；房间无圈子/圈子非 ACTIVE/查询失败均返回 null（静默跳过）。
   */
  async resolveLiveCircleOwner(liveRoomId: string): Promise<string | null> {
    try {
      const room = await this.prisma.liveRoom.findUnique({
        where: { id: liveRoomId },
        select: { circleId: true },
      });
      if (!room?.circleId) return null;
      const circle = await this.prisma.circle.findFirst({
        where: { id: room.circleId, status: "ACTIVE", deletedAt: null },
        select: { ownerId: true },
      });
      return circle?.ownerId ?? null;
    } catch (e) {
      this.logger.warn("直播间圈子受益人解析失败，跳过直播来源归因", e);
      return null;
    }
  }

  async resolveReferrerUserId(ref: string | undefined | null, buyerId: string): Promise<string | null> {
    if (!ref) return null;
    if (ref === buyerId) return buyerId;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: ref }, select: { id: true } });
      if (user) return user.id;
      const station = await this.prisma.station.findUnique({ where: { code: ref }, select: { userId: true, status: true } });
      if (station?.status === "ACTIVE") return station.userId;
    } catch {
      /* 解析失败按无推荐人处理 */
    }
    return null;
  }

  /**
   * 支付成功账务补偿：每 10 分钟复核近 48 小时已支付订单。
   * 首次回调若在订单置 PAID 后遇到分佣/平台费瞬时故障，下一轮会自动补齐；
   * CommissionService 的订单级幂等守卫确保重复复核不重复累计。
   */
  @Cron("*/10 * * * *", { name: "reconcilePaidOrderAccounting" })
  async reconcilePaidOrderAccounting() {
    // 裁剪测试/降级部署若未装配完整 Redis 能力则安全空转；生产 RedisService 必定提供该方法。
    if (typeof this.redis?.runExclusive !== "function") return { checked: 0 };
    return this.redis.runExclusive("shop_paid_order_accounting_reconcile", 540, async () => {
      const now = Date.now();
      const offsetKey = "shop_paid_order_accounting_offset";
      const rawOffset = Number(await this.redis.get(offsetKey));
      const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      const orders = await this.prisma.order.findMany({
        where: {
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
          paidAt: {
            gte: new Date(now - 48 * 60 * 60 * 1000),
            lte: new Date(now - 2 * 60 * 1000),
          },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          userId: true,
          referrerId: true,
          tempReferrerId: true,
          tempRefSubjectType: true,
        },
        orderBy: { paidAt: "asc" },
        skip: offset,
        take: 500,
      });

      // 普通用户分享成交只发一次成长积分，不能被周期对账重复触发；
      // 仅现金渠道主体（显式渠道类型或确实存在分站的推荐人）重跑分佣，其他订单只补平台费。
      const stationRefCandidates = Array.from(
        new Set(
          orders
            .filter((order) => !["STATION", "CIRCLE", "OFFLINE_STATION"].includes(order.tempRefSubjectType || ""))
            .map((order) => order.tempReferrerId || order.referrerId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const stationOwners = stationRefCandidates.length
        ? await this.prisma.station.findMany({
            where: { userId: { in: stationRefCandidates } },
            select: { userId: true },
          })
        : [];
      const stationOwnerIds = new Set(stationOwners.map((station) => station.userId));

      for (const order of orders) {
        const effectiveReferrerId = order.tempReferrerId || order.referrerId || "";
        const isCashChannel =
          ["STATION", "CIRCLE", "OFFLINE_STATION"].includes(order.tempRefSubjectType || "") ||
          stationOwnerIds.has(effectiveReferrerId);
        if (isCashChannel) await this.recordOrderCommissionAndFee(order);
        else await this.recordOrderPlatformFee(order);
      }
      const nextOffset = orders.length < 500 ? 0 : offset + orders.length;
      await this.redis.set(offsetKey, String(nextOffset), 48 * 60 * 60);
      if (orders.length > 0) {
        this.logger.log(
          `支付账务对账完成：复核 ${orders.length} 笔近 48 小时订单（offset=${offset}，next=${nextOffset}）`,
        );
      }
      return { checked: orders.length, nextOffset };
    });
  }

  /**
   * 订单支付成功后统一记账：分佣 + 平台费。
   * 微信/汇付回调已记，此 helper 供支付宝/银联/线下确认(adminPayOrder)复用，避免账目漏记。
   * 事务外执行，失败仅记日志不影响订单状态。
   */
  async recordOrderCommissionAndFee(order: { id: string; type: string; amount: unknown; userId?: string | null; referrerId?: string | null; tempReferrerId?: string | null }) {
    if (!this.commissionSvc) return;
    try {
      await this.commissionSvc.calculateAndRecord(
        order.id, order.type, Number(order.amount),
        order.referrerId || undefined, order.tempReferrerId || undefined,
        undefined, order.userId || undefined,
      );
    } catch (e) {
      this.logger.error("分佣计算失败", e);
    }
    await this.recordOrderPlatformFee(order);
  }

  /** 仅补平台费，不触发普通用户分享成长积分。 */
  private async recordOrderPlatformFee(order: { id: string; type: string; amount: unknown }) {
    if (!this.commissionSvc) return;
    try {
      const fee = await this.commissionSvc.calculatePlatformFee(order.type, Number(order.amount));
      if (fee) {
        await this.commissionSvc.recordPlatformFee({
          type: order.type, sourceId: order.id, sourceAmount: Number(order.amount),
          platformRate: fee.platformRate, platformFee: fee.platformFee,
        });
      }
    } catch (e) {
      this.logger.error("平台费记录失败", e);
    }
  }
}
