import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "@guoxue/shared";

/**
 * 书院会员权益服务（C1 会员产品化 · 2026-07-03）
 *
 * 权益①的门控中枢：AI 伴读/白话对照/查词/AI 问答对免费用户每日限次，会员不限量。
 * 计数走 redis（多实例安全），key 按自然日滚动；redis 不可用时 RedisService 内存兜底（单实例语义可接受）。
 */
/** 一次 AI 扣次的凭据：key 为当日计数键（会员不计数则无） */
export interface AiQuotaTicket {
  isMember: boolean;
  remaining: number;
  key?: string;
  refunded?: boolean;
}

@Injectable()
export class MemberBenefitService {
  private readonly logger = new Logger(MemberBenefitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 免费用户 AI 每日次数上限（伴读/白话对照/查词/问答合并计数），env 可调 */
  get dailyFreeLimit(): number {
    const n = Number(process.env.AI_DAILY_FREE_LIMIT);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
  }

  /** 统一会员有效性判定（收口各模块散装实现） */
  async isActiveMember(userId?: string | null): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user || user.memberLevel === "NONE") return false;
    return !user.memberExpire || user.memberExpire > new Date();
  }

  private quotaKey(userId: string): string {
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `aiq:${userId}:${day}`;
  }

  /**
   * 消耗一次 AI 额度：会员直接放行；免费用户按日计数，超限抛 RATE_LIMITED 引导开通会员。
   * 计次口径（决策人 2026-09-21）：复用已有结果也计次；**生成失败必须退回**（见 refundAiQuota / runWithAiQuota）；
   * 超限被拒的请求不计数（计数当场回退）。
   * 返回的凭据带当日计数键，退回时按同一个键扣回，跨零点也不会退到别的日期。
   */
  async consumeAiQuota(userId: string): Promise<AiQuotaTicket> {
    if (await this.isActiveMember(userId)) {
      return { isMember: true, remaining: -1 };
    }
    const limit = this.dailyFreeLimit;
    const key = this.quotaKey(userId);
    // TTL 26h：跨零点自然过期即可，key 含日期不会串日
    const { count } = await this.redis.incrWithTtl(key, 26 * 3600);
    if (count > limit) {
      await this.decrementFloor(key);
      throw new BusinessException(
        ErrorCode.RATE_LIMITED,
        `今日 ${limit} 次免费 AI 伴读已用完，开通书院会员即可不限量畅用`,
      );
    }
    return { isMember: false, remaining: Math.max(0, limit - count), key };
  }

  /** 退回一次 AI 额度（生成失败时调用）。同一凭据只退一次；会员凭据无计数，直接忽略 */
  async refundAiQuota(ticket: AiQuotaTicket): Promise<void> {
    if (!ticket.key || ticket.refunded) return;
    ticket.refunded = true;
    try {
      await this.decrementFloor(ticket.key);
    } catch (error: any) {
      this.logger.warn(`AI 次数退回失败：${error?.message || error}`);
    }
  }

  /**
   * 扣次 → 生成 → 失败退回。
   * 失败包括：抛异常；或 failed(result) 为真（服务内部吞掉错误、返回了兜底文案的情况）。
   * 兜底结果照常返回给用户，只是不计次。
   */
  async runWithAiQuota<T>(userId: string, fn: () => Promise<T>, failed?: (result: T) => boolean): Promise<T> {
    const ticket = await this.consumeAiQuota(userId);
    let result: T;
    try {
      result = await fn();
    } catch (error) {
      await this.refundAiQuota(ticket);
      throw error;
    }
    if (failed?.(result)) await this.refundAiQuota(ticket);
    return result;
  }

  /**
   * 流式生成的计次守卫：流中途出错、或整段没有产出任何文字 → 退回。
   * 用户主动断开（消费方提前结束迭代）且已有产出的，按已生成计次。
   */
  async *guardAiStream<T>(ticket: AiQuotaTicket, source: AsyncIterable<T>): AsyncIterable<T> {
    let produced = false;
    let errored = false;
    try {
      for await (const chunk of source) {
        if (typeof chunk === "string" ? chunk.trim().length > 0 : chunk != null) produced = true;
        yield chunk;
      }
    } catch (error) {
      errored = true;
      throw error;
    } finally {
      if (errored || !produced) await this.refundAiQuota(ticket);
    }
  }

  /** 计数减一，不减到负数（带同样的 26h TTL，键已过期时不会留下无过期的孤键） */
  private async decrementFloor(key: string): Promise<void> {
    const v = await this.redis.incrBy(key, -1, 26 * 3600);
    if (v < 0) await this.redis.incrBy(key, -v, 26 * 3600);
  }

  /** AI 额度查询（前端额度提示） */
  async getAiQuota(userId: string) {
    const isMember = await this.isActiveMember(userId);
    const limit = this.dailyFreeLimit;
    if (isMember) {
      return { isMember: true, dailyLimit: -1, usedToday: 0, remaining: -1 };
    }
    const raw = await this.redis.get(this.quotaKey(userId));
    const used = Math.max(0, Number(raw) || 0);
    return {
      isMember: false,
      dailyLimit: limit,
      usedToday: Math.min(used, limit),
      remaining: Math.max(0, limit - used),
    };
  }

  /**
   * 发放某用户当月会员权益（积分+优惠券）。幂等：同 source（member_monthly_YYYYMM）已有积分流水则跳过。
   * tx 可选：购买开通场景传支付事务原子发首月；月度 cron 场景不传（逐用户独立提交，单个失败不拖全批）。
   */
  async grantMonthlyBenefits(userId: string, level: string, tx?: any): Promise<boolean> {
    const db = tx ?? this.prisma;
    const now = new Date();
    const source = `member_monthly_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const config = await db.memberConfig.findUnique({ where: { level } });
    if (!config) return false;

    const already = await db.pointsRecord.findFirst({
      where: { userId, source, type: "EARN" },
      select: { id: true },
    });
    if (already) return false;

    if (config.monthlyPoints > 0) {
      await db.userPoints.upsert({
        where: { userId },
        update: { balance: { increment: config.monthlyPoints }, totalEarned: { increment: config.monthlyPoints } },
        create: { userId, balance: config.monthlyPoints, totalEarned: config.monthlyPoints },
      });
      await db.pointsRecord.create({
        data: { userId, amount: config.monthlyPoints, type: "EARN", source, description: `${config.name}每月赠积分` },
      });
    }

    if (config.monthlyCouponId) {
      const template = await db.couponTemplate.findUnique({ where: { id: config.monthlyCouponId } });
      if (template && (template.totalCount <= 0 || template.claimedCount < template.totalCount)) {
        await db.couponTemplate.update({
          where: { id: config.monthlyCouponId },
          data: { claimedCount: { increment: 1 } },
        });
        await db.couponRecord.create({
          data: { couponId: config.monthlyCouponId, userId, status: "UNUSED" },
        });
      } else {
        this.logger.warn(`会员月度赠券跳过：券模板 ${config.monthlyCouponId} 不存在或已发完`);
      }
    }

    return true;
  }
}
