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

      // 统一总账影子双写。scene 用 CONSULT_CALL（达人咨询·独立规则），与 call 模块的连麦
      // AUDIO_CALL 区分；两条规则当前同为 达人50%/平台50%，与上方硬传的 rate 0.5 一致。
      this.revenue.settleLedger({
        scene: "CONSULT_CALL",
        refType: "CONSULT_CALL",
        refId: callId,
        amountCoin: settledCoin,
        payerId: call.callerId,
        parties: { PROVIDER: { type: "USER", id: call.expertId, userId: call.expertId } },
      }).catch(() => undefined);
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

  // ───────── 评价与账单申诉（待办 #31·列见 prisma/manual/2026-07-11-call-rating.sql·原生 SQL 访问） ─────────

  /** 评价/申诉共用的 24 小时窗口（自通话结束 endAt 起算） */
  private readonly POST_CALL_WINDOW_MS = 24 * 60 * 60 * 1000;

  private isWithinPostCallWindow(call: any): boolean {
    const endMs = call.endAt ? new Date(call.endAt).getTime() : 0;
    return endMs > 0 && Date.now() - endMs <= this.POST_CALL_WINDOW_MS;
  }

  /**
   * 通话评价：仅发起方 · 仅 ENDED · 仅一次 · 结束后 24h 内。
   * 星级 1-5 + 标签（逗号串存储）+ 文字 ≤200 字。幂等锚点 ratedAt IS NULL（原子 UPDATE 防并发重复评价）。
   */
  async rate(userId: string, callId: string, dto: { rating: number; tags?: string[]; comment?: string }) {
    const call = await this.getCall(callId);
    if (call.callerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "仅通话发起方可评价");
    if (call.status !== "ENDED") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已结算的通话可评价");
    if (call.ratedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "该通话已评价过");
    if (!this.isWithinPostCallWindow(call)) throw new BusinessException(ErrorCode.BAD_REQUEST, "评价窗口已关闭（通话结束 24 小时内可评价）");

    const rating = Math.floor(Number(dto.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BusinessException(ErrorCode.BAD_REQUEST, "评分须为 1-5 星");
    const comment = (dto.comment || "").trim();
    if (comment.length > 200) throw new BusinessException(ErrorCode.BAD_REQUEST, "评价文字最多 200 字");
    const tags = (Array.isArray(dto.tags) ? dto.tags : [])
      .map((t) => String(t).trim().replace(/,/g, "，"))
      .filter(Boolean)
      .slice(0, 5);

    const claimed = await this.prisma.$executeRawUnsafe(
      `UPDATE "ConsultCall" SET "rating"=$2, "ratingTags"=$3, "ratingComment"=$4, "ratedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND "ratedAt" IS NULL`,
      callId, rating, tags.length ? tags.join(",") : null, comment || null,
    );
    if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该通话已评价过");
    return { id: callId, rating, tags, comment };
  }

  /**
   * 24 小时账单申诉：通话双方任一 · 仅 ENDED · 仅一次 · 结束后 24h 内。
   * 只落 PENDING 记录（资金零触碰）。幂等锚点 disputedAt IS NULL。
   */
  async dispute(userId: string, callId: string, dto: { reason: string }) {
    const call = await this.getCall(callId);
    if (call.callerId !== userId && call.expertId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通话");
    if (call.status !== "ENDED") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已结算的通话账单可申诉");
    if (call.disputedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "该账单已提交过申诉");
    if (!this.isWithinPostCallWindow(call)) throw new BusinessException(ErrorCode.BAD_REQUEST, "申诉窗口已关闭（通话结束 24 小时内可申诉）");

    const reason = (dto.reason || "").trim();
    if (!reason) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写申诉原因");
    if (reason.length > 500) throw new BusinessException(ErrorCode.BAD_REQUEST, "申诉原因最多 500 字");

    const claimed = await this.prisma.$executeRawUnsafe(
      `UPDATE "ConsultCall" SET "disputeReason"=$2, "disputedAt"=CURRENT_TIMESTAMP, "disputeStatus"='PENDING'
       WHERE "id"=$1 AND "disputedAt" IS NULL`,
      callId, reason,
    );
    if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该账单已提交过申诉");
    return { id: callId, disputeStatus: "PENDING", disputeReason: reason };
  }

  /**
   * 达人好评率聚合（回流达人卡）：好评率 = rating≥4 占比。
   * 只统计已评价通话；无评价的达人不出现在结果里（前端据此不渲染，不编数）。
   */
  async expertRatingStats(expertIds: string[]): Promise<Record<string, { ratingCount: number; goodRate: number }>> {
    const ids = [...new Set((expertIds || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 50);
    if (!ids.length) return {};
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "expertId", COUNT(*)::int AS "ratingCount", COUNT(*) FILTER (WHERE "rating" >= 4)::int AS "goodCount"
       FROM "ConsultCall"
       WHERE "rating" IS NOT NULL AND "expertId" IN (${placeholders})
       GROUP BY "expertId"`,
      ...ids,
    );
    const out: Record<string, { ratingCount: number; goodRate: number }> = {};
    for (const r of rows) {
      const count = Number(r.ratingCount) || 0;
      if (count > 0) out[r.expertId] = { ratingCount: count, goodRate: Math.round((Number(r.goodCount) / count) * 100) };
    }
    return out;
  }

  /** 管理端：账单申诉队列（默认 PENDING），join 双方昵称 */
  async listDisputes(status = "PENDING", rawPage = 1, rawPageSize = 20) {
    const st = ["PENDING", "RESOLVED", "REJECTED"].includes(status) ? status : "PENDING";
    const page = Math.max(1, Math.floor(Number(rawPage) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(rawPageSize) || 20)));
    const [items, totalRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT c."id", c."circleId", c."callerId", c."expertId", c."type", c."pricePerMinute", c."durationSec",
                c."settledCoin", c."refundedCoin", c."endAt",
                c."disputeReason", c."disputedAt", c."disputeStatus", c."disputeResolveNote", c."disputeResolvedAt",
                caller."nickname" AS "callerName", expert."nickname" AS "expertName"
         FROM "ConsultCall" c
         LEFT JOIN "User" caller ON caller."id" = c."callerId"
         LEFT JOIN "User" expert ON expert."id" = c."expertId"
         WHERE c."disputeStatus" = $1
         ORDER BY c."disputedAt" DESC LIMIT $2 OFFSET $3`,
        st, pageSize, (page - 1) * pageSize,
      ),
      this.prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int AS "count" FROM "ConsultCall" WHERE "disputeStatus" = $1`, st),
    ]);
    return { items, total: Number(totalRows[0]?.count) || 0, page, pageSize };
  }

  /**
   * 管理端处理申诉：仅 PENDING → RESOLVED/REJECTED，只记结论与备注。
   * ⚠️ 资金零触碰：本端点不动任何余额/流水；若核查属实需退款，由人工走现有金币退款审批流。
   */
  async resolveDispute(reviewerId: string, callId: string, dto: { status: "RESOLVED" | "REJECTED"; note?: string }) {
    const call = await this.getCall(callId);
    if (call.disputeStatus !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该申诉不在待处理状态");
    const note = (dto.note || "").trim().slice(0, 500);
    const claimed = await this.prisma.$executeRawUnsafe(
      `UPDATE "ConsultCall" SET "disputeStatus"=$2, "disputeResolveNote"=$3, "disputeResolvedAt"=CURRENT_TIMESTAMP, "disputeReviewerId"=$4
       WHERE "id"=$1 AND "disputeStatus"='PENDING'`,
      callId, dto.status, note || null, reviewerId,
    );
    if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该申诉不在待处理状态");
    return { id: callId, disputeStatus: dto.status, disputeResolveNote: note || null };
  }

  /** 我的通话记录（作为主叫或达人），join 对方昵称/头像（SELECT c.* 已含评价/申诉列） */
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
