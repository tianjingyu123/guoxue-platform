import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 分站/运营商加盟费到期治理（计费引擎 · 2026-07-13）
 *
 * 收钱链路见 shop-order.service（下单定价）+ shop-payment.service（支付后开通/续期）。
 * 本服务只管到期后的两件事：
 * - 每日 10:30：到期提醒（提前 7/3/1 天各一次 · redis 判重防重复打扰）
 * - 每日 03:30：过期停用（Station.autoSuspendOnExpiry=true 才停 · Operator 一律停）
 *
 * 「过期停用」只改 status，不删数据、不动已结算佣金——续费后由支付后处理器改回 ACTIVE 并叠加到期日。
 */
@Injectable()
export class StationBillingService {
  private readonly logger = new Logger(StationBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 到期提醒 ─────────

  @Cron("0 30 10 * * *")
  async expiryRemindCron() {
    await this.redis.runExclusive("station-billing-remind", 300, () => this.runExpiryRemind());
  }

  /** 到期提醒：提前 7/3/1 天各一次。redis 判重键含天数，保证同一档只发一次。 */
  async runExpiryRemind(): Promise<number> {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400000);
    let sent = 0;

    const [stations, operators] = await Promise.all([
      this.prisma.station.findMany({
        where: { status: "ACTIVE", expireAt: { not: null, gt: now, lte: in7d } },
        select: { id: true, userId: true, name: true, expireAt: true },
      }),
      this.prisma.operator.findMany({
        where: { status: "ACTIVE", expireAt: { not: null, gt: now, lte: in7d } },
        select: { id: true, userId: true, level: true, expireAt: true },
      }),
    ]);

    for (const s of stations) {
      if (await this.remind(s.userId, "station", s.id, s.expireAt!, `分站「${s.name}」`)) sent++;
    }
    for (const o of operators) {
      if (await this.remind(o.userId, "operator", o.id, o.expireAt!, `${o.level} 运营商资格`)) sent++;
    }

    if (sent > 0) this.logger.log(`分站/运营商到期提醒发送 ${sent} 条`);
    return sent;
  }

  /** 单条提醒（仅 7/3/1 天三档触发·redis 判重）。返回是否真的发出。 */
  private async remind(
    userId: string,
    kind: "station" | "operator",
    id: string,
    expireAt: Date,
    subject: string,
  ): Promise<boolean> {
    const daysLeft = Math.ceil((expireAt.getTime() - Date.now()) / 86400000);
    if (![7, 3, 1].includes(daysLeft)) return false;

    const dedupeKey = `station:expiry-remind:${kind}:${id}:${daysLeft}`;
    const fresh = await this.redis.setNX(dedupeKey, "1", 2 * 86400);
    if (!fresh) return false;

    await this.prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: `${subject}即将到期`,
        content: `你的${subject}将于 ${daysLeft} 天后到期。到期后将暂停服务，续费即可恢复（已有佣金收益不受影响）。`,
      },
    });
    return true;
  }

  // ───────── 过期停用 ─────────

  @Cron("0 30 3 * * *")
  async suspendExpiredCron() {
    await this.redis.runExclusive("station-billing-suspend", 300, () => this.runSuspendExpired());
  }

  /**
   * 过期停用：只改 status，不删数据、不动佣金。
   * 分站尊重 autoSuspendOnExpiry 开关（默认 true）；关掉的分站过期也不停（供白名单/战略客户豁免）。
   */
  async runSuspendExpired(): Promise<{ stations: number; operators: number }> {
    const now = new Date();

    const [stations, operators] = await Promise.all([
      this.prisma.station.updateMany({
        where: { status: "ACTIVE", autoSuspendOnExpiry: true, expireAt: { not: null, lt: now } },
        data: { status: "EXPIRED" },
      }),
      this.prisma.operator.updateMany({
        where: { status: "ACTIVE", expireAt: { not: null, lt: now } },
        data: { status: "EXPIRED" },
      }),
    ]);

    if (stations.count > 0 || operators.count > 0) {
      this.logger.log(`加盟费过期停用：分站 ${stations.count} 个、运营商 ${operators.count} 个`);
    }
    return { stations: stations.count, operators: operators.count };
  }
}
