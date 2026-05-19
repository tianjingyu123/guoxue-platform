import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { MemoryCache } from "../../common/cache.util";
import { encrypt, decrypt } from "../../common/crypto.util";

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly configCache = new MemoryCache<any>(50);

  constructor(
    private prisma: PrismaService,
    private webhook: WebhookService,
  ) {}

  // ───────── 佣金配置管理 ─────────

  async getAllConfigs() {
    const cached = this.configCache.get("all");
    if (cached) return cached;
    const configs = await this.prisma.commissionConfig.findMany();
    this.configCache.set("all", configs, 300_000);
    return configs;
  }

  async updateConfig(key: string, dto: { rateA?: number; rateB?: number; rateC?: number; description?: string }) {
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    const updated = await this.prisma.commissionConfig.update({
      where: { configKey: key },
      data: {
        ...(dto.rateA !== undefined && { rateA: dto.rateA }),
        ...(dto.rateB !== undefined && { rateB: dto.rateB }),
        ...(dto.rateC !== undefined && { rateC: dto.rateC }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
    this.configCache.delete("all");
    return updated;
  }

  // ───────── 佣金计算核心 ─────────

  /**
   * 根据订单类型和金额计算佣金
   * 返回 StationEarning 创建所需数据
   */
  async calculateAndRecord(
    orderId: string,
    type: string, // COURSE, PRODUCT, MEMBER, CIRCLE, BOT
    amount: number,
    referrerId?: string,
    tempReferrerId?: string,
    stationId?: string,
  ) {
    // 确定配置key
    const configKey = this.mapTypeToConfigKey(type);
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey } });
    if (!config) return null; // 未配置则不计算

    const effectiveReferrerId = tempReferrerId || referrerId;
    if (!effectiveReferrerId) return null;

    // 查找推荐人的分站
    const station = stationId
      ? await this.prisma.station.findUnique({ where: { id: stationId } })
      : await this.prisma.station.findUnique({ where: { userId: effectiveReferrerId } });

    if (!station) return null;

    const rate = Number(config.rateA); // 站长佣金比例
    const earned = amount * rate;

    // 创建收益记录
    const earning = await this.prisma.stationEarning.create({
      data: {
        stationId: station.id,
        orderId,
        amount,
        rate: config.rateA,
        earned,
        type,
      },
    });

    // 更新分站总收益
    await this.prisma.station.update({
      where: { id: station.id },
      data: { totalEarning: { increment: earned } },
    });

    // 发送收益通知（fire-and-forget，不阻塞主流程）
    this.prisma.notification.create({
      data: {
        userId: station.userId,
        type: "EARNING",
        title: "新的推广收益",
        content: `您获得一笔 ${type} 推广佣金 ¥${earned.toFixed(2)}（订单金额 ¥${amount}，比例 ${(rate * 100).toFixed(1)}%）`,
        targetType: type,
        targetId: orderId,
      },
    }).catch((err) => this.logger.warn("收益通知发送失败", err));

    return earning;
  }

  // ───────── 分站收益查询 ─────────

  async getStationEarnings(stationId: string, page = 1, pageSize = 20) {
    const where = { stationId };
    const [earnings, total] = await Promise.all([
      this.prisma.stationEarning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationEarning.count({ where }),
    ]);
    // 计算累计收益
    const sumResult = await this.prisma.stationEarning.aggregate({
      where,
      _sum: { earned: true },
    });
    return {
      earnings,
      total,
      page,
      pageSize,
      totalEarned: sumResult._sum.earned || 0,
    };
  }

  async getStationBalance(stationId: string) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { totalEarning: true },
    });
    if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在");

    // 计算已提现金额
    const withdrawn = await this.prisma.withdrawal.aggregate({
      where: { stationId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    });

    const totalEarned = Number(station.totalEarning);
    const totalWithdrawn = Number(withdrawn._sum.amount || 0);
    return {
      totalEarned,
      totalWithdrawn,
      balance: totalEarned - totalWithdrawn,
    };
  }

  // ───────── 提现管理 ─────────

  async applyWithdrawal(userId: string, dto: {
    amount: number;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
    alipayAccount?: string;
    stationId?: string;
  }) {
    // 查找分站
    let stationId = dto.stationId;
    if (stationId) {
      // 校验指定分站的所有权
      const owned = await this.prisma.station.findUnique({
        where: { id: stationId, userId },
      });
      if (!owned) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该分站");
    } else {
      const station = await this.prisma.station.findUnique({ where: { userId } });
      if (!station) throw new BusinessException(ErrorCode.BAD_REQUEST, "您还没有分站，无法提现");
      stationId = station.id;
    }

    // 并行查询余额和最低提现门槛
    const [{ balance }, cfg] = await Promise.all([
      this.getStationBalance(stationId),
      this.prisma.commissionConfig.findUnique({ where: { configKey: "withdrawal_min" } }),
    ]);
    if (balance < dto.amount) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `余额不足，当前可提现余额 ¥${balance.toFixed(2)}`);
    }

    const minAmount = cfg ? Number(cfg.rateA) : 100;
    if (dto.amount < minAmount) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `最低提现金额为 ¥${minAmount}`);
    }

    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        userId,
        stationId,
        amount: dto.amount,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount ? encrypt(dto.bankAccount) : null,
        bankHolder: dto.bankHolder ? encrypt(dto.bankHolder) : null,
        alipayAccount: dto.alipayAccount ? encrypt(dto.alipayAccount) : null,
        status: "PENDING",
      },
    });

    this.webhook.fire("WITHDRAWAL_REQUESTED", {
      withdrawalId: withdrawal.id,
      userId,
      stationId,
      amount: dto.amount,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));

    return withdrawal;
  }

  async listWithdrawals(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status } : {};
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          station: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    // 解密敏感金融字段
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? decrypt(w.bankAccount) : null,
      bankHolder: w.bankHolder ? decrypt(w.bankHolder) : null,
      alipayAccount: w.alipayAccount ? decrypt(w.alipayAccount) : null,
    }));
    return { withdrawals: decoded, total, page, pageSize };
  }

  async auditWithdrawal(id: string, dto: { status: string; remark?: string }) {
    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现记录不存在");
    if (w.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该记录已处理");

    return this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: dto.status,
        remark: dto.remark,
        processedAt: new Date(),
      },
    });
  }

  async getUserWithdrawals(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    // 解密敏感金融字段
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? decrypt(w.bankAccount) : null,
      bankHolder: w.bankHolder ? decrypt(w.bankHolder) : null,
      alipayAccount: w.alipayAccount ? decrypt(w.alipayAccount) : null,
    }));
    return { withdrawals: decoded, total, page, pageSize };
  }

  // ───────── 推荐链接 ─────────

  async createReferralLink(userId: string, dto: { targetType: string; targetId: string; channel?: string }) {
    // 生成短码
    const code = this.generateCode();
    return this.prisma.referralLink.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        code,
        channel: dto.channel || "DIRECT",
      },
    });
  }

  async getReferralLinks(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [links, total] = await Promise.all([
      this.prisma.referralLink.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.referralLink.count({ where }),
    ]);
    return { links, total, page, pageSize };
  }

  async trackClick(code: string) {
    const link = await this.prisma.referralLink.findUnique({ where: { code } });
    if (!link) return null;
    await this.prisma.referralLink.update({
      where: { code },
      data: { clickCount: { increment: 1 } },
    });
    return { referrerId: link.userId, targetType: link.targetType, targetId: link.targetId };
  }

  // ───────── 辅助方法 ─────────

  // ═══════════════════════════════════════════
  // 平台抽成（平台从每笔交易中抽取的费用）
  // ═══════════════════════════════════════════

  /**
   * 计算平台抽成
   * @returns { platformFee, platformRate } 或 null（未配置时）
   */
  async calculatePlatformFee(type: string, amount: number): Promise<{ platformFee: number; platformRate: number } | null> {
    const config = await this.prisma.commissionConfig.findUnique({
      where: { configKey: type },
    });
    if (!config) return null;

    const rate = Number(config.rateB); // rateB = 平台抽成比例
    if (rate <= 0) return null;

    return {
      platformFee: Math.round(amount * rate * 100) / 100,
      platformRate: rate,
    };
  }

  /** 记录平台抽成 */
  async recordPlatformFee(params: {
    type: string;
    sourceId: string;
    sourceAmount: number;
    platformRate: number;
    platformFee: number;
    circleId?: string;
    circleShare?: number;
  }) {
    return this.prisma.platformFeeRecord.create({
      data: {
        type: params.type,
        sourceId: params.sourceId,
        sourceAmount: params.sourceAmount,
        platformRate: params.platformRate,
        platformFee: params.platformFee,
        circleId: params.circleId,
        circleShare: params.circleShare,
      },
    });
  }

  /** 获取平台抽成汇总 */
  async getPlatformFeeSummary(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, byType] = await Promise.all([
      this.prisma.platformFeeRecord.aggregate({
        where,
        _sum: { platformFee: true, sourceAmount: true },
        _count: true,
      }),
      this.prisma.platformFeeRecord.groupBy({
        by: ["type"],
        where,
        _sum: { platformFee: true },
      }),
    ]);

    return {
      totalRecords: total._count,
      totalAmount: total._sum.sourceAmount || 0,
      totalPlatformFee: total._sum.platformFee || 0,
      byType: byType.map((b) => ({
        type: b.type,
        platformFee: b._sum.platformFee || 0,
      })),
    };
  }

  // ═══════════════════════════════════════════
  // 圈主收益
  // ═══════════════════════════════════════════

  /**
   * 计算并记录圈主收益
   * @param circleId 圈子ID
   * @param type 收入类型
   * @param sourceId 来源记录ID
   * @param amount 原始金额
   */
  async recordCircleRevenue(
    circleId: string,
    type: string,
    sourceId: string,
    amount: number,
  ) {
    // 计算平台抽成
    const fee = await this.calculatePlatformFee(type, amount);
    const platformFee = fee?.platformFee || 0;

    // 圈主分成 = 金额 - 平台抽成
    const ownerShare = amount - platformFee;
    const splitRate = amount > 0 ? ownerShare / amount : 0;

    const [record] = await Promise.all([
      this.prisma.circleRevenueRecord.create({
        data: {
          circleId,
          type,
          sourceId,
          amount,
          platformFee,
          ownerShare: Math.round(ownerShare * 100) / 100,
          splitRate: Math.round(splitRate * 10000) / 10000,
        },
      }),
      // 同时记录平台抽成
      fee
        ? this.recordPlatformFee({
            type,
            sourceId,
            sourceAmount: amount,
            platformRate: fee.platformRate,
            platformFee: fee.platformFee,
            circleId,
            circleShare: Math.round(ownerShare * 100) / 100,
          })
        : Promise.resolve(),
    ]);

    return record;
  }

  /** 获取圈主收益汇总 */
  async getCircleRevenueSummary(circleId: string) {
    const [total, settled, byType] = await Promise.all([
      this.prisma.circleRevenueRecord.aggregate({
        where: { circleId },
        _sum: { amount: true, platformFee: true, ownerShare: true },
        _count: true,
      }),
      this.prisma.circleRevenueRecord.aggregate({
        where: { circleId, settled: true },
        _sum: { ownerShare: true },
      }),
      this.prisma.circleRevenueRecord.groupBy({
        by: ["type"],
        where: { circleId },
        _sum: { amount: true, ownerShare: true },
      }),
    ]);

    return {
      totalRecords: total._count,
      totalAmount: total._sum.amount || 0,
      totalPlatformFee: total._sum.platformFee || 0,
      totalOwnerShare: total._sum.ownerShare || 0,
      settledAmount: settled._sum.ownerShare || 0,
      byType: byType.map((b) => ({
        type: b.type,
        amount: b._sum.amount || 0,
        ownerShare: b._sum.ownerShare || 0,
      })),
    };
  }

  /** 获取圈主收益明细 */
  async getCircleRevenueRecords(circleId: string, page = 1, pageSize = 20) {
    const where = { circleId };
    const [records, total] = await Promise.all([
      this.prisma.circleRevenueRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.circleRevenueRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  private mapTypeToConfigKey(type: string): string {
    const map: Record<string, string> = {
      COURSE: "course_basic",
      PRODUCT: "product_platform",
      MEMBER: "station_member",
      CIRCLE_JOIN: "circle_join",
      BOT: "bot_call",
      MERCHANT_PRODUCT: "merchant_product",
    };
    return map[type] || "product_platform";
  }

  private generateCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // ───────── 新增：分佣配置快捷管理 ─────────

  async getCommissionConfig() {
    const configs = await this.prisma.commissionConfig.findMany();
    const result: Record<string, any> = {};
    for (const cfg of configs) {
      result[cfg.configKey] = {
        rateA: Number(cfg.rateA),
        rateB: Number(cfg.rateB),
        rateC: cfg.rateC ? Number(cfg.rateC) : null,
        configName: cfg.configName,
        description: cfg.description,
      };
    }
    return result;
  }

  async updateCommissionConfig(type: string, rate: number) {
    let config = await this.prisma.commissionConfig.findUnique({ where: { configKey: type } });
    if (!config) {
      config = await this.prisma.commissionConfig.create({
        data: {
          configKey: type,
          configName: type,
          rateA: rate,
          rateB: 0,
        },
      });
    } else {
      config = await this.prisma.commissionConfig.update({
        where: { configKey: type },
        data: { rateA: rate },
      });
    }

    // 保存变更记录到 ConfigVersion
    await this.prisma.configVersion.create({
      data: {
        configKey: `commission_config_${type}`,
        value: { rate },
        version: 1,
        comment: `更新 ${type} 分佣比例为 ${rate}`,
      },
    });

    this.logger.log(`分佣配置已更新: ${type} = ${rate}`);
    return config;
  }
}
