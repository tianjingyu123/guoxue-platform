import { Injectable, Logger, Optional } from "@nestjs/common";
import { randomInt } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { WebhookService } from "../webhook/webhook.service";
import { SystemService } from "../system/system.service";
import { MemoryCache } from "../../common/cache.util";
import { encrypt, decrypt } from "../../common/crypto.util";

const OPERATOR_MGMT_RATES: Record<string, { mgmt: number; upper: number }> = {
  SILVER: { mgmt: 0.08, upper: 0.02 },
  GOLD: { mgmt: 0.12, upper: 0.03 },
  DIAMOND: { mgmt: 0.15, upper: 0.04 },
  BLACK_GOLD: { mgmt: 0.20, upper: 0.05 },
};

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly configCache = new MemoryCache<any>(50);

  constructor(
    private prisma: PrismaService,
    private webhook: WebhookService,
    @Optional() private systemService?: SystemService,
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

    // 创建收益记录 + 更新分站总收益（原子操作）
    const earning = await this.prisma.$transaction(async (tx) => {
      const e = await tx.stationEarning.create({
        data: {
          stationId: station!.id,
          orderId,
          amount,
          rate: config.rateA,
          earned,
          type,
        },
      });

      await tx.station.update({
        where: { id: station!.id },
        data: { totalEarning: { increment: earned } },
      });

      return e;
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

    // ───────── 运营商管理奖 ─────────
    await this.calculateOperatorBonus(station.id, orderId, earned);

    return earning;
  }

  /** 退款时冲正分佣 — 逆向 station 收益 + operator 管理奖 + 平台抽成，同一事务 */
  async reverseCommission(orderId: string) {
    const [stationEarning, operatorEarnings, platformFees] = await Promise.all([
      this.prisma.stationEarning.findFirst({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.operatorEarning.findMany({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.platformFeeRecord.findMany({ where: { sourceId: orderId } }),
    ]);

    if (!stationEarning && operatorEarnings.length === 0) {
      this.logger.log(`订单 ${orderId} 无分佣记录，跳过冲正`);
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      if (stationEarning) {
        await tx.stationEarning.create({
          data: {
            stationId: stationEarning.stationId,
            orderId,
            amount: 0,
            rate: stationEarning.rate,
            earned: -stationEarning.earned,
            type: "REFUND",
          },
        });
        await tx.station.update({
          where: { id: stationEarning.stationId },
          data: { totalEarning: { decrement: stationEarning.earned } },
        });
      }

      if (operatorEarnings.length > 0) {
        await tx.operatorEarning.createMany({
          data: operatorEarnings.map((oe) => ({
            operatorId: oe.operatorId,
            orderId,
            source: oe.source,
            amount: 0,
            rate: oe.rate,
            earned: -oe.earned,
            sourceStationId: oe.sourceStationId ?? undefined,
            sourceOperatorId: oe.sourceOperatorId ?? undefined,
          })),
        });
        for (const oe of operatorEarnings) {
          await tx.operator.update({
            where: { id: oe.operatorId },
            data: { totalEarning: { decrement: oe.earned } },
          });
        }
      }

      if (platformFees.length > 0) {
        await tx.platformFeeRecord.createMany({
          data: platformFees.map((pf) => ({
            type: "REFUND",
            sourceId: orderId,
            sourceAmount: 0,
            platformRate: pf.platformRate,
            platformFee: -pf.platformFee,
            circleId: pf.circleId ?? undefined,
            circleShare: pf.circleShare ? -pf.circleShare : undefined,
          })),
        });
      }

      return { reversed: true };
    });
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

    // 并行查询余额和最低提现门槛（优先 CommissionConfig，回退 ConfigSystem）
    const [{ balance }, cfg, sysCfg] = await Promise.all([
      this.getStationBalance(stationId),
      this.prisma.commissionConfig.findUnique({ where: { configKey: "withdrawal_min" } }),
      this.systemService?.getConfig("withdrawal_min").catch(() => null),
    ]);
    if (balance < dto.amount) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `余额不足，当前可提现余额 ¥${balance.toFixed(2)}`);
    }

    const minAmount = cfg ? Number(cfg.rateA)
      : sysCfg?.configValue ? Number(sysCfg.configValue)
      : 100;
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

  // ───────── 运营商管理奖计算 ─────────

  private async calculateOperatorBonus(stationId: string, orderId: string, stationEarned: number) {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { operatorId: true },
    });
    if (!station?.operatorId) return;

    const operator = await this.prisma.operator.findUnique({
      where: { id: station.operatorId },
      select: { id: true, userId: true, level: true, parentOperatorId: true, status: true },
    });
    if (!operator || operator.status !== "ACTIVE") return;

    const rates = await this.lookupMgmtRates(operator.level);
    if (!rates) return;

    // 一级管理奖：运营商从名下站长佣金中获得管理奖
    const mgmtEarned = Math.round(stationEarned * rates.mgmt * 100) / 100;
    if (mgmtEarned > 0) {
      await this.prisma.operatorEarning.create({
        data: {
          operatorId: operator.id,
          orderId,
          source: "MGMT_BONUS",
          amount: stationEarned,
          rate: rates.mgmt,
          earned: mgmtEarned,
          sourceStationId: stationId,
        },
      });
      await this.prisma.operator.update({
        where: { id: operator.id },
        data: { totalEarning: { increment: mgmtEarned } },
      });
      this.prisma.notification.create({
        data: {
          userId: operator.userId,
          type: "EARNING",
          title: "运营商管理奖",
          content: `您获得管理奖 ¥${mgmtEarned.toFixed(2)}（站长佣金 ¥${stationEarned.toFixed(2)}×${(rates.mgmt * 100).toFixed(0)}%）`,
          targetType: "OPERATOR_EARNING",
          targetId: orderId,
        },
      }).catch((err) => this.logger.warn("管理奖通知发送失败", err));
    }

    // 二级管理奖：上级运营商从下级运营商的直推佣金中获得管理奖
    if (!operator.parentOperatorId) return;
    const parentOp = await this.prisma.operator.findUnique({
      where: { id: operator.parentOperatorId },
      select: { id: true, userId: true, level: true, status: true },
    });
    if (!parentOp || parentOp.status !== "ACTIVE") return;

    const parentRates = await this.lookupMgmtRates(parentOp.level);
    if (!parentRates) return;

    const upperEarned = Math.round(stationEarned * parentRates.upper * 100) / 100;
    if (upperEarned > 0) {
      await this.prisma.operatorEarning.create({
        data: {
          operatorId: parentOp.id,
          orderId,
          source: "UPPER_MGMT_BONUS",
          amount: stationEarned,
          rate: parentRates.upper,
          earned: upperEarned,
          sourceStationId: stationId,
          sourceOperatorId: operator.id,
        },
      });
      await this.prisma.operator.update({
        where: { id: parentOp.id },
        data: { totalEarning: { increment: upperEarned } },
      });
      this.prisma.notification.create({
        data: {
          userId: parentOp.userId,
          type: "EARNING",
          title: "上级管理奖",
          content: `您获得上级管理奖 ¥${upperEarned.toFixed(2)}（下级站长佣金 ¥${stationEarned.toFixed(2)}×${(parentRates.upper * 100).toFixed(0)}%）`,
          targetType: "OPERATOR_EARNING",
          targetId: orderId,
        },
      }).catch((err) => this.logger.warn("上级管理奖通知发送失败", err));
    }
  }

  /** 优先从 CommissionConfig 读取管理奖比例，未配置时回退到 PRD 硬编码默认值 */
  private async lookupMgmtRates(level: string): Promise<{ mgmt: number; upper: number } | null> {
    const [mgmtCfg, upperCfg] = await Promise.all([
      this.prisma.commissionConfig.findUnique({ where: { configKey: `operator_${level}` } }),
      this.prisma.commissionConfig.findUnique({ where: { configKey: `operator_upper_${level}` } }),
    ]);

    const mgmt = mgmtCfg?.rateC ? Number(mgmtCfg.rateC) : OPERATOR_MGMT_RATES[level]?.mgmt;
    const upper = upperCfg?.rateA ? Number(upperCfg.rateA) : OPERATOR_MGMT_RATES[level]?.upper;

    if (!mgmt && !upper) return null;
    return { mgmt: mgmt || 0, upper: upper || 0 };
  }

  // ───────── 运营商收益查询 ─────────

  async getOperatorEarnings(operatorId: string, page = 1, pageSize = 20) {
    const where = { operatorId };
    const [earnings, total] = await Promise.all([
      this.prisma.operatorEarning.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.operatorEarning.count({ where }),
    ]);
    const sumResult = await this.prisma.operatorEarning.aggregate({
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

  async getOperatorBalance(operatorId: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { totalEarning: true },
    });
    if (!operator) throw new BusinessException(ErrorCode.NOT_FOUND, "运营商不存在");
    return {
      totalEarned: Number(operator.totalEarning),
      balance: Number(operator.totalEarning),
    };
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
    const where: Prisma.PlatformFeeRecordWhereInput = {};
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
      code += chars[randomInt(0, chars.length)];
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
