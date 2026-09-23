import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 排盘报告的应验回访（2026-09-19）
 *
 * ══ 这件事为什么值得单做一个服务 ══
 *
 * 阴盘奇门这类「取象直读」的方法，光有象意词典和方法条目是教不会的——
 * 「看到这组符号该说哪句话」只能靠案例。而网上流传的案例绝大多数只有
 * 「盘面 + 结论」，中间的推理链恰恰被省略（各家秘而不宣的正是这一段），
 * 靠抄抄不出一套能训练模型的东西。
 *
 * 真正能持续长大的案例来源只有一个：**我们自己的排盘 + 回访**。
 * 报告已经存了（AiAnalysisRecord.analysisContent 是全文，含推理链），
 * 缺的只是「后来到底怎么样了」。补上这一环，每一次排盘就是一条候选案例。
 *
 * ══ 三条底线，写在代码里而不是文档里 ══
 *
 * **一、报告在前、结果在后。** 见 `submit()` 里的时间校验与数据库 CHECK 约束。
 * 断语写在结果发生之前，这条记录才算数。否则就是术数圈最常见的**事后追认**
 * ——先知道结果，再回头到盘上找理由，这种案例什么也证明不了，
 * 拿去训练模型只会把「怎么圆都行」这个毛病固化下来。
 *
 * **二、必须收未命中，且统计不许按 verdict 过滤。** 见 `stats()` 的注释。
 * 只留说对的，知识库就变成自我强化；而且 MISS 的案例价值常常高于 HIT——
 * 它能指出取象在哪一步偏了，这是 HIT 给不了的信息。
 *
 * **三、原始反馈不是案例。** `lesson`（可迁移规律）必须人工撰写并经审核。
 * 反馈只是素材；把它变成模型能复用的判断模式，是另一件需要人来做的事。
 */
@Injectable()
export class PaipanCaseFeedbackService {
  private readonly logger = new Logger(PaipanCaseFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交回访。
   *
   * 必须能找到对应的报告——没有报告就没有「断语」，没有断语的「结果」不构成案例，
   * 只是一条孤立的经历。
   */
  async submit(
    userId: string,
    input: {
      paipanRecordId: string;
      verdict: "HIT" | "PARTIAL" | "MISS" | "UNKNOWN";
      outcome: string;
      whichRight?: string;
      whichWrong?: string;
      channel?: "prompted" | "voluntary";
      consent?: boolean;
    },
  ) {
    const record = await this.prisma.paipanRecord.findFirst({
      where: { id: input.paipanRecordId, userId },
      select: { id: true, paipanType: true, inputParams: true },
    });
    if (!record) {
      throw new BusinessException(ErrorCode.PAIPAN_RECORD_NOT_FOUND, "排盘记录不存在或不属于当前用户");
    }

    // 找这盘对应的报告。取最早的一份——回访针对的是「最初那句断语」，
    // 而不是后来重新生成、可能已经受到中间信息影响的版本。
    const analysis = await this.prisma.aiAnalysisRecord.findFirst({
      where: { userId, paipanRecordId: input.paipanRecordId, scene: "paipan_report" },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (!analysis) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "这一盘还没有生成过报告，无法回访——没有断语就谈不上应验与否",
      );
    }

    const now = new Date();
    if (now < analysis.createdAt) {
      // 正常不会发生（除非系统时间异常），但这条底线值得显式挡一道
      throw new BusinessException(ErrorCode.BAD_REQUEST, "回访时间早于报告生成时间，数据异常");
    }

    const matter = String((record.inputParams as Record<string, unknown>)?.matter ?? "").slice(0, 60);

    return this.prisma.paipanCaseFeedback.create({
      data: {
        userId,
        paipanRecordId: record.id,
        analysisId: analysis.id,
        paipanType: String(record.paipanType || "").toLowerCase(),
        matter,
        reportedAt: analysis.createdAt,
        outcomeAt: now,
        verdict: input.verdict,
        outcome: input.outcome.slice(0, 4000),
        whichRight: input.whichRight?.slice(0, 2000) || null,
        whichWrong: input.whichWrong?.slice(0, 2000) || null,
        channel: input.channel ?? "prompted",
        consent: Boolean(input.consent),
      },
      select: { id: true, verdict: true, reportedAt: true, outcomeAt: true, status: true },
    });
  }

  /**
   * 哪些盘该回访了。
   *
   * 挑选逻辑：已出报告、尚未回访、且距报告生成已过了足够时间。
   * 「足够」按所问之事的性质定——问今天的事第二天就能回访，问今年的事得等几个月。
   * 这里只给一个保守的默认（14 天），具体节奏由运营按事类调整。
   *
   * ⚠️ 回访是**主动推送**，会打扰用户，所以：
   *   - 同一个用户短期内不重复打扰（由调用方按推送频控处理）
   *   - 文案必须允许「说不清 / 不想说」（对应 verdict=UNKNOWN），
   *     不能设计成「必须给个说法」——逼出来的反馈质量最差，还会伤用户
   */
  async dueForFollowUp(opts?: { paipanType?: string; minDays?: number; limit?: number }) {
    const minDays = opts?.minDays ?? 14;
    const before = new Date(Date.now() - minDays * 86400_000);

    const analyses = await this.prisma.aiAnalysisRecord.findMany({
      where: {
        scene: "paipan_report",
        createdAt: { lte: before },
        paipanRecordId: { not: null },
        ...(opts?.paipanType
          ? { paipanRecord: { paipanType: { equals: opts.paipanType, mode: "insensitive" as const } } }
          : {}),
      },
      select: { id: true, userId: true, paipanRecordId: true, createdAt: true, inputSummary: true },
      orderBy: { createdAt: "asc" },
      take: Math.min(opts?.limit ?? 50, 200),
    });
    if (!analyses.length) return [];

    // 已回访过的排除掉
    const done = new Set(
      (
        await this.prisma.paipanCaseFeedback.findMany({
          where: { paipanRecordId: { in: analyses.map((a) => a.paipanRecordId!).filter(Boolean) } },
          select: { paipanRecordId: true },
        })
      ).map((x) => x.paipanRecordId),
    );

    return analyses
      .filter((a) => a.paipanRecordId && !done.has(a.paipanRecordId))
      .map((a) => ({
        paipanRecordId: a.paipanRecordId!,
        userId: a.userId,
        reportedAt: a.createdAt,
        summary: a.inputSummary ?? "",
        daysSince: Math.floor((Date.now() - a.createdAt.getTime()) / 86400_000),
      }));
  }

  /**
   * 应验统计。
   *
   * ⚠️ **分母必须是同期全部回访，不许按 verdict 过滤后再算比例。**
   * 这不是统计洁癖：只要允许「先筛掉不想要的，再算准确率」，
   * 这个数字就失去全部意义，而且一定会被拿去做宣传。
   *
   * 另外 `prompted`（回访推送）与 `voluntary`（用户自发）分开统计——
   * 自发反馈有明显的选择偏差（多半是特别准或特别不准才有动力来说），
   * 混在一起算出来的比例不能代表真实水平。
   *
   * UNKNOWN 单列、不并入分母之外，也不当成命中：它表示「还看不出来」，
   * 是一种诚实的状态，藏起来反而会让分母失真。
   */
  async stats(opts?: { paipanType?: string; since?: Date }) {
    const where = {
      ...(opts?.paipanType ? { paipanType: opts.paipanType } : {}),
      ...(opts?.since ? { outcomeAt: { gte: opts.since } } : {}),
    };

    const rows = await this.prisma.paipanCaseFeedback.groupBy({
      by: ["paipanType", "channel", "verdict"],
      where,
      _count: { _all: true },
    });

    const byKey = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const key = `${r.paipanType}|${r.channel}`;
      const bucket = byKey.get(key) ?? { HIT: 0, PARTIAL: 0, MISS: 0, UNKNOWN: 0 };
      bucket[r.verdict] = r._count._all;
      byKey.set(key, bucket);
    }

    return [...byKey.entries()].map(([key, b]) => {
      const [paipanType, channel] = key.split("|");
      const total = b.HIT + b.PARTIAL + b.MISS + b.UNKNOWN;
      return {
        paipanType,
        channel,
        ...b,
        total,
        // 命中率以**全部回访**为分母，UNKNOWN 也算在内——它确实发生了
        hitRate: total ? Number((b.HIT / total).toFixed(3)) : null,
        // 「说对了一部分或全部」的比例，同样以全部为分母
        anyRightRate: total ? Number(((b.HIT + b.PARTIAL) / total).toFixed(3)) : null,
        note:
          channel === "voluntary"
            ? "用户自发反馈，存在选择偏差，不可与回访推送的数据合并解读"
            : "回访推送，偏差较小",
      };
    });
  }

  /**
   * 审核：把一条反馈定为案例。
   *
   * `lesson`（可迁移规律）是必填的——这一段才是能教给模型的东西。
   * 没有它，这条记录只是一桩轶事：知道某年某月某人问了某事、后来如何，
   * 但下一个盘遇到类似符号时，模型从中学不到任何可复用的判断。
   */
  async review(
    reviewerId: string,
    id: string,
    input: { status: "APPROVED" | "REJECTED"; lesson?: string; reviewNote?: string },
  ) {
    if (input.status === "APPROVED" && !input.lesson?.trim()) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "通过审核必须填写「可迁移规律」——没有它这条记录只是轶事，教不了模型任何东西",
      );
    }
    const exists = await this.prisma.paipanCaseFeedback.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "回访记录不存在");

    return this.prisma.paipanCaseFeedback.update({
      where: { id },
      data: {
        status: input.status,
        lesson: input.lesson?.trim() || null,
        reviewNote: input.reviewNote?.slice(0, 500) || null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true, reviewedAt: true },
    });
  }

  /** 待审列表 */
  async listPending(opts?: { paipanType?: string; limit?: number }) {
    return this.prisma.paipanCaseFeedback.findMany({
      where: { status: "PENDING", ...(opts?.paipanType ? { paipanType: opts.paipanType } : {}) },
      orderBy: { outcomeAt: "desc" },
      take: Math.min(opts?.limit ?? 50, 200),
      select: {
        id: true, paipanType: true, matter: true, verdict: true, outcome: true,
        whichRight: true, whichWrong: true, channel: true,
        reportedAt: true, outcomeAt: true, paipanRecordId: true, analysisId: true,
      },
    });
  }

  /**
   * 导出已审核的案例，形态与 `knowledge-seed/yinpan-cases.ts` 的七段结构对齐。
   *
   * 注意这里**只导出结构化素材，不直接写进知识库**。
   * 从「一条审核过的反馈」到「一条能进知识库的案例条目」，中间还要补
   * 盘面与逐符取象两段（要回到报告正文里摘），这一步仍需人过目——
   * 自动写库等于让未经复核的内容直接影响所有用户的报告，风险不对等。
   */
  async exportApproved(paipanType: string, limit = 100) {
    const rows = await this.prisma.paipanCaseFeedback.findMany({
      where: { status: "APPROVED", paipanType },
      orderBy: { reviewedAt: "desc" },
      take: Math.min(limit, 500),
      select: {
        id: true, matter: true, verdict: true, outcome: true,
        whichRight: true, whichWrong: true, lesson: true,
        reportedAt: true, outcomeAt: true, analysisId: true, consent: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      分段: {
        问事: r.matter || "（未填所问）",
        盘面: `见报告 ${r.analysisId ?? "(已清理)"}——导出时需回正文摘录用神落宫与宫上符号`,
        取象: "（需从报告正文的「逐符取象」一节摘录）",
        修正: "（需从报告正文的「四害与生克修正」一节摘录）",
        断语: "（需从报告正文的「这一卦怎么读」一节摘录）",
        反馈:
          `${{ HIT: "基本应验", PARTIAL: "部分应验", MISS: "没有应验", UNKNOWN: "尚看不出" }[r.verdict]}` +
          `（报告 ${r.reportedAt.toISOString().slice(0, 10)} → 回访 ${r.outcomeAt.toISOString().slice(0, 10)}）：${r.outcome}` +
          `${r.whichRight ? `｜说对的：${r.whichRight}` : ""}${r.whichWrong ? `｜说错的：${r.whichWrong}` : ""}`,
        可迁移: r.lesson ?? "",
      },
      可公开: r.consent,
    }));
  }
}
