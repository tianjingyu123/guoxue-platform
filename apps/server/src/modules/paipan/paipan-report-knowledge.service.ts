import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination } from "../../common/pagination";

/**
 * 排盘报告知识库检索（小卜 AI · S07）
 *
 * 用户确认（2026-09-17）：报告依据来自专门建设的知识库——排盘计算器盘面 + 主流门派理论 + 指定几本古籍的原文出处，
 * 不以现有整个古籍库为知识库（范围过大、没有重点，古籍质量直接影响报告质量）。
 *
 * - 只返回 status=APPROVED 的条目；DRAFT/RETIRED 一律不可引用
 * - 门派：返回通用条目（school=null）+ 指定门派条目；未指定门派时只用通用条目
 * - 按盘面信号与条目 tags 精确匹配打分，每条带命中理由；一条都命中不了就返回空，由报告明确说明无依据
 */
export interface ReportSignal {
  value: string;
  weight: number;
  reason: string;
}

export type ReportKnowledgeKind = "school_theory" | "classic_excerpt" | "knowledge_point";
/** 来源类别：只有公版古籍允许按“原文”展示 */
export type KnowledgeSourceKind = "classic_public" | "modern_work" | "web" | "oral" | "platform_expert";
export const KNOWLEDGE_SOURCE_KINDS: KnowledgeSourceKind[] = ["classic_public", "modern_work", "web", "oral", "platform_expert"];
export interface KnowledgeSourceRef {
  label: string;
  url?: string;
  note?: string;
}

export interface ReportKnowledgeInput {
  paipanType?: string;
  school?: string | null;
  kind: ReportKnowledgeKind;
  topic: string;
  tags: string[];
  title: string;
  content: string;
  bookTitle?: string | null;
  chapterTitle?: string | null;
  classicBookId?: string | null;
  classicChapterId?: string | null;
  sourceKind?: KnowledgeSourceKind;
  sourceRefs?: KnowledgeSourceRef[];
  restated?: boolean;
  debateKey?: string | null;
  stance?: KnowledgeStance;
}

/**
 * 条目在所属议题里的位置。
 * 报告要做的是「汇总 + 梳理 + 主线引导」，因此必须知道哪条是共识、哪条是另一说、哪条是我们的主线，
 * 否则摆出来的就只是一堆互相打架的说法。
 */
export type KnowledgeStance = "consensus" | "mainstream" | "alternative" | "minority" | "platform_line";

export const STANCE_LABEL: Record<KnowledgeStance, string> = {
  consensus: "各派共识",
  mainstream: "主流说法",
  alternative: "另一说",
  minority: "少数说",
  platform_line: "本报告主线",
};

/** 立场加权：主线与共识要挤得进来，否则报告又退回成一家之言 */
const STANCE_BONUS: Record<KnowledgeStance, number> = {
  platform_line: 6,
  consensus: 4,
  mainstream: 0,
  alternative: 1,
  minority: 0,
};

/**
 * 每份报告至少给几条公版古籍原文留位。
 * 二是权衡的结果：一条太单薄（正好碰上不贴题的那条就白留），
 * 三条以上会挤掉议题——议题是用户要的主线，原文是佐证，主次不能颠倒。
 */
const QUOTE_RESERVE = 2;

/** 展示顺序：先讲共识，再讲主流，最后讲另一说与少数说 */
const STANCE_ORDER: KnowledgeStance[] = ["consensus", "mainstream", "alternative", "minority", "platform_line"];

/** 一个议题下的各家观点对照 */
export interface ReportDebate {
  key: string;
  topic: string;
  /** 各家说法，按共识→主流→另一说→少数说排列 */
  views: ReportKnowledgeHit[];
  /** 平台主线：这个议题我们取哪一说、为什么 */
  platformLine: ReportKnowledgeHit | null;
  hasConflict: boolean;
  score: number;
}

export interface ReportKnowledgeHit {
  id: string;
  kind: ReportKnowledgeKind;
  school: string | null;
  topic: string;
  title: string;
  content: string;
  bookTitle: string | null;
  chapterTitle: string | null;
  classicBookId: string | null;
  classicChapterId: string | null;
  version: number;
  score: number;
  matchedOn: string[];
  /** 可否按“原文”展示并跳转读原书；只有公版古籍为 true */
  quotable: boolean;
  sourceKind: string;
  /** 议题键：同键的条目在报告里聚成一组对照 */
  debateKey: string | null;
  stance: KnowledgeStance;
}

@Injectable()
export class PaipanReportKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 八字盘面信号：格局 > 用神 > 日主 > 月令 > 神煞 */
  baziSignals(facts: { geJu?: string; yongShen?: string; dayGan?: string; monthZhi?: string; shenShaNames?: string[] }): ReportSignal[] {
    const out: ReportSignal[] = [];
    const push = (v: string | undefined, weight: number, reason: string) => {
      const s = (v || "").trim();
      if (s) out.push({ value: s, weight, reason });
    };
    push(facts.geJu, 10, "格局");
    push(facts.yongShen ? `用神${facts.yongShen}` : undefined, 8, "用神");
    push(facts.dayGan, 6, "日主");
    push(facts.monthZhi ? `${facts.monthZhi}月` : undefined, 4, "月令");
    for (const s of (facts.shenShaNames ?? []).slice(0, 6)) push(s, 3, "神煞");
    return out;
  }

  /**
   * @param input.paipanType 单个盘类，或多个——**阳盘命理就是奇门盘加八字命理两套东西**，
   *   它的报告本来就要同时引奇门的落宫取用与八字的格局大运，
   *   给它单独再抄一份知识条目既重复又会走样，不如让它直接检索这两类。
   */
  /**
   * 按 tag 精确取断语，供**前端排盘页**使用（2026-09-19）。
   *
   * ══ 与 findEvidence 的分工 ══
   *
   * `findEvidence` 是给报告用的：打分、排序、限量、凑观点对照，产出的是「证据集」。
   * 前端排盘页要的是另一回事——盘上某一宫是「山2向5」，就要**这一条**的文案，
   * 不需要打分也不能被别的条目挤掉。所以单开一个方法，按 tag 直取、原样返回。
   *
   * ══ 为什么要有这个接口 ══
   *
   * 决策人定的分层方案：算法留前端（保离线可用），**断语收回后端**。
   * 直接动因是 2026-09-19 查出前端有四处在对用户预言生死病苦
   * （玄空「二五交加必损主，重病、死亡」、姓名学「凶变夭折」等，详见接续文档 §2.79），
   * 而后端知识库的平台主线明确写着「不断生死病苦」——两边口径打架。
   * 断语集中到后端之后，红线只需守一处，也不会再漂移。
   *
   * ══ 只返回 APPROVED ══
   *
   * 与报告同一口径：草稿与已停用的条目一律不出，避免未经审核的文案直接面向用户。
   */
  async lookupByTags(input: {
    paipanType: string;
    tags: string[];
  }): Promise<Record<string, { title: string; content: string; topic: string }>> {
    const tags = [...new Set(input.tags.map((t) => String(t ?? "").trim()).filter(Boolean))].slice(0, 100);
    if (!tags.length) return {};

    const rows = await this.prisma.paipanReportKnowledge.findMany({
      where: { paipanType: input.paipanType, status: "APPROVED", tags: { hasSome: tags } },
      select: { tags: true, title: true, content: true, topic: true, version: true },
      take: 300,
    });

    // 一个 tag 可能命中多条（如象意词典里的别名），取版本最高的那条——
    // 版本号随审核递增，高版本即最新通过审核的表述
    const out: Record<string, { title: string; content: string; topic: string; _v: number }> = {};
    for (const r of rows) {
      for (const t of r.tags) {
        if (!tags.includes(t)) continue;
        if (!out[t] || r.version > out[t]._v) {
          out[t] = { title: r.title, content: r.content, topic: r.topic, _v: r.version };
        }
      }
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { title: v.title, content: v.content, topic: v.topic }]));
  }

  async findEvidence(input: {
    paipanType: string | string[];
    school?: string;
    signals: ReportSignal[];
    limit?: number;
  }): Promise<ReportKnowledgeHit[]> {
    if (!input.signals.length) return [];
    const values = input.signals.map((s) => s.value);
    const types = Array.isArray(input.paipanType) ? input.paipanType : [input.paipanType];
    const rows = await this.prisma.paipanReportKnowledge.findMany({
      where: {
        paipanType: types.length > 1 ? { in: types } : types[0],
        status: "APPROVED",
        // 不按门派过滤：报告的定位就是「各门各派对这个盘怎么看」的汇总，
        // 早先只取 school=null 的通用条目，等于把子平、盲派、飞星的说法全挡在外面，
        // 报告也就没有对照可言。指定了流派的，在下面打分时加权靠前，而不是把别派排除。
        tags: { hasSome: values },
      },
      take: 200,
    });

    const scored = rows
      .map((r) => {
        const hits = input.signals.filter((s) => r.tags.includes(s.value));
        return {
          id: r.id,
          kind: (["classic_excerpt", "knowledge_point"].includes(r.kind) ? r.kind : "school_theory") as ReportKnowledgeKind,
          // 可引用性由「条目类型 + 来源」共同判定，不单看 quotable 列（旧数据该列可能未回填）
          quotable: r.kind === "classic_excerpt" && (r.sourceKind ?? "classic_public") === "classic_public",
          sourceKind: r.sourceKind || "classic_public",
          school: r.school,
          topic: r.topic,
          title: r.title,
          content: r.content,
          bookTitle: r.bookTitle,
          chapterTitle: r.chapterTitle,
          classicBookId: r.classicBookId,
          classicChapterId: r.classicChapterId,
          version: r.version,
          debateKey: r.debateKey ?? null,
          stance: ((r.stance || "mainstream") as KnowledgeStance),
          // 指定门派条目优先于通用条目；原文出处与理论要点同分，由模型按小节组合。
          // 立场加权是为了让「主线」与「共识」挤得进来：报告要给用户一条线，
          // 不能被同一派的若干高分条目把对照位占满，那样读者看到的还是一家之言。
          score:
            hits.reduce((sum, h) => sum + h.weight, 0) +
            (r.school && r.school === input.school ? 2 : 0) +
            STANCE_BONUS[(r.stance || "mainstream") as KnowledgeStance],
          matchedOn: [...new Set(hits.map((h) => `${h.reason}「${h.value}」`))],
        };
      })
      .filter((r) => r.score > 0 && r.content.trim())
      .sort((a, b) => b.score - a.score);

    return this.keepDebatesWhole(scored, input.limit ?? 14);
  }

  /**
   * 议题保量：命中的议题要整组进来，不能被零散的单点条目挤掉。
   *
   * 只按分数截断会出问题：一个议题的五条（共识、主流、另一说、网上讲法、我们的主线）
   * 分数各不相同，截断往往只留下其中两三条——对照就残了，主线甚至可能被切掉，
   * 那一议题就整个不展示。报告最有价值的部分恰恰是这些成组的观点梳理，
   * 所以先给议题留够位置，剩下的名额再给单点知识。
   */
  private keepDebatesWhole(scored: ReportKnowledgeHit[], limit: number): ReportKnowledgeHit[] {
    const groups = new Map<string, ReportKnowledgeHit[]>();
    const singles: ReportKnowledgeHit[] = [];
    for (const r of scored) {
      if (!r.debateKey) singles.push(r);
      else groups.set(r.debateKey, [...(groups.get(r.debateKey) ?? []), r]);
    }
    if (!groups.size) return scored.slice(0, limit);

    // 议题按组内最高分排序；每组最多带 5 条（共识 + 主流 + 另一说 + 网上讲法 + 主线）
    const ordered = [...groups.values()]
      .map((g) => g.slice(0, 5))
      .sort((a, b) => b[0].score - a[0].score);

    /**
     * 古籍原文保底。
     *
     * 报告的定位是「用户不必自己去查哪本古籍怎么说」，原文正是这句话的兑现；
     * 但立场加权只加给议题条目，原文既不是议题、分数又低，排下来必然垫底——
     * 实测一份真实八字报告的 20 条依据里**原文 0 条**，全被门派理论和议题挤掉了。
     * 所以先把名额从总数里扣出来留给原文，议题在剩下的预算里排。
     */
    const quotes = singles.filter((s) => s.quotable).slice(0, QUOTE_RESERVE);
    const debateBudget = limit - quotes.length;

    const out: ReportKnowledgeHit[] = [];
    for (const g of ordered) {
      // 放不下整组就不放了：残缺的对照比没有更糟
      if (out.length + g.length > debateBudget) break;
      out.push(...g);
    }
    out.push(...quotes);
    for (const s of singles) {
      if (out.length >= limit) break;
      if (quotes.includes(s)) continue;
      out.push(s);
    }
    return out;
  }

  /**
   * 把命中的依据按议题聚成对照组。
   *
   * 这是报告从「条目罗列」变成「观点梳理」的那一步：同一个议题下，
   * 各派分别怎么说、共识是什么、我们的主线取哪一说——都在一组里讲清楚，
   * 而不是把互相打架的说法平行摆出来让用户自己发懵。
   *
   * 没有 debateKey 的条目不参与对照（它们只是单点知识，报告里正常引用）。
   */
  groupDebates(hits: ReportKnowledgeHit[]): ReportDebate[] {
    const byKey = new Map<string, ReportKnowledgeHit[]>();
    for (const h of hits) {
      if (!h.debateKey) continue;
      const list = byKey.get(h.debateKey) ?? [];
      list.push(h);
      byKey.set(h.debateKey, list);
    }

    const out: ReportDebate[] = [];
    for (const [key, list] of byKey) {
      const line = list.find((x) => x.stance === "platform_line");
      const views = list
        .filter((x) => x.stance !== "platform_line")
        .sort((a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || b.score - a.score);
      // 只有一种说法时不算「对照」，当作普通依据即可，免得把共识说成争论
      if (!views.length) continue;
      const stances = new Set(views.map((v) => v.stance));
      out.push({
        key,
        // 议题标题取自条目的 topic：同一议题的条目 topic 应当一致
        topic: (line ?? views[0]).topic,
        views,
        platformLine: line ?? null,
        /** 有分歧＝出现了共识以外的两种及以上立场，或明确标了另一说/少数说 */
        hasConflict: stances.has("alternative") || stances.has("minority"),
        score: list.reduce((sum, x) => sum + x.score, 0),
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  // ───────── 知识库管理（后台）─────────
  // 状态流转：DRAFT →(审核通过) APPROVED →(停用) RETIRED；APPROVED 条目被修改时版本号 +1 并退回 DRAFT，重新审核后才可被新报告引用。
  // 旧报告保存了引用时的条目 id、版本号与摘录，不受后续修改影响。

  private normalize(input: Partial<ReportKnowledgeInput>) {
    const tags = [...new Set((input.tags ?? []).map((t) => String(t).trim()).filter(Boolean))].slice(0, 30);
    return {
      ...(input.paipanType !== undefined ? { paipanType: input.paipanType || "bazi" } : {}),
      ...(input.school !== undefined ? { school: input.school?.trim() || null } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.topic !== undefined ? { topic: input.topic.trim() } : {}),
      ...(input.tags !== undefined ? { tags } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      ...(input.bookTitle !== undefined ? { bookTitle: input.bookTitle?.replace(/[《》]/g, "").trim() || null } : {}),
      ...(input.chapterTitle !== undefined ? { chapterTitle: input.chapterTitle?.trim() || null } : {}),
      ...(input.classicBookId !== undefined ? { classicBookId: input.classicBookId || null } : {}),
      ...(input.classicChapterId !== undefined ? { classicChapterId: input.classicChapterId || null } : {}),
      ...(input.sourceKind !== undefined ? { sourceKind: input.sourceKind } : {}),
      ...(input.restated !== undefined ? { restated: !!input.restated } : {}),
      ...(input.sourceRefs !== undefined
        ? {
            sourceRefs: (input.sourceRefs ?? [])
              .map((r) => ({
                label: String(r?.label ?? "").trim().slice(0, 200),
                url: r?.url ? String(r.url).trim().slice(0, 500) : undefined,
                note: r?.note ? String(r.note).trim().slice(0, 300) : undefined,
              }))
              .filter((r) => r.label)
              .slice(0, 10),
          }
        : {}),
    };
  }

  private assertComplete(row: { kind: string; content: string; title: string; topic: string; tags: string[]; bookTitle?: string | null }) {
    if (!row.title || !row.topic || !row.content) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "标题、主题和正文不能为空");
    }
    if (!row.tags.length) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "至少填写一个匹配标签，否则报告无法命中该条目");
    }
    if (row.kind === "classic_excerpt" && !row.bookTitle) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "古籍原文条目必须填写书名");
    }
    this.assertSourcePolicy(row);
  }

  /**
   * 来源与可引用性规则（著作权红线）
   *
   * 著作权保护表达而非思想：命理的理论、规则、方法本身不受保护，用自己的话重述后入库安全；
   * 但逐字复制他人表达（网络文章、现代著作、点校本），即使注明来源也不免除侵权责任。
   *
   * 所以：
   * - 只有公版古籍白文可作为“原文”展示并跳转读原书（kind=classic_excerpt + sourceKind=classic_public）
   * - 其余来源（网络、现代著作、口传）一律以“知识要点”呈现，必须是自行重述并留下来源线索
   */
  private assertSourcePolicy(row: {
    kind: string;
    sourceKind?: string;
    restated?: boolean;
    sourceRefs?: unknown;
    bookTitle?: string | null;
  }) {
    const sourceKind = row.sourceKind || "classic_public";
    if (!KNOWLEDGE_SOURCE_KINDS.includes(sourceKind as KnowledgeSourceKind)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "来源类别不合法");
    }
    if (row.kind === "classic_excerpt") {
      if (sourceKind !== "classic_public") {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          "只有公版古籍白文可作为原文条目；现代著作与网络资料请改用「知识要点」并自行重述",
        );
      }
      return;
    }
    // 知识要点 / 门派理论：必须重述，且非平台专家原创时要留来源线索
    if (row.restated === false) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "非古籍原文条目必须用自己的话重述后入库（逐字摘录他人表达即使注明来源也不免责）",
      );
    }
    const refs = Array.isArray(row.sourceRefs) ? row.sourceRefs : [];
    if (sourceKind !== "platform_expert" && refs.length === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请至少填写一条来源线索，便于审核追溯与交叉验证");
    }
  }

  async list(query: { paipanType?: string; status?: string; school?: string; topic?: string; kind?: string; keyword?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const where: any = { paipanType: query.paipanType || "bazi" };
    if (query.status) where.status = query.status;
    if (query.school === "_common") where.school = null;
    else if (query.school) where.school = query.school;
    if (query.topic) where.topic = query.topic;
    if (query.kind) where.kind = query.kind;
    if (query.keyword?.trim()) {
      const kw = query.keyword.trim();
      where.OR = [{ title: { contains: kw } }, { content: { contains: kw } }, { bookTitle: { contains: kw } }, { tags: { has: kw } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.paipanReportKnowledge.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: pageSize }),
      this.prisma.paipanReportKnowledge.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  async get(id: string) {
    const row = await this.prisma.paipanReportKnowledge.findUnique({ where: { id } });
    if (!row) throw new BusinessException(ErrorCode.NOT_FOUND, "知识条目不存在");
    return row;
  }

  /** quotable 由服务端判定，不接受客户端传入：只有公版古籍原文条目可按“原文”展示 */
  private resolveQuotable(row: { kind?: string; sourceKind?: string }) {
    return row.kind === "classic_excerpt" && (row.sourceKind || "classic_public") === "classic_public";
  }

  /** 默认来源：古籍原文条目按公版古籍，其余按平台自行整理（平台撰写无需外部来源线索） */
  private defaultSourceKind(kind?: string): KnowledgeSourceKind {
    return kind === "classic_excerpt" ? "classic_public" : "platform_expert";
  }

  async create(input: ReportKnowledgeInput, operatorId: string) {
    const data = {
      paipanType: "bazi",
      school: null,
      bookTitle: null,
      sourceKind: this.defaultSourceKind(input.kind),
      restated: input.kind !== "classic_excerpt",
      ...this.normalize(input),
    } as any;
    this.assertComplete(data);
    return this.prisma.paipanReportKnowledge.create({
      data: { ...data, quotable: this.resolveQuotable(data), status: "DRAFT", version: 1, createdBy: operatorId },
    });
  }

  async update(id: string, input: Partial<ReportKnowledgeInput>, operatorId: string) {
    const current = await this.get(id);
    if (current.status === "RETIRED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已停用的条目不能修改，请新建条目");
    }
    const patch = this.normalize(input) as Record<string, unknown>;
    const merged = { ...current, ...patch } as any;
    this.assertComplete(merged);
    patch.quotable = this.resolveQuotable(merged);
    const wasApproved = current.status === "APPROVED";
    // 条件更新防并发覆盖：只在状态与版本未变时写入
    const result = await this.prisma.paipanReportKnowledge.updateMany({
      where: { id, status: current.status, version: current.version },
      data: {
        ...patch,
        ...(wasApproved
          ? { status: "DRAFT", version: current.version + 1, reviewedBy: null, reviewedAt: null, reviewNote: `由 ${operatorId} 修改，待重新审核` }
          : {}),
      },
    });
    if (result.count !== 1) {
      throw new BusinessException(ErrorCode.CONFLICT, "条目已被他人修改，请刷新后重试");
    }
    return this.get(id);
  }

  async approve(id: string, reviewerId: string, note?: string) {
    const current = await this.get(id);
    if (current.status !== "DRAFT") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "只有草稿可以审核通过");
    }
    this.assertComplete(current);
    const result = await this.prisma.paipanReportKnowledge.updateMany({
      where: { id, status: "DRAFT", version: current.version },
      data: { status: "APPROVED", reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note?.trim() || null },
    });
    if (result.count !== 1) {
      throw new BusinessException(ErrorCode.CONFLICT, "条目已被他人修改，请刷新后重试");
    }
    return this.get(id);
  }

  async retire(id: string, operatorId: string, note?: string) {
    const current = await this.get(id);
    if (current.status === "RETIRED") return current;
    await this.prisma.paipanReportKnowledge.update({
      where: { id },
      data: { status: "RETIRED", reviewNote: note?.trim() || `由 ${operatorId} 停用` },
    });
    return this.get(id);
  }

  /** 后台试匹配：输入盘面信号，查看会命中哪些已审核条目 */
  async previewMatch(input: { school?: string; geJu?: string; yongShen?: string; dayGan?: string; monthZhi?: string; shenShaNames?: string[] }) {
    const signals = this.baziSignals(input);
    const hits = await this.findEvidence({ paipanType: "bazi", school: input.school, signals, limit: 8 });
    return { signals, hits };
  }
}
