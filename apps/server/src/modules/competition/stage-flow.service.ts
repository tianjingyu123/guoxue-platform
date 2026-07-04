import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { TalentService } from "./talent.service";

/** 晋级规则（与 stagesConfig.advanceRule 契约一致，P1 已做入库校验） */
interface AdvanceRule {
  type: "count" | "percent";
  value: number;
}

/** 阶段行（仅声明本服务用到的字段，避免引入生成类型的紧耦合） */
interface StageRow {
  id: string;
  competitionId: string;
  seq: number;
  name: string;
  format: string;
  startAt: Date;
  endAt: Date;
  advanceRule: unknown;
  status: string;
}

interface CompetitionBrief {
  id: string;
  title: string;
  status: string;
}

interface TransitionResult {
  transitioned: boolean;
  reason?: string;
  promoted?: number;
  eliminated?: number;
}

/** cron 分布式锁名（任务书钉死） */
const FLOW_LOCK_NAME = "competition-stage-flow";
/** 锁 TTL（秒）：略小于 5 分钟间隔，防持锁进程崩溃后长期卡死 */
const FLOW_LOCK_TTL = 270;
/** 通知去重 key TTL：远超单个赛程周期，重跑不重复打扰 */
const NOTIFY_DEDUP_TTL = 30 * 86400;
/** 有效报名状态（可参赛）：已报名/审核通过；退赛与取消资格者出局 */
const ACTIVE_REG_STATUS = ["REGISTERED", "QUALIFIED"] as const;
/** 流转只作用于已发布/进行中的赛事（草稿未开闸、已结束/取消不再动） */
const FLOWABLE_COMPETITION_STATUS = ["PUBLISHED", "IN_PROGRESS"] as const;

/**
 * 赛程自动流转状态机（二期·赛-P2）
 *
 * 状态机：PENDING → RUNNING → JUDGING → DONE
 * - PENDING 且 startAt≤now（且上一阶段已 DONE）→ RUNNING + 通知有效报名者开赛
 * - RUNNING 且 endAt≤now → JUDGING（收卷）
 * - JUDGING 且成绩齐 → 按 advanceRule 生成晋级名单 + 双话术通知 → DONE
 * - 末阶段 DONE → 赛事整体 FINISHED
 *
 * 幂等设计：
 * - 每步状态翻转用 CAS updateMany（where 带旧状态），并发/重跑只有一次生效
 * - 通知用 redis setNX（per stage+event）去重，重跑不重复打扰
 * - 榜单写入 = 事务内 deleteMany+createMany，天然可重放
 *
 * 诚实设计注释（参赛侧无阶段隔离·勿动参赛侧的前提下的表达方式）：
 * - CompetitionStage 与 CompetitionRound 无外键（P1 未建关联）。阶段成绩聚合按
 *   「时间窗重叠」把 round 归属到 stage；无任何 round 落入窗口时退化为累计总分制。
 * - 阶段晋级名单的权威真源 = CompetitionRanking 的阶段榜行（roundId 列存 stage.id；
 *   该列本就是无外键的 String?，现有语义 null=最终排名，此处扩展 stage.id=阶段榜）。
 *   下一阶段的"报名名单"即上一阶段 PROMOTED 行，不改 Registration.status
 *   （其枚举 REGISTERED/QUALIFIED/DISQUALIFIED/WITHDRAWN 是报名审核语义，不混用）。
 * - Registration.extraData.stageProgress 写晋级快照，仅供参赛侧展示，非权威名单。
 * - 参赛侧答题仍按 round 时间窗校验、未做阶段名单硬拦截（本单不动参赛侧）；
 *   淘汰者即使提交，也进不了下一阶段的 eligible 集合，不影响晋级正确性。
 */
@Injectable()
export class StageFlowService {
  private readonly logger = new Logger(StageFlowService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private talent: TalentService,
  ) {}

  // ═══════════════════ cron 入口 ═══════════════════

  /** 每 5 分钟扫描一轮（多实例分布式锁互斥，抢不到直接跳过） */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async flowCron() {
    await this.redis.runExclusive(FLOW_LOCK_NAME, FLOW_LOCK_TTL, () => this.runFlow());
  }

  /**
   * 全量扫描一轮（幂等可重跑）。
   * 处理顺序 = 收卷 → 判分晋级 → 开新场：同一 tick 内上一阶段先收官，
   * 使"上阶段 DONE + 下阶段 startAt 已到"能在同一轮完成衔接。
   * 每个阶段单轮最多推进一步，追赶靠 5 分钟节拍，行为可预测。
   */
  async runFlow(now = new Date()) {
    const stats = { toJudging: 0, settled: 0, started: 0 };

    // ── 1. RUNNING 且 endAt≤now → JUDGING（收卷） ──
    const closing = await this.prisma.competitionStage.findMany({
      where: {
        status: "RUNNING",
        endAt: { lte: now },
        competition: { status: { in: [...FLOWABLE_COMPETITION_STATUS] } },
      },
      include: { competition: { select: { id: true, title: true, status: true } } },
      orderBy: [{ competitionId: "asc" }, { seq: "asc" }],
    });
    for (const stage of closing) {
      const r = await this.closeStage(stage);
      if (r.transitioned) stats.toJudging++;
    }

    // ── 2. JUDGING → 判分/晋级 → DONE ──
    const judging = await this.prisma.competitionStage.findMany({
      where: {
        status: "JUDGING",
        competition: { status: { in: [...FLOWABLE_COMPETITION_STATUS] } },
      },
      include: { competition: { select: { id: true, title: true, status: true } } },
      orderBy: [{ competitionId: "asc" }, { seq: "asc" }],
    });
    for (const stage of judging) {
      try {
        const r = await this.settleStage(stage, stage.competition);
        if (r.transitioned) stats.settled++;
      } catch (err) {
        // 单赛事判分异常不阻塞其他赛事流转
        this.logger.error(`阶段判分失败 stage=${stage.id}: ${(err as Error).message}`);
      }
    }

    // ── 3. PENDING 且 startAt≤now → RUNNING（开新场） ──
    const due = await this.prisma.competitionStage.findMany({
      where: {
        status: "PENDING",
        startAt: { lte: now },
        competition: { status: { in: [...FLOWABLE_COMPETITION_STATUS] } },
      },
      include: { competition: { select: { id: true, title: true, status: true } } },
      orderBy: [{ competitionId: "asc" }, { seq: "asc" }],
    });
    for (const stage of due) {
      const r = await this.startStage(stage, stage.competition);
      if (r.transitioned) stats.started++;
    }

    if (stats.toJudging || stats.settled || stats.started) {
      this.logger.log(`赛程流转：收卷${stats.toJudging} 判分收官${stats.settled} 开赛${stats.started}`);
    }
    return stats;
  }

  // ═══════════════════ 状态机单步 ═══════════════════

  /** PENDING → RUNNING：CAS 翻转 + 赛事整体开赛 + 开赛通知（去重） */
  private async startStage(stage: StageRow, comp: CompetitionBrief): Promise<TransitionResult> {
    // 门禁：上一阶段必须 DONE（晋级名单已定），否则名单不完整不开赛
    if (stage.seq > 1) {
      const prev = await this.prisma.competitionStage.findUnique({
        where: { competitionId_seq: { competitionId: stage.competitionId, seq: stage.seq - 1 } },
      });
      if (prev && prev.status !== "DONE") {
        this.logger.warn(`阶段${stage.seq}到点但上一阶段未收官（${prev.status}），暂缓开赛 stage=${stage.id}`);
        return { transitioned: false, reason: `上一阶段「${prev.name}」尚未收官（${prev.status}）` };
      }
    }

    const flipped = await this.prisma.competitionStage.updateMany({
      where: { id: stage.id, status: "PENDING" },
      data: { status: "RUNNING" },
    });
    if (flipped.count === 0) return { transitioned: false, reason: "状态已被并发变更" };

    // 首个阶段开赛 → 赛事整体 PUBLISHED→IN_PROGRESS（CAS 幂等，沿用现有枚举）
    await this.prisma.competition.updateMany({
      where: { id: stage.competitionId, status: "PUBLISHED" },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    // 开赛通知（有效报名者=第一阶段全体有效报名/后续阶段上轮晋级者）
    const participants = await this.eligibleRegistrations(stage);
    await this.notifyOnce(
      stage.id,
      "start",
      participants.map((p) => ({
        userId: p.userId,
        type: "SYSTEM",
        title: `「${comp.title}」${stage.name} 开赛`,
        content: `你参加的赛事「${comp.title}」${stage.name}已开赛，比赛窗口 ${this.fmt(stage.startAt)} ~ ${this.fmt(stage.endAt)}，快去参赛吧！`,
        targetType: "competition",
        targetId: stage.competitionId,
      })),
    );

    this.logger.log(`阶段开赛：「${comp.title}」#${stage.seq} ${stage.name}（通知${participants.length}人）`);
    return { transitioned: true };
  }

  /** RUNNING → JUDGING：收卷（判分在 JUDGING 步聚合；QUIZ 已在提交时逐题自动判分） */
  private async closeStage(stage: StageRow): Promise<TransitionResult> {
    const flipped = await this.prisma.competitionStage.updateMany({
      where: { id: stage.id, status: "RUNNING" },
      data: { status: "JUDGING" },
    });
    if (flipped.count === 0) return { transitioned: false, reason: "状态已被并发变更" };
    this.logger.log(`阶段收卷进入判分：stage=${stage.id} #${stage.seq} ${stage.name}`);
    return { transitioned: true };
  }

  /**
   * JUDGING → DONE：聚合成绩 → 按 advanceRule 生成晋级名单/末阶段终榜 → 双话术通知 → 收官。
   * 判分复用现有链路：QUIZ 提交时 GradingEngine 已逐题判分并落 CompetitionScore，
   * 此处只做聚合排序（复用勿重写）；LIVE_PK/主观题存在未评分答卷时保持 JUDGING 等待。
   */
  private async settleStage(
    stage: StageRow,
    comp: CompetitionBrief,
    opts: { force?: boolean } = {},
  ): Promise<TransitionResult> {
    const participants = await this.eligibleRegistrations(stage);
    const nextStage = await this.prisma.competitionStage.findUnique({
      where: { competitionId_seq: { competitionId: stage.competitionId, seq: stage.seq + 1 } },
    });
    const isFinal = !nextStage;

    // 阶段↔轮次无外键：按时间窗重叠归属 round；无匹配则退化为累计总分制（诚实降级）
    const rounds = await this.prisma.competitionRound.findMany({
      where: { competitionId: stage.competitionId },
      select: { id: true, startAt: true, endAt: true },
    });
    let stageRoundIds = rounds
      .filter((r) => r.startAt < stage.endAt && r.endAt > stage.startAt)
      .map((r) => r.id);
    if (stageRoundIds.length === 0) stageRoundIds = rounds.map((r) => r.id);

    const regIds = participants.map((p) => p.id);

    // 成绩齐检查：存在未评分答卷（score=null，主观题/LIVE_PK 人工评分未完成）则等待
    if (!opts.force && regIds.length > 0 && stageRoundIds.length > 0) {
      const ungraded = await this.prisma.competitionAnswer.count({
        where: { registrationId: { in: regIds }, roundId: { in: stageRoundIds }, score: null },
      });
      if (ungraded > 0) {
        this.logger.log(`阶段判分等待：stage=${stage.id} 尚有${ungraded}份答卷未评分`);
        return { transitioned: false, reason: `尚有 ${ungraded} 份答卷未评分` };
      }
    }

    // 聚合成绩（真源=CompetitionScore·batchSubmitAnswers 判分即落此表）；未交卷=0分
    const scores = regIds.length
      ? await this.prisma.competitionScore.findMany({
          where: {
            registrationId: { in: regIds },
            ...(stageRoundIds.length ? { roundId: { in: stageRoundIds } } : {}),
          },
          select: { registrationId: true, totalScore: true },
        })
      : [];
    const totalByReg = new Map<string, number>();
    for (const s of scores) {
      totalByReg.set(s.registrationId, (totalByReg.get(s.registrationId) ?? 0) + s.totalScore);
    }
    // 同分按 userId 字典序，保证重跑排序确定（并列名次可后续增强）
    const ranked = participants
      .map((p) => ({ ...p, total: totalByReg.get(p.id) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.userId.localeCompare(b.userId));

    if (isFinal) {
      return this.settleFinalStage(stage, comp, ranked);
    }
    return this.settleAdvanceStage(stage, comp, ranked, nextStage as StageRow);
  }

  /** 非末阶段收官：按 advanceRule 切晋级线，写阶段榜 + 双话术通知 */
  private async settleAdvanceStage(
    stage: StageRow,
    comp: CompetitionBrief,
    ranked: { id: string; userId: string; extraData: unknown; total: number }[],
    nextStage: StageRow,
  ): Promise<TransitionResult> {
    const rule = (stage.advanceRule ?? null) as AdvanceRule | null;
    let promoteN: number;
    if (!rule) {
      // P1 校验保证非末阶段必有规则；防御历史脏数据：无规则=全员晋级并告警
      this.logger.warn(`非末阶段缺 advanceRule，按全员晋级处理 stage=${stage.id}`);
      promoteN = ranked.length;
    } else if (rule.type === "count") {
      promoteN = Math.min(rule.value, ranked.length);
    } else {
      // percent：向上取整（宁多勿漏），至少覆盖到规则比例
      promoteN = Math.min(ranked.length, Math.ceil((ranked.length * rule.value) / 100));
    }

    // 阶段榜（公示真源）：roundId=stage.id·删旧写新，重跑可重放
    const rows = ranked.map((p, i) => ({
      competitionId: stage.competitionId,
      userId: p.userId,
      roundId: stage.id,
      rank: i + 1,
      score: p.total,
      status: i < promoteN ? "PROMOTED" : "ELIMINATED",
    }));
    await this.prisma.$transaction(async (tx) => {
      await tx.competitionRanking.deleteMany({
        where: { competitionId: stage.competitionId, roundId: stage.id },
      });
      if (rows.length > 0) {
        await tx.competitionRanking.createMany({ data: rows as never[] });
      }
    });

    // Registration.extraData 晋级快照（仅供参赛侧展示·权威名单在阶段榜）
    await this.snapshotProgress(stage, ranked, (i) => (i < promoteN ? "PROMOTED" : "ELIMINATED"));

    const flipped = await this.prisma.competitionStage.updateMany({
      where: { id: stage.id, status: "JUDGING" },
      data: { status: "DONE" },
    });
    if (flipped.count === 0) return { transitioned: false, reason: "状态已被并发变更" };

    // 双话术通知（各自独立去重）
    const promoted = ranked.slice(0, promoteN);
    const eliminated = ranked.slice(promoteN);
    await this.notifyOnce(
      stage.id,
      "promoted",
      promoted.map((p) => ({
        userId: p.userId,
        type: "SYSTEM",
        title: `恭喜晋级：${stage.name}`,
        content: `恭喜！你在「${comp.title}」${stage.name}中脱颖而出，成功晋级「${nextStage.name}」（${this.fmt(nextStage.startAt)} 开赛），请留意开赛通知，再接再厉！`,
        targetType: "competition",
        targetId: stage.competitionId,
      })),
    );
    await this.notifyOnce(
      stage.id,
      "eliminated",
      eliminated.map((p) => ({
        userId: p.userId,
        type: "SYSTEM",
        title: `${stage.name} 成绩公布`,
        content: `你在「${comp.title}」${stage.name}的比赛旅程告一段落。成绩与排名已公示，可在赛事页查看。感谢参与，期待下次赛场再会！`,
        targetType: "competition",
        targetId: stage.competitionId,
      })),
    );

    this.logger.log(
      `阶段收官：「${comp.title}」#${stage.seq} ${stage.name} 晋级${promoteN}/${ranked.length}`,
    );
    return { transitioned: true, promoted: promoteN, eliminated: ranked.length - promoteN };
  }

  /** 末阶段收官：写终榜（沿用 CHAMPION/RUNNER_UP/THIRD_PLACE 语义·roundId=null）+ 赛事 FINISHED */
  private async settleFinalStage(
    stage: StageRow,
    comp: CompetitionBrief,
    ranked: { id: string; userId: string; extraData: unknown; total: number }[],
  ): Promise<TransitionResult> {
    // 终榜状态沿用现有 calculateRanking/证书语义
    const finalStatus = (i: number) =>
      i === 0 ? "CHAMPION" : i === 1 ? "RUNNER_UP" : i === 2 ? "THIRD_PLACE" : "ELIMINATED";

    // roundId=null 的唯一约束在 Postgres 下不生效（NULL≠NULL），必须删旧写新防重跑重复
    const rows = ranked.map((p, i) => ({
      competitionId: stage.competitionId,
      userId: p.userId,
      roundId: null as string | null,
      rank: i + 1,
      score: p.total,
      status: finalStatus(i),
    }));
    await this.prisma.$transaction(async (tx) => {
      await tx.competitionRanking.deleteMany({
        where: { competitionId: stage.competitionId, roundId: null },
      });
      if (rows.length > 0) {
        await tx.competitionRanking.createMany({ data: rows as never[] });
      }
    });

    await this.snapshotProgress(stage, ranked, finalStatus);

    const flipped = await this.prisma.competitionStage.updateMany({
      where: { id: stage.id, status: "JUDGING" },
      data: { status: "DONE" },
    });
    if (flipped.count === 0) return { transitioned: false, reason: "状态已被并发变更" };

    // 末阶段 DONE → 赛事整体收官（沿用现有 FINISHED 枚举·CAS 幂等）
    await this.prisma.competition.updateMany({
      where: { id: stage.competitionId, status: { in: [...FLOWABLE_COMPETITION_STATUS] } },
      data: { status: "FINISHED", finishedAt: new Date() },
    });

    // 赛-P4 人才沉淀：收官后重算参赛者 talent 档案（badges 判重幂等·失败不阻塞收官）
    await this.talent.recalcForCompetition(stage.competitionId).catch((err: Error) =>
      this.logger.error(`人才档案重算失败 competition=${stage.competitionId}: ${err.message}`));

    const label: Record<string, string> = {
      CHAMPION: "冠军",
      RUNNER_UP: "亚军",
      THIRD_PLACE: "季军",
    };
    await this.notifyOnce(
      stage.id,
      "final",
      ranked.map((p, i) => {
        const st = finalStatus(i);
        return {
          userId: p.userId,
          type: "SYSTEM",
          title: `「${comp.title}」圆满收官`,
          content: label[st]
            ? `恭喜！你在「${comp.title}」中荣获${label[st]}（总分 ${p.total}）！证书与荣誉已生成，可在赛事页领取。`
            : `「${comp.title}」已圆满收官，你的最终排名为第 ${i + 1} 名。感谢一路参与，期待下次赛场再会！`,
          targetType: "competition",
          targetId: stage.competitionId,
        };
      }),
    );

    this.logger.log(`赛事收官：「${comp.title}」末阶段 ${stage.name} DONE·整体 FINISHED`);
    return { transitioned: true, promoted: 0, eliminated: 0 };
  }

  // ═══════════════════ 人工兜底（admin） ═══════════════════

  /**
   * 人工强制推进当前阶段（兜底·单步·审计留痕）。
   * 与自动流转走同一套状态机方法：跳过时间闸与"成绩齐"闸，
   * 但不跳过"上一阶段须 DONE"闸（名单正确性红线）。
   */
  async forceAdvance(competitionId: string, seq: number, operatorId: string, ip?: string) {
    if (!Number.isInteger(seq) || seq < 1) throw new BadRequestException("seq 必须为 >=1 的整数");

    const comp = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, title: true, status: true },
    });
    if (!comp) throw new NotFoundException("赛事不存在");

    const stage = (await this.prisma.competitionStage.findUnique({
      where: { competitionId_seq: { competitionId, seq } },
    })) as StageRow | null;
    if (!stage) throw new NotFoundException("阶段不存在");

    const from = stage.status;
    let to: string;
    let result: TransitionResult;

    switch (stage.status) {
      case "PENDING":
        if (!FLOWABLE_COMPETITION_STATUS.includes(comp.status as never)) {
          throw new BadRequestException(`赛事当前状态 ${comp.status}，不可开赛`);
        }
        to = "RUNNING";
        result = await this.startStage(stage, comp);
        break;
      case "RUNNING":
        to = "JUDGING";
        result = await this.closeStage(stage);
        break;
      case "JUDGING":
        to = "DONE";
        result = await this.settleStage(stage, comp, { force: true });
        break;
      default:
        throw new BadRequestException("阶段已完结，无可推进状态");
    }

    if (!result.transitioned) {
      throw new BadRequestException(`推进失败：${result.reason ?? "状态已被并发变更"}`);
    }

    // 审计留痕（沿用 AuditLog 现有范式）
    await this.prisma.auditLog.create({
      data: {
        userId: operatorId,
        executor: operatorId,
        action: "competition.stage.force_advance",
        targetType: "CompetitionStage",
        targetId: stage.id,
        detail: `人工强制推进「${comp.title}」阶段${stage.seq}（${stage.name}）：${from}→${to}`,
        ip,
      },
    });

    return { stageId: stage.id, seq: stage.seq, from, to, ...result };
  }

  // ═══════════════════ 进程监控（admin） ═══════════════════

  /** 赛程流转进程监控：赛事整体 + 各阶段状态/名单规模/晋级淘汰计数 */
  async getFlowStatus(competitionId: string) {
    const comp = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true, title: true, status: true, format: true,
        startedAt: true, finishedAt: true,
      },
    });
    if (!comp) throw new NotFoundException("赛事不存在");

    const stages = (await this.prisma.competitionStage.findMany({
      where: { competitionId },
      orderBy: { seq: "asc" },
    })) as StageRow[];

    const [activeRegistrations, rankGroups] = await Promise.all([
      this.prisma.competitionRegistration.count({
        where: { competitionId, status: { in: [...ACTIVE_REG_STATUS] as never[] } },
      }),
      this.prisma.competitionRanking.groupBy({
        by: ["roundId", "status"],
        where: { competitionId },
        _count: { _all: true },
      }),
    ]);

    // roundId=stage.id 的阶段榜计数 + roundId=null 的终榜计数
    const countsByKey = new Map<string, Record<string, number>>();
    for (const g of rankGroups as { roundId: string | null; status: string; _count: { _all: number } }[]) {
      const key = g.roundId ?? "__final__";
      const bucket = countsByKey.get(key) ?? {};
      bucket[g.status] = g._count._all;
      countsByKey.set(key, bucket);
    }

    const currentStage = stages.find((s) => s.status !== "DONE") ?? null;

    return {
      competition: comp,
      now: new Date(),
      activeRegistrations,
      currentSeq: currentStage?.seq ?? null,
      stages: stages.map((s) => {
        const c = countsByKey.get(s.id) ?? {};
        return {
          id: s.id,
          seq: s.seq,
          name: s.name,
          format: s.format,
          status: s.status,
          startAt: s.startAt,
          endAt: s.endAt,
          advanceRule: s.advanceRule ?? null,
          promotedCount: c.PROMOTED ?? 0,
          eliminatedCount: c.ELIMINATED ?? 0,
        };
      }),
      finalRanking: countsByKey.get("__final__") ?? null,
    };
  }

  // ═══════════════════ 内部工具 ═══════════════════

  /**
   * 阶段有效名单：
   * - 第一阶段 = 全体有效报名（REGISTERED/QUALIFIED）
   * - 后续阶段 = 上一阶段阶段榜的 PROMOTED 用户（权威真源）
   */
  private async eligibleRegistrations(
    stage: StageRow,
  ): Promise<{ id: string; userId: string; extraData: unknown }[]> {
    if (stage.seq <= 1) {
      return this.prisma.competitionRegistration.findMany({
        where: {
          competitionId: stage.competitionId,
          status: { in: [...ACTIVE_REG_STATUS] as never[] },
        },
        select: { id: true, userId: true, extraData: true },
      });
    }

    const prev = await this.prisma.competitionStage.findUnique({
      where: { competitionId_seq: { competitionId: stage.competitionId, seq: stage.seq - 1 } },
    });
    if (!prev) return [];

    const promoted = await this.prisma.competitionRanking.findMany({
      where: { competitionId: stage.competitionId, roundId: prev.id, status: "PROMOTED" },
      select: { userId: true },
    });
    if (promoted.length === 0) return [];

    return this.prisma.competitionRegistration.findMany({
      where: {
        competitionId: stage.competitionId,
        userId: { in: promoted.map((p) => p.userId) },
        status: { in: [...ACTIVE_REG_STATUS] as never[] },
      },
      select: { id: true, userId: true, extraData: true },
    });
  }

  /** Registration.extraData 写 stageProgress 快照（展示用·逐条 update 保留原有 extraData） */
  private async snapshotProgress(
    stage: StageRow,
    ranked: { id: string; userId: string; extraData: unknown; total: number }[],
    statusOf: (index: number) => string,
  ) {
    for (let i = 0; i < ranked.length; i++) {
      const p = ranked[i];
      const base = (p.extraData && typeof p.extraData === "object" ? p.extraData : {}) as Record<string, unknown>;
      await this.prisma.competitionRegistration.update({
        where: { id: p.id },
        data: {
          extraData: {
            ...base,
            stageProgress: {
              stageId: stage.id,
              seq: stage.seq,
              stageName: stage.name,
              rank: i + 1,
              score: p.total,
              status: statusOf(i),
              settledAt: new Date().toISOString(),
            },
          } as never,
        },
      });
    }
  }

  /**
   * 站内通知（redis setNX per stage+event 去重）：
   * 抢到 key 才发，cron 重跑/人工重放均不重复打扰。
   */
  private async notifyOnce(
    stageId: string,
    event: string,
    rows: { userId: string; type: string; title: string; content: string; targetType: string; targetId: string }[],
  ): Promise<boolean> {
    if (rows.length === 0) return false;
    const fresh = await this.redis.setNX(
      `competition:stage:notify:${stageId}:${event}`,
      "1",
      NOTIFY_DEDUP_TTL,
    );
    if (!fresh) return false;
    try {
      await this.prisma.notification.createMany({ data: rows });
      return true;
    } catch (err) {
      // 通知失败不阻塞状态机主流程（去重 key 已占用，人工可查日志补发）
      this.logger.error(`阶段通知写入失败 stage=${stageId} event=${event}: ${(err as Error).message}`);
      return false;
    }
  }

  private fmt(d: Date | string) {
    return new Date(d).toLocaleString("zh-CN", { hour12: false });
  }
}
