import { Injectable, Logger, Optional } from "@nestjs/common";
import { randomInt } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { WebhookService } from "../webhook/webhook.service";
import { SystemService } from "../system/system.service";
import { MemoryCache } from "../../common/cache.util";
import { encrypt, decrypt, maskBankCard, maskName, maskAlipay } from "../../common/crypto.util";
import { RedisService } from "../../redis/redis.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";
import { SettlementService } from "../settlement/settlement.service";

/** 提现上限（元），与钱包提现口径一致 */
const MAX_WITHDRAW_RMB = 50000;
/** 计算可提现余额时视为"占用额度"的提现状态（PENDING 也占额度，防重复提现；REJECTED 自动释放） */
const OCCUPYING_WITHDRAW_STATUSES = ["PENDING", "APPROVED", "PAID"];

const OPERATOR_MGMT_RATES: Record<string, { mgmt: number }> = {
  SILVER: { mgmt: 0.08 },
  GOLD: { mgmt: 0.12 },
  DIAMOND: { mgmt: 0.15 },
  BLACK_GOLD: { mgmt: 0.20 },
};

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly configCache = new MemoryCache<any>(50);

  constructor(
    private prisma: PrismaService,
    private webhook: WebhookService,
    private redis: RedisService,
    @Optional() private systemService?: SystemService,
    @Optional() private fundApproval?: FundApprovalService,
    @Optional() private settlement?: SettlementService,
  ) {}

  // ───────── 分佣比例变更审批（发起端，不立即生效） ─────────

  /**
   * 发起「分佣比例变更」审批（PUT /commission/configs/:key 走此入口）。
   * 审批通过后由 FundApprovalExecutor 调用 updateConfig 真正变更。
   */
  async requestConfigChange(
    key: string,
    dto: { rateA?: number; rateB?: number; rateC?: number; description?: string },
    requestedBy: string,
  ) {
    const config = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "配置不存在");
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    const parts: string[] = [];
    if (dto.rateA !== undefined) parts.push(`A=${dto.rateA}`);
    if (dto.rateB !== undefined) parts.push(`B=${dto.rateB}`);
    if (dto.rateC !== undefined) parts.push(`C=${dto.rateC}`);
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "updateConfig", key, dto },
      amount: null,
      summary: `分佣比例变更 [${key}] ${parts.join(" ") || "(说明)"}`,
      requestedBy,
    });
  }

  /**
   * 发起「分佣比例变更」审批（PUT /commission/config，单一 rate 形态）。
   * 审批通过后调用 updateCommissionConfig 真正变更。
   */
  async requestRateChange(type: string, rate: number, requestedBy: string) {
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "COMMISSION_CONFIG",
      payload: { method: "updateCommissionConfig", type, rate },
      amount: null,
      summary: `分佣比例变更 [${type}] → ${rate}`,
      requestedBy,
    });
  }

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
    payerId?: string, // 付款人（统一总账自买自卖校验用；缺省时回查 Order）
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

    // 站长自购不产生佣金（2026-07-02 拍板：自购已在下单时直接立减·此处防御性拦截历史/旁路订单）
    let effectivePayerId = payerId;
    if (!effectivePayerId) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
        effectivePayerId = order?.userId ?? "";
      } catch {
        effectivePayerId = "";
      }
    }
    if (effectivePayerId && effectivePayerId === station.userId) {
      this.logger.log(`订单 ${orderId} 为站长自购，不产生佣金`);
      return null;
    }

    const rate = Number(config.rateA); // 站长佣金比例
    // 规整到分（四舍五入），与本文件管理奖/平台抽成一致，避免 JS 浮点尾数（如 99.9*0.7）污染分账与累加
    const earned = Math.round(amount * rate * 100) / 100;

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
    const bonus = await this.calculateOperatorBonus(station.id, orderId, earned);

    // ───────── T1-P2b 统一总账影子双写（不影响现有资金路径，失败仅记日志）─────────
    // 过渡期比例以本方法实际使用值 rateOverride 传入，保证总账与实付一致；P2-c 切换后以 SettlementRule 为真源
    if (this.settlement) {
      try {
        await this.settlement.settle({
          scene: this.mapTypeToScene(type),
          refType: "ORDER",
          refId: orderId,
          amount,
          payerId: effectivePayerId,
          parties: {
            STATION: { type: "STATION", id: station.id, userId: station.userId, rateOverride: rate },
            ...(bonus
              ? { OPERATOR: { type: "OPERATOR", id: bonus.operatorId, userId: bonus.userId, rateOverride: bonus.rate } }
              : {}),
          },
        });
      } catch (e) {
        this.logger.warn(`统一总账影子双写失败(order=${orderId})`, e);
      }
    }

    return earning;
  }

  /** 退款时冲正分佣 — 逆向 station 收益 + operator 管理奖 + 平台抽成，同一事务 */
  async reverseCommission(orderId: string) {
    // 幂等守卫：已存在冲正记录(earned<0)则跳过——防 fire-and-forget 重投 / 退款回调重投 / 重复倒扣为负
    const alreadyReversed =
      (await this.prisma.stationEarning.findFirst({ where: { orderId, earned: { lt: 0 } } })) ??
      (await this.prisma.operatorEarning.findFirst({ where: { orderId, earned: { lt: 0 } } }));
    if (alreadyReversed) {
      this.logger.log(`订单 ${orderId} 已冲正，跳过重复冲正`);
      return null;
    }

    const [stationEarning, operatorEarnings, platformFees] = await Promise.all([
      this.prisma.stationEarning.findFirst({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.operatorEarning.findMany({ where: { orderId, earned: { gt: 0 } } }),
      this.prisma.platformFeeRecord.findMany({ where: { sourceId: orderId } }),
    ]);

    if (!stationEarning && operatorEarnings.length === 0) {
      this.logger.log(`订单 ${orderId} 无分佣记录，跳过冲正`);
      return null;
    }

    const result = await this.prisma.$transaction(async (tx) => {
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

    // T1-P2b 统一总账同步冲正（幂等，失败仅记日志不阻断退款）
    this.settlement
      ?.reverse("ORDER", orderId, "订单退款冲正")
      .catch((e) => this.logger.warn(`统一总账冲正失败(order=${orderId})`, e));

    return result;
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

    // 计算已占用额度（PENDING/APPROVED/PAID 均占用，防止 PENDING 不计导致的重复提现）
    const withdrawn = await this.prisma.withdrawal.aggregate({
      where: { stationId, status: { in: OCCUPYING_WITHDRAW_STATUSES } },
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
    // 金额基本合法性校验（防御纵深，DTO 已校验正数/上限）
    if (!dto.amount || dto.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现金额必须大于0");
    }
    if (dto.amount > MAX_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `单次提现金额不可超过 ¥${MAX_WITHDRAW_RMB}`);
    }

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

    // Redis 锁串行化同一分站的提现申请，防止并发绕过余额校验（重复提现套现）
    const lockKey = `withdraw:lock:station:${stationId}`;
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现处理中，请稍后再试");
    }
    try {
      // 锁内复核余额（getStationBalance 已把 PENDING 计入占用额度）
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
    } finally {
      await this.redis.del(lockKey);
    }
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
    // 金融敏感字段解密后脱敏返回（银行卡只留后4位、持卡人保留姓氏、支付宝中段掩码），
    // 防管理端/用户端批量泄露完整卡号。管理员打款若需完整卡号应走独立的解密+审计接口。
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? maskBankCard(decrypt(w.bankAccount)) : null,
      bankHolder: w.bankHolder ? maskName(decrypt(w.bankHolder)) : null,
      alipayAccount: w.alipayAccount ? maskAlipay(decrypt(w.alipayAccount)) : null,
    }));
    return { withdrawals: decoded, total, page, pageSize };
  }

  async auditWithdrawal(id: string, dto: { status: string; remark?: string }, reviewerId: string) {
    const w = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!w) throw new BusinessException(ErrorCode.NOT_FOUND, "提现记录不存在");
    // 防自审自批：受益人不得审核自己的提现申请
    if (w.userId === reviewerId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审核自己的提现申请");
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
    // 金融敏感字段解密后脱敏返回（银行卡只留后4位、持卡人保留姓氏、支付宝中段掩码），
    // 防管理端/用户端批量泄露完整卡号。管理员打款若需完整卡号应走独立的解密+审计接口。
    const decoded = withdrawals.map(w => ({
      ...w,
      bankAccount: w.bankAccount ? maskBankCard(decrypt(w.bankAccount)) : null,
      bankHolder: w.bankHolder ? maskName(decrypt(w.bankHolder)) : null,
      alipayAccount: w.alipayAccount ? maskAlipay(decrypt(w.alipayAccount)) : null,
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

  /**
   * 计酬合规硬约束（《禁止传销条例》）：单笔订单的推广计酬不得超过两级 ——
   * ① 站长推广佣金（StationEarning）② 本方法产生的唯一一笔管理奖（MGMT_BONUS）。
   * 运营商自营分站（站长即运营商本人）的管理奖归其上级运营商：上级只对下级的
   * 「站长角色收入」计酬，不得对下级的管理奖收入再计酬，禁止任何形式的第三层计酬。
   */
  private async calculateOperatorBonus(
    stationId: string,
    orderId: string,
    stationEarned: number,
  ): Promise<{ operatorId: string; userId: string; rate: number; earned: number } | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { userId: true, operatorId: true },
    });
    if (!station?.operatorId) return null;

    const operator = await this.prisma.operator.findUnique({
      where: { id: station.operatorId },
      select: { id: true, userId: true, level: true, parentOperatorId: true, status: true },
    });
    if (!operator || operator.status !== "ACTIVE") return null;

    // 确定管理奖唯一受益人：自营分站上浮给上级运营商，普通分站归属其运营商
    let beneficiary = operator;
    if (operator.userId === station.userId) {
      if (!operator.parentOperatorId) return null; // 顶级运营商自营分站：无管理奖，平台留存
      const parentOp = await this.prisma.operator.findUnique({
        where: { id: operator.parentOperatorId },
        select: { id: true, userId: true, level: true, parentOperatorId: true, status: true },
      });
      if (!parentOp || parentOp.status !== "ACTIVE") return null;
      beneficiary = parentOp;
    }

    const rates = await this.lookupMgmtRates(beneficiary.level);
    if (!rates) return null;

    const mgmtEarned = Math.round(stationEarned * rates.mgmt * 100) / 100;
    if (mgmtEarned <= 0) return null;

    await this.prisma.operatorEarning.create({
      data: {
        operatorId: beneficiary.id,
        orderId,
        source: "MGMT_BONUS",
        amount: stationEarned,
        rate: rates.mgmt,
        earned: mgmtEarned,
        sourceStationId: stationId,
        // 自营分站上浮时记录下级运营商，供审计追溯
        sourceOperatorId: beneficiary.id !== operator.id ? operator.id : undefined,
      },
    });
    await this.prisma.operator.update({
      where: { id: beneficiary.id },
      data: { totalEarning: { increment: mgmtEarned } },
    });
    this.prisma.notification.create({
      data: {
        userId: beneficiary.userId,
        type: "EARNING",
        title: "运营商管理奖",
        content: `您获得管理奖 ¥${mgmtEarned.toFixed(2)}（站长佣金 ¥${stationEarned.toFixed(2)}×${(rates.mgmt * 100).toFixed(0)}%）`,
        targetType: "OPERATOR_EARNING",
        targetId: orderId,
      },
    }).catch((err) => this.logger.warn("管理奖通知发送失败", err));

    return { operatorId: beneficiary.id, userId: beneficiary.userId, rate: rates.mgmt, earned: mgmtEarned };
  }

  /** 站长佣金比例（rateA）按订单类型查询（供下单自购立减复用）；未配置返回 null */
  async getStationRate(type: string): Promise<number | null> {
    const config = await this.prisma.commissionConfig.findUnique({
      where: { configKey: this.mapTypeToConfigKey(type) },
    });
    const rate = config ? Number(config.rateA) : 0;
    return rate > 0 && rate < 1 ? rate : null;
  }

  /** 订单类型 → 统一结算引擎场景 */
  private mapTypeToScene(type: string): string {
    const map: Record<string, string> = {
      COURSE: "COURSE_ORDER",
      PRODUCT: "PRODUCT_ORDER",
      MEMBER: "MEMBER_PURCHASE",
      CIRCLE_JOIN: "CIRCLE_JOIN",
      BOT: "BOT_CALL",
      MERCHANT_PRODUCT: "MERCHANT_PRODUCT_ORDER",
    };
    return map[type] || "PRODUCT_ORDER";
  }

  /** 优先从 CommissionConfig 读取管理奖比例，未配置时回退到 PRD 硬编码默认值 */
  private async lookupMgmtRates(level: string): Promise<{ mgmt: number } | null> {
    const mgmtCfg = await this.prisma.commissionConfig.findUnique({ where: { configKey: `operator_${level}` } });
    const mgmt = mgmtCfg?.rateC ? Number(mgmtCfg.rateC) : OPERATOR_MGMT_RATES[level]?.mgmt;
    if (!mgmt) return null;
    return { mgmt };
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
