import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { buildTrtcConfig } from "./trtc-sig.util";

/**
 * 圈子达人语音/视频付费通话（规格 docs/circle-consult-rules-v1.md）。
 * 计费：达人 callPricePerMinuteCoin × 分钟，预充值预扣 PREPAY_MINUTES 分钟额度，结束按实际时长结算多退少不补；不足1分钟按1分钟。
 * 分账：达人 50% / 平台 50%（revenue.record scene=AUDIO_CALL rate=0.5）。RTC：腾讯 TRTC。
 *
 * ⚠️ 资金代码：本地无真实通话/余额场景，端到端结算未做 e2e。上线前须人工 review + 真实付费数据 e2e。
 * 新表 ConsultCall 用 $queryRawUnsafe/$executeRawUnsafe 访问（prisma generate 被锁）。
 */
@Injectable()
export class ConsultCallService {
  private readonly logger = new Logger(ConsultCallService.name);
  private readonly PREPAY_MINUTES = 10; // 预扣额度（分钟）

  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private revenue: RevenueService,
  ) {}

  private async getCall(id: string): Promise<any> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "ConsultCall" WHERE "id" = $1`, id);
    if (!rows.length) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    return rows[0];
  }

  /** 发起通话：校验达人定价 → 预扣 → 建记录 → 返回 TRTC 接入配置 */
  async initiate(callerId: string, dto: { circleId: string; expertId: string; type: "VOICE" | "VIDEO" }) {
    if (callerId === dto.expertId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能向自己发起通话");

    const member = await this.prisma.circleMember.findFirst({
      where: { circleId: dto.circleId, userId: dto.expertId },
      select: { callPricePerMinuteCoin: true },
    });
    if (!member) throw new BusinessException(ErrorCode.BAD_REQUEST, "达人不在该圈子");
    const pricePerMinute = member.callPricePerMinuteCoin;
    if (!pricePerMinute || pricePerMinute <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该达人未开通付费通话");

    const id = randomUUID();
    const prepaidCoin = pricePerMinute * this.PREPAY_MINUTES;
    const roomId = "consult_" + id.replace(/-/g, "").slice(0, 16);

    await this.prisma.$transaction(async (tx) => {
      // 预扣（余额不足 coin.spend 内部抛错，事务回滚不建记录）
      await this.coin.spend(callerId, { amountCoin: prepaidCoin, scene: "CONSULT_CALL_PREPAY", refId: id, description: "达人通话预扣" }, tx);
      await tx.$executeRawUnsafe(
        `INSERT INTO "ConsultCall"("id","circleId","callerId","expertId","type","pricePerMinute","prepaidCoin","status","rtcRoomId","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'WAITING',$8,CURRENT_TIMESTAMP)`,
        id, dto.circleId, callerId, dto.expertId, dto.type, pricePerMinute, prepaidCoin, roomId,
      );
    });

    return {
      id, rtcRoomId: roomId, pricePerMinute, prepaidCoin, prepayMinutes: this.PREPAY_MINUTES,
      trtc: buildTrtcConfig(callerId, roomId),
    };
  }

  /** 达人接听：WAITING → ONGOING */
  async accept(expertId: string, callId: string) {
    const call = await this.getCall(callId);
    if (call.expertId !== expertId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有受邀达人可接听");
    if (call.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "通话状态不可接听");
    await this.prisma.$executeRawUnsafe(`UPDATE "ConsultCall" SET "status"='ONGOING', "startAt"=CURRENT_TIMESTAMP WHERE "id"=$1`, callId);
    return { ...call, status: "ONGOING", trtc: buildTrtcConfig(expertId, call.rtcRoomId) };
  }

  /** 结束通话结算：按实际时长（不足1分钟按1分钟）扣费、达人50%分账、多退预扣 */
  async end(userId: string, callId: string) {
    const call = await this.getCall(callId);
    if (call.callerId !== userId && call.expertId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通话");
    if (call.status !== "ONGOING") throw new BusinessException(ErrorCode.BAD_REQUEST, "通话未在进行中");

    const startMs = call.startAt ? new Date(call.startAt).getTime() : Date.now();
    const durationSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const minutes = Math.max(1, Math.ceil(durationSec / 60)); // 不足1分钟按1分钟
    const settledCoin = Math.min(minutes * call.pricePerMinute, call.prepaidCoin);
    const refundedCoin = call.prepaidCoin - settledCoin;

    // 退还多扣 + 落库（同事务）；达人分账走 revenue.record（事务外，失败异步补偿，与 question 一致）
    await this.prisma.$transaction(async (tx) => {
      // 原子认领：仅 ONGOING→ENDED 抢到的请求才继续退款，防并发 end 双重退款+双重分账（TOCTOU）
      const claimed = await tx.$executeRawUnsafe(
        `UPDATE "ConsultCall" SET "status"='ENDED', "endAt"=CURRENT_TIMESTAMP, "durationSec"=$2, "settledCoin"=$3, "refundedCoin"=$4 WHERE "id"=$1 AND "status"='ONGOING'`,
        callId, durationSec, settledCoin, refundedCoin,
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话已结算");
      if (refundedCoin > 0) {
        await this.coin.refund(call.callerId, refundedCoin, `通话结算退还预扣（通话ID ${callId}）`, tx);
      }
    });

    if (settledCoin > 0) {
      this.revenue
        .record({ userId: call.expertId, scene: "AUDIO_CALL", refId: callId, amountCoin: settledCoin, rate: 0.5 })
        .catch((err) => this.logger.warn(`通话分账记录失败（callId ${callId}），需补偿: ${err.message}`));
    }

    return { id: callId, status: "ENDED", durationSec, minutes, settledCoin, refundedCoin };
  }

  /** 取消/未接通：全额退预扣 → MISSED(达人未接) / REFUNDED(主叫取消) */
  async cancel(userId: string, callId: string, reason: "MISSED" | "REFUNDED" = "REFUNDED") {
    const call = await this.getCall(callId);
    if (call.callerId !== userId && call.expertId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通话");
    if (call.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅未接通的通话可取消");

    await this.prisma.$transaction(async (tx) => {
      // 原子认领：仅 WAITING→reason 抢到的请求才退款，防并发 cancel/end 竞态下双重退款（TOCTOU）
      const claimed = await tx.$executeRawUnsafe(
        `UPDATE "ConsultCall" SET "status"=$2, "endAt"=CURRENT_TIMESTAMP, "refundedCoin"=$3 WHERE "id"=$1 AND "status"='WAITING'`,
        callId, reason, call.prepaidCoin,
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话状态已变更，无法取消");
      await this.coin.refund(call.callerId, call.prepaidCoin, `通话未接通全额退还（通话ID ${callId}）`, tx);
    });
    return { id: callId, status: reason, refundedCoin: call.prepaidCoin };
  }

  /** 我的通话记录（作为主叫或达人），join 对方昵称/头像 */
  async myCalls(userId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*,
         caller."nickname" AS "callerName", caller."avatar" AS "callerAvatar",
         expert."nickname" AS "expertName", expert."avatar" AS "expertAvatar"
       FROM "ConsultCall" c
       LEFT JOIN "User" caller ON caller."id" = c."callerId"
       LEFT JOIN "User" expert ON expert."id" = c."expertId"
       WHERE c."callerId" = $1 OR c."expertId" = $1
       ORDER BY c."createdAt" DESC LIMIT 50`,
      userId,
    );
  }
}
