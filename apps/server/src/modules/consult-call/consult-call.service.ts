import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { buildTrtcConfig } from "./trtc-sig.util";
import { circleExpertWhere, lockCircleExpertRows } from "../../common/circle-expert-availability";
import { CircleCapabilityService } from "../circle/circle-capability.service";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { CONSULT_PREPAY_MINUTES, CONSULT_WAITING_SECONDS, CONSULT_ACCEPT_TICKET_SECONDS, CONSULT_INITIATE_TICKET_SECONDS, isValidConsultCallPrice } from "../../common/consult-call-pricing";
import { ConsultCallResourceService } from "./consult-call-resource.service";

// 通话的服务者头衔由独立授权判定；平台直授可以覆盖普通成员，但不放宽账号、成员有效期及价格。
const callProviderWhere = () => {
  const where = circleExpertWhere("CALL");
  delete where.role;
  return where;
};

/**
 * 圈子达人语音/视频付费通话（规格 docs/circle-consult-rules-v1.md）。
 * 计费：达人 callPricePerMinuteCoin × 分钟，预充值预扣 PREPAY_MINUTES 分钟额度，结束按实际时长结算多退少不补；不足1分钟按1分钟。
 * 分账：达人 50% / 平台 50%（revenue.record scene=AUDIO_CALL rate=0.5）。RTC：腾讯 TRTC。
 *
 * 资金代码：本地隔离 PostgreSQL 已验证退款与双账原子性；不等于供应商实通或真实付款验收。
 * 新表 ConsultCall 用 $queryRawUnsafe/$executeRawUnsafe 访问（prisma generate 被锁）。
 */
@Injectable()
export class ConsultCallService {
  private readonly logger = new Logger(ConsultCallService.name);
  private readonly PREPAY_MINUTES = CONSULT_PREPAY_MINUTES;

  /** 未接通超时阈值：WAITING 超过此时长仍未被 accept → 视为未接通，全额退还预扣金币 */
  private readonly WAITING_TIMEOUT_MS = CONSULT_WAITING_SECONDS * 1000;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private coin: CoinService,
    private revenue: RevenueService,
    private capabilities: CircleCapabilityService,
    private resources: ConsultCallResourceService,
  ) {}

  /**
   * 每 5 分钟自动退款「超时未接通」的通话（分布式锁防多实例·上限 200）。
   * 修复(后端审计·缺cron)：达人不接听则 WAITING 恒挂、发起方预扣金币滞留,原仅靠双方手动 cancel。
   * 复用 cancel 的原子退款逻辑(CAS: WHERE status='WAITING')但走系统身份、无 userId 校验;
   * 退的是预扣金币(虚拟币)。CAS 保证若期间被 accept(→ONGOING)/cancel 则 claimed=0 跳过,不误退进行中通话。
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refundStaleWaitingCallsCron() {
    await this.redis.runExclusive("consult_call_refund_stale_waiting", 300, async () => {
      const cutoff = new Date(Date.now() - this.WAITING_TIMEOUT_MS);
      const stale = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "id","callerId","prepaidCoin" FROM "ConsultCall" WHERE "status"='WAITING' AND "createdAt" < $1::timestamp(3) LIMIT 200`,
        cutoff.toISOString(),
      );
      let refunded = 0;
      for (const call of stale) {
        try {
          const didRefund = await this.prisma.$transaction(async (tx) => {
            await this.resources.lockForStopInTransaction(tx, call.id);
            const claimed = await tx.$executeRawUnsafe(
              `UPDATE "ConsultCall" SET "status"='MISSED', "endAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "refundedCoin"=$2 WHERE "id"=$1 AND "status"='WAITING'`,
              call.id, call.prepaidCoin,
            );
            if (claimed === 0) return false; // 期间已被接听/取消,不重复退，也不计入成功退款
            await this.resources.requestStopInTransaction(tx, call.id, "WAITING_TIMEOUT", null);
            await this.coin.refund(call.callerId, call.prepaidCoin, `通话超时未接通全额退还（通话ID ${call.id}）`, tx);
            return true;
          });
          // 只有退款所在事务成功提交才计数，避免运营把跳过或回滚误判成已退款。
          if (didRefund) refunded++;
        } catch (err) {
          this.logger.warn(`通话超时退款失败 [${call.id}]`, err instanceof Error ? err.message : err);
        }
      }
      if (refunded > 0) this.logger.log(`通话超时未接通自动退款: ${refunded}/${stale.length} 笔`);
    });
  }

  private async getCall(id: string): Promise<any> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "ConsultCall" WHERE "id" = $1`, id);
    if (!rows.length) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    return rows[0];
  }

  /** 主库只读状态：非参与者与不存在记录统一 404，避免枚举他人通话。 */
  async active(userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      id: string; status: string; type: string; callerId: string; expertId: string; createdAt: Date;
    }>>(`SELECT "id","status","type","callerId","expertId","createdAt" FROM "ConsultCall"
      WHERE ("callerId"=$1 OR "expertId"=$1) AND "status" IN ('WAITING','ONGOING')
      ORDER BY "createdAt" DESC,"id" DESC LIMIT 20`, userId);
    return rows.map(call => ({ id: call.id, status: call.status, type: call.type,
      role: call.callerId === userId ? "CALLER" : "EXPERT", createdAt: call.createdAt }));
  }

  /** 主库只读状态：非参与者与不存在记录统一 404，避免枚举他人通话。 */
  async state(userId: string, callId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      id: string; status: string; type: string; callerId: string;
      startAt: Date | null; endAt: Date | null;
    }>>(
      `SELECT "id","status","type","callerId","startAt","endAt" FROM "ConsultCall"
       WHERE "id"=$1 AND ("callerId"=$2 OR "expertId"=$2)`, callId, userId,
    );
    if (!rows.length) throw new BusinessException(ErrorCode.NOT_FOUND, "通话记录不存在");
    const call = rows[0];
    if (rows.length !== 1 || !["WAITING", "ONGOING", "ENDED", "MISSED", "REFUNDED"].includes(call.status)
      || !["VOICE", "VIDEO"].includes(call.type)) throw new Error("CONSULT_STATE_INVALID");
    return { id: call.id, status: call.status, type: call.type,
      role: call.callerId === userId ? "CALLER" : "EXPERT",
      startAt: call.startAt, endAt: call.endAt };
  }

  /** 发起通话：校验达人定价 → 预扣 → 建记录 → 返回 TRTC 接入配置 */
  async initiate(callerId: string, dto: { circleId: string; expertId: string; type: "VOICE" | "VIDEO" }, executor: ExecutorType = "HUMAN") {
    assertHumanForRedLine(executor, [RedLine.EXTERNAL_PUBLISH, RedLine.MONEY]);
    if (callerId === dto.expertId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能向自己发起通话");
    if (!["VOICE", "VIDEO"].includes(dto.type)) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话类型无效");

    const member = await this.prisma.circleMember.findFirst({
      where: { ...callProviderWhere(), circleId: dto.circleId, userId: dto.expertId },
      select: { id: true, callPricePerMinuteCoin: true },
    });
    if (!member) throw new BusinessException(ErrorCode.BAD_REQUEST, "该达人未开放有效的付费通话服务");
    const pricePerMinute = member.callPricePerMinuteCoin;
    if (!isValidConsultCallPrice(pricePerMinute)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "通话价格配置无效，请联系平台处理");
    }

    const id = randomUUID();
    const prepaidCoin = pricePerMinute * this.PREPAY_MINUTES;
    const roomId = "consult_" + id.replace(/-/g, "").slice(0, 16);
    const trtc = buildTrtcConfig(callerId, roomId, dto.type, CONSULT_INITIATE_TICKET_SECONDS);
    if (!trtc.configured || !trtc.userSig || !trtc.privateMapKey) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话服务暂不可用，未扣除金币");

    await this.prisma.$transaction(async (tx) => {
      // 与管理员撤权采用同圈锁顺序；授权等待结束后，必须再次读价格，扣费前失败即回滚。
      await this.capabilities.assertAuthorizationInTransaction(tx, dto.circleId,
        dto.type === "VOICE" ? "AUDIO_QUESTION" : "VIDEO_QUESTION", { userId: callerId, executor }, dto.expertId);
      const locked = await lockCircleExpertRows(tx, dto.circleId, dto.expertId);
      if (!locked.circleIds.includes(dto.circleId) || !locked.userIds.includes(dto.expertId) || !locked.memberIds.includes(member.id)) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "咨询服务状态已更新，请返回重新选择");
      }
      const current = await tx.circleMember.findFirst({ where: { ...callProviderWhere(), id: member.id, circleId: dto.circleId, userId: dto.expertId },
        select: { callPricePerMinuteCoin: true } });
      if (!current) throw new BusinessException(ErrorCode.FORBIDDEN, "咨询服务状态已更新，请返回重新选择");
      if (current.callPricePerMinuteCoin !== pricePerMinute) throw new BusinessException(ErrorCode.CONFLICT, "咨询价格已更新，请确认后重新提交", HttpStatus.CONFLICT);
      await this.revenue.assertConsultReadyInTransaction(tx);
      // 同事务先取得资源，再预扣；额度失败不调用扣币，余额失败回滚记录/资源/边界。
      const inserted = await tx.$executeRawUnsafe(
        `INSERT INTO "ConsultCall"("id","circleId","callerId","expertId","type","pricePerMinute","prepaidCoin","status","rtcRoomId","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'WAITING',$8,$9::timestamp(3))`,
        id, dto.circleId, callerId, dto.expertId, dto.type, pricePerMinute, prepaidCoin, roomId, new Date().toISOString(),
      );
      if (inserted !== 1) throw new Error("CONSULT_CALL_INSERT_FAILED");
      await this.resources.issueInTransaction(tx, id, "INITIATE", { userId: callerId, executor }, trtc);
      await this.coin.spend(callerId, { amountCoin: prepaidCoin, scene: "CONSULT_CALL_PREPAY", refId: id, description: "达人通话预扣" }, tx);
    });

    return {
      id, rtcRoomId: roomId, pricePerMinute, prepaidCoin, prepayMinutes: this.PREPAY_MINUTES,
      trtc,
    };
  }

  /** 达人接听：WAITING → ONGOING */
  async accept(expertId: string, callId: string, executor: ExecutorType = "HUMAN") {
    assertHumanForRedLine(executor, [RedLine.EXTERNAL_PUBLISH, RedLine.MONEY]);
    const call = await this.getCall(callId);
    if (call.expertId !== expertId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有受邀达人可接听");
    if (call.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "通话状态不可接听");
    if (!["VOICE", "VIDEO"].includes(call.type)) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话类型无效");
    const trtc = buildTrtcConfig(expertId, call.rtcRoomId, call.type, CONSULT_ACCEPT_TICKET_SECONDS);
    if (!trtc.configured || !trtc.userSig || !trtc.privateMapKey) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话服务暂不可用，请稍后重试或取消通话");
    await this.prisma.$transaction(async tx => {
      await this.capabilities.assertAuthorizationInTransaction(tx, call.circleId,
        call.type === "VOICE" ? "AUDIO_QUESTION" : "VIDEO_QUESTION", { userId: expertId, executor }, expertId);
      const locked = await lockCircleExpertRows(tx, call.circleId, expertId);
      if (!locked.circleIds.includes(call.circleId) || !locked.userIds.includes(expertId)) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "咨询服务已不可用，请取消通话退还预扣");
      }
      // 只复核当前准入，不按新价格重算已经确认的预扣订单。
      const current = await tx.circleMember.findFirst({ where: {
        ...callProviderWhere(), circleId: call.circleId, userId: expertId, id: { in: locked.memberIds },
      }, select: { id: true } });
      if (!current) throw new BusinessException(ErrorCode.FORBIDDEN, "咨询服务已不可用，请取消通话退还预扣");
      await this.revenue.assertConsultReadyInTransaction(tx);
      await this.resources.issueInTransaction(tx, callId, "ACCEPT", { userId: expertId, executor }, trtc);
      const acceptedAt = new Date();
      const claimed = await tx.$executeRawUnsafe(`UPDATE "ConsultCall" SET "status"='ONGOING', "startAt"=$2::timestamp(3)
        WHERE "id"=$1 AND "status"='WAITING' AND "createdAt">$3::timestamp(3) AND "createdAt"<=$2::timestamp(3)`,
        callId, acceptedAt.toISOString(), new Date(acceptedAt.getTime() - this.WAITING_TIMEOUT_MS).toISOString());
      if (claimed !== 1) throw new BusinessException(ErrorCode.CONFLICT, "通话状态已变化，无法重复接听", HttpStatus.CONFLICT);
    });
    return { ...call, status: "ONGOING", trtc };
  }

  /** 结束通话结算：按实际时长（不足1分钟按1分钟）扣费、达人50%分账、多退预扣 */
  async end(userId: string, callId: string, executor: ExecutorType = "HUMAN") {
    assertHumanForRedLine(executor, [RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]);
    const call = await this.getCall(callId);
    if (call.callerId !== userId && call.expertId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通话");
    if (call.status !== "ONGOING") throw new BusinessException(ErrorCode.BAD_REQUEST, "通话未在进行中");

    const startMs = call.startAt ? new Date(call.startAt).getTime() : Date.now();
    const durationSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const minutes = Math.max(1, Math.ceil(durationSec / 60)); // 不足1分钟按1分钟
    const settledCoin = Math.min(minutes * call.pricePerMinute, call.prepaidCoin);
    const refundedCoin = call.prepaidCoin - settledCoin;

    // 结束状态、停止意图、退款、达人收益及统一总账必须同成同败。
    await this.prisma.$transaction(async (tx) => {
      // 原子认领：仅 ONGOING→ENDED 抢到的请求才继续退款，防并发 end 双重退款+双重分账（TOCTOU）
      await this.resources.lockForStopInTransaction(tx, callId);
      const claimed = await tx.$executeRawUnsafe(
        `UPDATE "ConsultCall" SET "status"='ENDED', "endAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "durationSec"=$2, "settledCoin"=$3, "refundedCoin"=$4 WHERE "id"=$1 AND "status"='ONGOING'`,
        callId, durationSec, settledCoin, refundedCoin,
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话已结算");
      await this.resources.requestStopInTransaction(tx, callId, "END", userId);
      if (refundedCoin > 0) {
        await this.coin.refund(call.callerId, refundedCoin, `通话结算退还预扣（通话ID ${callId}）`, tx);
      }
      if (settledCoin > 0) await this.revenue.recordConsultInTransaction({ callId, callerId: call.callerId,
        expertId: call.expertId, amountCoin: settledCoin }, tx);
    });

    return { id: callId, status: "ENDED", durationSec, minutes, settledCoin, refundedCoin };
  }

  /** 取消/未接通：全额退预扣 → MISSED(达人未接) / REFUNDED(主叫取消) */
  async cancel(userId: string, callId: string, reason: "MISSED" | "REFUNDED" = "REFUNDED", executor: ExecutorType = "HUMAN") {
    assertHumanForRedLine(executor, [RedLine.MONEY, RedLine.EXTERNAL_PUBLISH]);
    const call = await this.getCall(callId);
    if (call.callerId !== userId && call.expertId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作此通话");
    if (call.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅未接通的通话可取消");

    await this.prisma.$transaction(async (tx) => {
      // 原子认领：仅 WAITING→reason 抢到的请求才退款，防并发 cancel/end 竞态下双重退款（TOCTOU）
      await this.resources.lockForStopInTransaction(tx, callId);
      const claimed = await tx.$executeRawUnsafe(
        `UPDATE "ConsultCall" SET "status"=$2, "endAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "refundedCoin"=$3 WHERE "id"=$1 AND "status"='WAITING'`,
        callId, reason, call.prepaidCoin,
      );
      if (claimed === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "通话状态已变更，无法取消");
      await this.resources.requestStopInTransaction(tx, callId, "CANCEL", userId);
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
      `UPDATE "ConsultCall" SET "rating"=$2, "ratingTags"=$3, "ratingComment"=$4, "ratedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
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
      `UPDATE "ConsultCall" SET "disputeReason"=$2, "disputedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "disputeStatus"='PENDING'
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
      `UPDATE "ConsultCall" SET "disputeStatus"=$2, "disputeResolveNote"=$3, "disputeResolvedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "disputeReviewerId"=$4
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
