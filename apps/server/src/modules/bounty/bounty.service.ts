import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CreateBountyDto, AnswerBountyDto } from "./bounty.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

/** 悬赏有效期（董事长拍板 2026-07-10：统一 48 小时，到期无人应答自动全额退回） */
const BOUNTY_TTL_MS = 48 * 3600 * 1000;
/** 抢答锁定时长（不超过悬赏剩余有效期） */
const CLAIM_LOCK_MS = 72 * 3600 * 1000;

@Injectable()
export class BountyService {
  private readonly logger = new Logger(BountyService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {}

  // ───────── 创建悬赏 ─────────

  async createQuestion(userId: string, dto: CreateBountyDto) {
    // 圈子治理 #10（2026-07-11）：圈内悬赏同受禁言约束（仅当悬赏带 circleId 且该圈禁言生效时拦截·轻量直查避免跨模块依赖）
    if (dto.circleId) {
      const mute = await this.prisma.circleViolation.findFirst({
        where: { circleId: dto.circleId, userId, type: "MUTE", status: "ACTIVE", expiresAt: { gt: new Date() } },
        select: { expiresAt: true },
      });
      if (mute) {
        const until = mute.expiresAt ? mute.expiresAt.toISOString().slice(0, 16).replace("T", " ") : "";
        throw new BusinessException(ErrorCode.FORBIDDEN, `你在该圈处于禁言期${until ? `（至 ${until}）` : ""}，暂不能发布悬赏`);
      }
    }

    // 冻结赏金与创建悬赏放进同一事务：冻结失败则回滚，避免"钱冻结了却没有悬赏记录"的孤儿冻结。
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.bountyQuestion.create({
        data: {
          title: dto.title,
          description: dto.description,
          bountyCoin: dto.bountyCoin,
          category: dto.category || "BAZI",
          stationId: dto.stationId || null,
          circleId: dto.circleId,
          images: dto.images || [],
          askerId: userId,
        },
      });
      if (this.coinSvc) {
        // 传入 question.id 作为 refId，便于后续 settle/refund 按 refId 精确解冻
        await this.coinSvc.freeze(userId, dto.bountyCoin, "BOUNTY", question.id, tx);
      }
      return question;
    });
  }

  // ───────── 抢答 ─────────

  async claim(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.status !== "OPEN") throw new BusinessException(ErrorCode.BAD_REQUEST, "悬赏不可抢答");
    if (question.askerId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能抢答自己的悬赏");

    // 悬赏有效期 48 小时：过期不可再抢答（待每小时清理任务退款）
    const expireAt = question.createdAt.getTime() + BOUNTY_TTL_MS;
    if (Date.now() >= expireAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "悬赏已过期");

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      // 抢答锁不越过悬赏 48h 有效期终点
      data: { status: "CLAIMED", answererId: userId, lockExpireAt: new Date(Math.min(Date.now() + CLAIM_LOCK_MS, expireAt)) },
    });
  }

  // ───────── 回答 ─────────

  async answer(userId: string, questionId: string, dto: AnswerBountyDto) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.answererId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权回答该悬赏");

    return this.prisma.bountyQuestion.update({
      where: { id: questionId },
      data: {
        status: "ANSWERED",
        answer: dto.answer,
        answerImages: dto.images || [],
        answerAudioUrl: dto.audioUrl,
        answeredAt: new Date(),
      },
    });
  }

  // ───────── 满意解付 ─────────

  /** 解付悬赏：转移冻结币+更新状态在同一事务 */
  async settle(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.askerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作");
    if (question.status !== "ANSWERED") throw new BusinessException(ErrorCode.BAD_REQUEST, "悬赏无可解付的回答");

    return this.prisma.$transaction(async (tx) => {
      if (this.coinSvc && question.answererId) {
        await this.coinSvc.transferFrozen(userId, question.answererId, question.bountyCoin, question.id, tx);
      }
      return tx.bountyQuestion.update({
        where: { id: questionId },
        data: { status: "SETTLED", settledAt: new Date() },
      });
    });
  }

  // ───────── 退款 ─────────

  /** 悬赏退款：解冻+更新状态在同一事务 */
  async refund(userId: string, questionId: string) {
    const question = await this.prisma.bountyQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "悬赏不存在");
    if (question.askerId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该悬赏");
    if (!["OPEN", "CLAIMED"].includes(question.status)) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不可退款");

    const updated = await this.prisma.$transaction(async (tx) => {
      if (this.coinSvc) {
        await this.coinSvc.unfreeze(question.askerId, question.bountyCoin, question.id, tx);
      }
      return tx.bountyQuestion.update({
        where: { id: questionId },
        data: { status: "REFUNDED" },
      });
    });

    // 审计：记录退款操作（执行者、目标悬赏、金额）
    this.logger.log(
      `悬赏退款 [审计] 操作人=${userId} 悬赏=${questionId} 金额=${question.bountyCoin}币 原状态=${question.status}`,
    );

    return updated;
  }

  // ───────── 列表/详情 ─────────

  list(rawPage = 1, rawPageSize = 20, category?: string, status?: string, stationId?: string, includeNonPublic = false) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Prisma.BountyQuestionWhereInput = {};
    if (category) where.category = category;
    const publicStatuses = ["OPEN", "CLAIMED", "ANSWERED", "SETTLED"];
    if (includeNonPublic) {
      if (status) where.status = status;
    } else if (status && publicStatuses.includes(status)) {
      where.status = status;
    } else {
      // 关闭/退款记录属于后台与当事人的资金证据，不进入公开悬赏广场。
      where.status = { in: publicStatuses };
    }
    if (stationId !== undefined) where.stationId = stationId;
    return Promise.all([
      this.prisma.bountyQuestion.findMany({
        where,
        skip, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bountyQuestion.count({ where }),
    ]).then(([questions, total]) => ({ questions, total, page, pageSize }));
  }

  getById(id: string) {
    return this.prisma.bountyQuestion.findUnique({
      where: { id },
    });
  }

  // ───────── 管理端 ─────────

  async closeQuestion(id: string, reason: string, operator: string) {
    const normalizedReason = reason.trim();
    const updated = await this.prisma.$transaction(async (tx) => {
      const question = await tx.bountyQuestion.findUnique({ where: { id } });
      if (!question) throw new BusinessException(ErrorCode.NOT_FOUND, "悬赏不存在");
      if (!["OPEN", "CLAIMED"].includes(question.status)) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          question.status === "ANSWERED"
            ? "该悬赏已有待结算回答，请先完成赏金归属处理"
            : "当前状态不可关闭",
        );
      }

      // 以悬赏 ID 精确核销冻结记录，并与关闭状态同事务提交，任何一步失败都会整体回滚。
      if (this.coinSvc) {
        await this.coinSvc.unfreeze(
          question.askerId,
          question.bountyCoin,
          question.id,
          tx,
        );
      }
      return tx.bountyQuestion.update({
        where: { id },
        data: {
          status: "CLOSED",
          closeReason: normalizedReason,
          closedBy: operator,
          closedAt: new Date(),
        },
      });
    });
    this.logger.log(
      `管理员关闭悬赏 [审计] 操作人=${operator} 悬赏=${id} 原因=${normalizedReason}`,
    );
    return updated;
  }

  async listReviews(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    // 状态过滤（PENDING/APPROVED/REJECTED）——非法值忽略，行为同不传
    const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
    const where = status && VALID_STATUSES.includes(status) ? { status } : undefined;
    const [reviews, total] = await Promise.all([
      this.prisma.bountyReview.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.bountyReview.count({ where }),
    ]);
    // 批量查询关联问题（BountyReview 与 BountyQuestion 无 Prisma relation·只能按 questionId 手工联查）
    // 补被审内容摘要与悬赏金额：标题+问题描述摘要+答案摘要+金额+问题状态
    const questionIds = [...new Set(reviews.map((r) => r.questionId))];
    const questions = questionIds.length
      ? await this.prisma.bountyQuestion.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, title: true, description: true, answer: true, bountyCoin: true, bountyRmb: true, status: true, category: true },
        })
      : [];
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const list = reviews.map((r) => {
      const q = questionMap.get(r.questionId);
      return {
        ...r,
        questionTitle: q?.title || "",
        questionExcerpt: q?.description ? q.description.slice(0, 100) : "",
        answerExcerpt: q?.answer ? q.answer.slice(0, 100) : "",
        bountyCoin: q?.bountyCoin ?? 0,
        bountyRmb: q?.bountyRmb ?? null,
        questionStatus: q?.status || "",
        category: q?.category || "",
      };
    });
    return { list, total, page, pageSize };
  }

  async approveReview(id: string) {
    const review = await this.prisma.bountyReview.findUnique({ where: { id } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "审核记录不存在");
    return this.prisma.bountyReview.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectReview(id: string, reason: string) {
    const review = await this.prisma.bountyReview.findUnique({ where: { id } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "审核记录不存在");
    return this.prisma.bountyReview.update({
      where: { id },
      data: { status: "REJECTED", reason },
    });
  }

  // ───────── 超时处理 ─────────

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredLocks() {
    await this.redis.runExclusive("bounty_expired_locks", 600, async () => {
      const expired = await this.prisma.bountyQuestion.findMany({
        where: { status: "CLAIMED", lockExpireAt: { lt: new Date() } },
        select: { id: true },
      });
      if (expired.length > 0) {
        await this.prisma.bountyQuestion.updateMany({
          where: { id: { in: expired.map((q) => q.id) } },
          data: { status: "OPEN", answererId: null, lockExpireAt: null },
        });
        this.logger.log(`释放超时悬赏: ${expired.length}`);
      }
    });
  }

  /** 每小时检查超过 48 小时无人应答的悬赏，自动全额退款（董事长拍板 2026-07-10·多实例锁防重复退款/双解冻） */
  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredBounties() {
    await this.redis.runExclusive("bounty_expired_bounties", 1800, () => this._processExpiredBounties(), { critical: true });
  }

  private async _processExpiredBounties() {
    const ttlAgo = new Date(Date.now() - BOUNTY_TTL_MS);
    const expired = await this.prisma.bountyQuestion.findMany({
      where: {
        status: { in: ["OPEN", "CLAIMED"] },
        createdAt: { lt: ttlAgo },
      },
      select: { id: true, askerId: true, bountyCoin: true, status: true },
      take: 50,
    });

    if (expired.length === 0) return;

    for (const bounty of expired) {
      try {
        // 解冻+标记过期在同一事务
        await this.prisma.$transaction(async (tx) => {
          if (this.coinSvc) {
            await this.coinSvc.unfreeze(bounty.askerId, bounty.bountyCoin, bounty.id, tx);
          }
          await tx.bountyQuestion.update({
            where: { id: bounty.id },
            data: { status: "EXPIRED" },
          });
        });
        this.logger.log(`悬赏自动退款: ${bounty.id}, ${bounty.bountyCoin}币`);
      } catch (err: any) {
        this.logger.warn(`悬赏退款失败: ${bounty.id}, ${err.message}`);
      }
    }

    if (expired.length > 0) {
      this.logger.log(`悬赏过期处理完成: ${expired.length} 个`);
    }
  }
}
