import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";

/**
 * 直播画质分档商业化（C5）—— 时长包购买 / 额度核销。
 *
 * 定价（用户拍板·1元=10国学币）：
 *   高清 720p：128元(1280币)/10时(600分)、328元(3280币)/30时(1800分)
 *   超清 1080p：258元(2580币)/10时、698元(6980币)/30时
 *
 * 资金安全：购买走 CoinService.spend 原子 CAS 扣币 + 增额度 + 记流水（单事务·不钱货两空）；
 * 核销走额度账户 updateMany 原子扣减（gte 防超额），额度不足由调用方降级 basic。
 */
@Injectable()
export class LiveQualityService {
  private readonly logger = new Logger(LiveQualityService.name);

  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
  ) {}

  /** 上架时长包列表（按档位 + 排序） */
  async listPackages() {
    return this.prisma.liveQualityPackage.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ quality: "asc" }, { sortOrder: "asc" }],
    });
  }

  /** 主播画质额度（账户不存在则视为 0） */
  async getQuota(userId: string) {
    const acc = await this.prisma.liveQuotaAccount.findUnique({ where: { userId } });
    return { hdMinutes: acc?.hdMinutes ?? 0, uhdMinutes: acc?.uhdMinutes ?? 0 };
  }

  /**
   * 购买时长包：原子扣国学币 + 增对应档额度 + 记购买流水（单事务）。
   * 余额不足由 CoinService.spend 抛 COIN_BALANCE_INSUFFICIENT。
   */
  async purchasePackage(userId: string, packageId: string) {
    const pkg = await this.prisma.liveQualityPackage.findUnique({ where: { id: packageId } });
    if (!pkg || pkg.status !== "ACTIVE") throw new BusinessException(ErrorCode.NOT_FOUND, "时长包不存在或已下架");

    const field = pkg.quality === "uhd" ? "uhdMinutes" : "hdMinutes";

    const acc = await this.prisma.$transaction(async (tx) => {
      // 扣币（原子 CAS·合并到本事务，扣款失败即整体回滚）
      await this.coin.spend(
        userId,
        { amountCoin: pkg.priceCoin, scene: "LIVE_QUALITY_PACKAGE", refId: pkg.id, description: `购买${pkg.name}` },
        tx,
      );
      // 增额度（首购自动建账户）
      await tx.liveQuotaAccount.upsert({
        where: { userId },
        create: { userId, [field]: pkg.minutes },
        update: { [field]: { increment: pkg.minutes } },
      });
      // 购买流水
      await tx.liveQuotaRecord.create({
        data: { userId, type: "PURCHASE", quality: pkg.quality, minutes: pkg.minutes, costCoin: pkg.priceCoin, packageId: pkg.id },
      });
      return tx.liveQuotaAccount.findUnique({ where: { userId } });
    });

    return { hdMinutes: acc?.hdMinutes ?? 0, uhdMinutes: acc?.uhdMinutes ?? 0 };
  }

  /**
   * 核销画质额度（开播/转码计费调用）。
   * basic 档不计费直接放行；hd/uhd 档原子扣减剩余分钟，额度不足返回 { ok: false } 由调用方降级 basic。
   */
  async consumeQuota(userId: string, quality: string, minutes: number, roomId?: string) {
    if (quality !== "hd" && quality !== "uhd") return { ok: true, quality: "basic" as const };
    if (!Number.isFinite(minutes) || minutes <= 0) return { ok: true, quality };

    const field = quality === "uhd" ? "uhdMinutes" : "hdMinutes";
    // 原子扣减防超额（剩余 >= 需核销才扣）
    const res = await this.prisma.liveQuotaAccount.updateMany({
      where: { userId, [field]: { gte: minutes } },
      data: { [field]: { decrement: minutes } },
    });
    if (res.count === 0) return { ok: false, quality };

    await this.prisma.liveQuotaRecord.create({
      data: { userId, type: "CONSUME", quality, minutes: -minutes, roomId: roomId ?? null },
    });
    return { ok: true, quality };
  }

  /** 额度流水（对账/明细） */
  async listRecords(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [records, total] = await Promise.all([
      this.prisma.liveQuotaRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.liveQuotaRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
  }
}
