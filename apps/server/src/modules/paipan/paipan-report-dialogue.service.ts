import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PreferredNameService } from "../dialogue/preferred-name.service";
import { BusinessException } from "../../common/business.exception";
import { buildSceneSystemPrefix, detectReferral, referralCard } from "../dialogue/dialogue-policy";
import { ErrorCode } from "../../common/error-codes";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { ContentGuideService, type GuideCard } from "../search/content-guide.service";
import type { DialogueOutlineItem, Reference, ReportSection, StructuredReport } from "./paipan-report.service";

/**
 * 小卜 · 围绕报告的问答（S07 第二步，文字版；语音接通后沿用同一套规则）
 *
 * 设计依据《小卜命书设计方案》：
 * - 对话主线是报告目录（dialogueOutline）：先定位问题属于哪一节，用该节已审核依据回答，再回到主线
 * - 只引用报告中已有的依据；报告没覆盖的内容明确说明，不在问答里悄悄改写报告
 * - 情绪价值：先接住感受 → 对照报告纠正误读 → 给一件能做的事；不恐吓、不宿命、不推销、不给医疗/投资/婚姻确定性结论
 * - 危机信号直接转介，不做命理解读
 * - 报告归属服务端校验；不把完整出生信息发给模型（只发报告提纲与依据）
 * - 问答记录按 用户+报告 持久化（ReportDialogueTurn）；模型历史只取服务端记录，不信任客户端传入的历史（防伪造助手发言）
 * - 用户可清空某份报告的问答记录
 */

export interface DialogueTurn {
  role: "user" | "assistant";
  content: string;
}

export interface DialogueAnswer {
  answer: string;
  sectionId: string | null;
  sectionTitle: string | null;
  evidenceIds: string[];
  references: Reference[];
  followUps: string[];
  /** 危机转介/超出报告等特殊处理标记 */
  mode: "answer" | "out_of_report" | "crisis_referral" | "referral";
  model: string | null;
  /** 超出本场景职责时给出的更专业去处 */
  referral?: ReturnType<typeof referralCard> | null;
  /** 本轮是否顺口问了称呼（问过就留痕，只问一次） */
  askedName?: boolean;
  /** 本轮从用户话里认出并记住的称呼 */
  capturedName?: string | null;
}

const CRISIS_PATTERNS = [/不想活/, /活着没意思/, /想死/, /自杀/, /轻生/, /结束(自己的)?生命/, /自残/];

const MAX_HISTORY = 6;

@Injectable()
export class PaipanReportDialogueService {
  private readonly logger = new Logger(PaipanReportDialogueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AiGatewayService,
    private readonly guide: ContentGuideService,
    /** 可选：称呼记忆。缺它时对话照常，只是一律用「你」 */
    @Optional() private readonly names?: PreferredNameService,
  ) {}

  /**
   * 报告“继续学习”：按本盘格局、日主、用神等关键词，从平台公共内容池取真实内容卡片。
   * 只返回公开内容（审核通过、全平台开放、未删除），导航目标由服务端映射到真实页面；不推销、不拼造链接。
   */
  async related(userId: string, reportId: string): Promise<{ keywords: string[]; cards: (GuideCard & { reason: string })[] }> {
    const report = await this.loadReport(userId, reportId);
    const facts = (report.facts || {}) as Record<string, any>;
    const keywords = [...new Set([facts.geJu, facts.dayGan ? `${facts.dayGan}日主` : null, facts.yongShen ? "用神" : null, "八字入门"].filter(Boolean) as string[])];
    const seen = new Set<string>();
    const cards: (GuideCard & { reason: string })[] = [];
    for (const kw of keywords) {
      if (cards.length >= 6) break;
      try {
        const { cards: found } = await this.guide.guide(kw.replace(/日主$/, ""), 4);
        for (const c of found) {
          const key = `${c.type}:${c.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          cards.push({ ...c, reason: `与本盘「${kw}」相关` });
          if (cards.length >= 6) break;
        }
      } catch (error: any) {
        this.logger.warn(`相关内容检索失败：${error?.message || error}`);
      }
    }
    return { keywords, cards };
  }

  async ask(
    userId: string,
    reportId: string,
    input: { question: string; sectionId?: string; history?: DialogueTurn[]; channel?: "text" | "voice" },
  ): Promise<DialogueAnswer> {
    const question = (input.question || "").trim().slice(0, 300);
    if (!question) throw new BusinessException(ErrorCode.BAD_REQUEST, "请输入想问的问题");

    const report = await this.loadReport(userId, reportId);
    const answer = await this.answer(userId, reportId, report, question, input.sectionId);
    const current = await this.loadReport(userId, reportId);
    if (current.metadata?.generatedAt !== report.metadata?.generatedAt) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "报告已更新，请基于新版报告重新提问");
    }
    await this.saveTurns(userId, reportId, question, answer, input.channel ?? "text");
    // 这一轮里问过称呼就留痕：用户没答也算问过，否则下次对话又问一遍——
    // 追着问称呼比叫错更烦人。
    if (answer.askedName) await this.names?.markAsked(userId);
    return answer;
  }

  /** 读取问答记录与进度（最近 50 条；讨论过的小节用于“接着上次聊”） */
  async history(userId: string, reportId: string) {
    const report = await this.loadReport(userId, reportId);
    const generatedAt = this.generationTime(report);
    const turns = await this.prisma.reportDialogueTurn.findMany({
      where: { reportId, userId, ...(generatedAt ? { createdAt: { gte: generatedAt } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const ordered = turns.reverse();
    const previous = generatedAt
      ? (await this.prisma.reportDialogueTurn.findMany({
          where: { reportId, userId, createdAt: { lt: generatedAt } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })).reverse()
      : [];
    const chapters = report.sections.filter((s) => s.type === "analysis" || s.type === "interpretation");
    const discussed = [...new Set(ordered.map((t) => t.sectionId).filter(Boolean) as string[])];
    const last = [...ordered].reverse().find((t) => t.sectionId);
    const next = chapters.find((c) => !discussed.includes(c.id));
    return {
      turns: ordered.map((t) => ({
        role: t.role,
        content: t.content,
        sectionId: t.sectionId,
        evidenceIds: t.evidenceIds,
        mode: t.mode,
        createdAt: t.createdAt,
      })),
      previousTurns: previous.map((t) => ({ role: t.role, content: t.content, createdAt: t.createdAt })),
      lastSectionId: last?.sectionId ?? null,
      lastSectionTitle: last?.sectionId ? chapters.find((c) => c.id === last.sectionId)?.title ?? null : null,
      discussedSectionIds: discussed,
      nextSectionId: next?.id ?? null,
      nextSectionTitle: next?.title ?? null,
    };
  }

  /** 清空本人某份报告的问答记录 */
  async clearHistory(userId: string, reportId: string) {
    await this.loadReport(userId, reportId);
    const { count } = await this.prisma.reportDialogueTurn.deleteMany({ where: { reportId, userId } });
    return { deleted: count };
  }

  private async saveTurns(userId: string, reportId: string, question: string, answer: DialogueAnswer, channel: string) {
    try {
      // 问题与回答显式给出先后时间：同一批写入的默认 now() 相同，按时间排序会出现“回答在问题前面”
      const askedAt = new Date();
      const answeredAt = new Date(askedAt.getTime() + 1);
      await this.prisma.reportDialogueTurn.createMany({
        data: [
          // 用户发言也写非空 mode：危机轮次整轮排除出模型历史；且 SQL 的 NOT(mode = x) 会把 NULL 行一并排除，不能留空
          {
            reportId, userId, role: "user", content: question, sectionId: answer.sectionId, channel,
            mode: answer.mode === "crisis_referral" ? "crisis_referral" : "question",
            createdAt: askedAt,
          },
          {
            reportId, userId, role: "assistant", content: answer.answer, sectionId: answer.sectionId,
            evidenceIds: answer.evidenceIds, mode: answer.mode, model: answer.model, channel, createdAt: answeredAt,
          },
        ],
      });
    } catch (error: any) {
      // 记录失败不影响本次回答
      this.logger.warn(`报告问答记录保存失败：${error?.message || error}`);
    }
  }

  private async answer(
    userId: string,
    reportId: string,
    report: StructuredReport,
    question: string,
    requestedSectionId?: string,
  ): Promise<DialogueAnswer> {
    // 危机信号：不做命理解读，直接温和转介
    if (CRISIS_PATTERNS.some((re) => re.test(question))) {
      return {
        answer:
          "听到你这样说，我很在意你现在的状态。这种时候命理解读帮不上最重要的忙，请先联系身边信任的人，或拨打当地心理援助热线；如果有立即的危险，请拨打 110 或 120。我会一直在这里，等你愿意的时候再一起看报告。",
        sectionId: null,
        sectionTitle: null,
        evidenceIds: [],
        references: [],
        followUps: [],
        mode: "crisis_referral",
        model: null,
      };
    }

    const outline: DialogueOutlineItem[] = Array.isArray(report.dialogueOutline) ? report.dialogueOutline : [];
    const chapters = report.sections.filter((s) => s.type === "analysis" || s.type === "interpretation");
    const focus = this.pickSection(chapters, requestedSectionId, question);

    /**
     * 「这一盘我们怎么看」：报告在各派分歧上给出的取舍。
     * 它是 fact 类型的小节，原先不在 chapters 里，等于对话完全不知道报告的主线——
     * 用户问「身弱财旺到底该怎么办」，模型会自由发挥另给一套说法，
     * 与他刚读完的报告对不上。两边口径不一致，是这套报告体系最容易被察觉的破绽。
     */
    const debate = report.sections.find((x) => x.id === "sDebate");

    const allRefs = new Map<string, Reference>();
    for (const sec of chapters) for (const r of sec.references ?? []) allRefs.set(r.evidenceId, r);
    // 对照小节引用的依据挂在报告级 references 上（小节本身只存 evidenceIds），也要能被对话引用
    for (const r of report.references ?? []) if (!allRefs.has(r.evidenceId)) allRefs.set(r.evidenceId, r);
    // 依据优先给焦点小节，其余小节依据作为补充
    const refsForPrompt = [
      ...(focus?.references ?? []),
      ...[...allRefs.values()].filter((r) => !(focus?.references ?? []).some((f) => f.evidenceId === r.evidenceId)),
    ].slice(0, 8);

    // 称呼：用户这句话里若说了「叫我XX」，先记下来，本轮就按新称呼答
    const captured = userId ? await this.names?.captureFromMessage(userId, question) : null;
    const address = (await this.names?.addressPrompt(userId)) ?? { prompt: "", preferred: null, shouldAsk: false };
    if (captured) this.logger.log(`本轮记住称呼：${captured}`);

    // 统一对话策略：知识库优先 → 不足时模型兜底（须标明）→ 超出职责转介到更专业的去处
    const referral = detectReferral("paipan_report_dialogue", question);
    // 本轮是否需要顺口问一次称呼（指令已写进 system，这里只记状态供回写留痕）
    const askedName = address.shouldAsk;
    const policyPrompt = buildSceneSystemPrefix({
      scene: "paipan_report_dialogue",
      hasEvidence: refsForPrompt.length > 0,
      referral,
    });

    // 人设由角色谱统一提供（报告场景 = 小卜）；这里只写做事规则
    const system = `【规则】
1. 对话主线是报告提纲。先判断用户的问题属于哪一节（sectionId），用该节内容与依据回答；问题不属于任何一节时 mode 填 out_of_report，简短说明报告未覆盖，可建议生成补充报告，再引导回提纲。
1a. **遇到各派讲法不同的问题，一律按【本报告的主线】回答**，不得另给一套说法——用户刚读完报告，你再说一套，他只会更糊涂。用户追问「为什么这么定」时，把主线里的理由讲清楚；用户说「我听说不是这样」时，先认下确有别的讲法，再说明本报告为什么取这一条，**最后仍要落回那个结论**，不把选择权推回给他。
2. 优先使用【报告提纲】【依据】里的内容作答，引用依据时用 evidenceIds 标注。**任何情况下都不得提及依据之外的书名、篇名、原句或门派原话**（可以讲道理，但不能假托出处）。
3. 回答不超过 150 字：先用生活化比喻，再讲术语；术语第一次出现要解释；引用古籍先说出处再说原文再白话。
4. 用户流露担心、沮丧时：先接住感受，再对照报告纠正“注定”“缺什么”这类误读，最后给一件能做的小事。
5. 不恐吓、不说宿命、不给疾病/投资/婚姻去留的确定性结论、不推荐化解或付费服务、不引导情感依赖。
6. followUps 给 2 个用户接下来可能想问的问题（每个不超过 20 字），帮助回到报告主线。
7. 只输出 JSON：{"sectionId":"s2","mode":"answer","answer":"回答","evidenceIds":["E1"],"followUps":["追问1","追问2"]}
   转介时 mode 填 referral。

${policyPrompt}
${address.prompt}`;

    const user = `【报告主旨】${report.summary}
${debate ? `【本报告的主线】（各派讲法不同之处，一律按这个口径答）
${String(debate.content).slice(0, 900)}
` : ""}【报告提纲】
${outline.map((o) => `${o.sectionId} ${o.title}：${o.keyPoints.join("；")}（依据 ${o.evidenceIds.join(",") || "无"}）`).join("\n") || "（无）"}
${focus ? `【当前小节 ${focus.id} ${focus.title}】\n${focus.content}` : ""}
【依据】
${refsForPrompt.map((r) => `${r.evidenceId} ${r.source}${r.chapter ? `·${r.chapter}` : ""}：${r.content.slice(0, 300)}`).join("\n") || "（报告没有可引用依据，回答时不得引用任何书籍或门派原话）"}
【用户问题】${question}`;

    // 历史只取服务端记录（不含危机转介轮次），不信任客户端传入的历史
    const generatedAt = this.generationTime(report);
    const stored = await this.prisma.reportDialogueTurn.findMany({
      where: {
        reportId, userId, NOT: { mode: "crisis_referral" },
        ...(generatedAt ? { createdAt: { gte: generatedAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY,
      select: { role: true, content: true },
    });
    const history = stored
      .reverse()
      .filter((t) => t.role === "user" || t.role === "assistant")
      .map((t) => ({ role: t.role as "user" | "assistant", content: t.content.slice(0, 500) }));

    let res;
    try {
      res = await this.gateway.chat({
        scene: "paipan_report_dialogue",
        userId,
        messages: [{ role: "system", content: system }, ...history, { role: "user", content: user }],
        options: { temperature: 0.5, maxTokens: 600 },
        skipCache: true,
      });
    } catch (error: any) {
      this.logger.warn(`报告问答模型调用失败：${error?.message || error}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "小卜暂时没能回答，请稍后再问");
    }

    const parsed = this.parse(res.content || "");
    const validSections = new Map(chapters.map((s) => [s.id, s]));
    const sectionId = parsed?.sectionId && validSections.has(String(parsed.sectionId)) ? String(parsed.sectionId) : focus?.id ?? null;
    const evidenceIds = (Array.isArray(parsed?.evidenceIds) ? parsed.evidenceIds.map(String) : []).filter((id: string) =>
      allRefs.has(id),
    );
    let answer = typeof parsed?.answer === "string" && parsed.answer.trim() ? parsed.answer.trim() : this.plainText(res.content);
    // 回答里提到依据以外的书名：追加未核实提示，不让模型补充冒充报告依据
    const knownBooks = new Set([...allRefs.values()].flatMap((r) => r.source.match(/《[^》]+》/g) || []));
    const unverified = [...new Set<string>(answer.match(/《[^》]+》/g) || [])].filter((b) => !knownBooks.has(b));
    if (unverified.length) answer = `${answer}（${unverified.join("、")}不在这份报告的依据里，未经核实。）`;
    if (!answer) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "小卜暂时没能回答，请换个说法再问");
    }

    return {
      answer: answer.slice(0, 600),
      sectionId,
      sectionTitle: sectionId ? validSections.get(sectionId)!.title : null,
      evidenceIds,
      references: evidenceIds.map((id: string) => allRefs.get(id)!),
      followUps: (Array.isArray(parsed?.followUps) ? parsed.followUps : [])
        .map((q: unknown) => String(q).slice(0, 30))
        .filter(Boolean)
        .slice(0, 2),
      mode: referral ? "referral" : parsed?.mode === "out_of_report" ? "out_of_report" : "answer",
      referral: referral ? referralCard(referral) : null,
      model: res.model ?? null,
      askedName,
      capturedName: captured ?? null,
    };
  }

  private async loadReport(userId: string, reportId: string): Promise<StructuredReport> {
    const record = await this.prisma.aiAnalysisRecord.findUnique({ where: { id: reportId } });
    if (!record || record.scene !== "paipan_report") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "报告不存在");
    }
    if (record.userId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该报告");
    }
    try {
      const content = JSON.parse(record.analysisContent);
      if (!Array.isArray(content?.sections)) throw new Error("bad");
      return content as StructuredReport;
    } catch {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "报告内容解析失败");
    }
  }

  private generationTime(report: StructuredReport): Date | null {
    const time = new Date(report.metadata?.generatedAt ?? "");
    return Number.isNaN(time.getTime()) ? null : time;
  }

  /** 页面带了小节就用该小节；否则按标题/要点关键词粗匹配，匹配不到交给模型判断 */
  pickSection(chapters: ReportSection[], sectionId: string | undefined, question: string): ReportSection | null {
    if (sectionId) {
      const hit = chapters.find((s) => s.id === sectionId);
      if (hit) return hit;
    }
    let best: ReportSection | null = null;
    let bestScore = 0;
    for (const sec of chapters) {
      const terms = [sec.title, ...(sec.keyPoints ?? [])]
        .join(" ")
        .split(/[\s，。、；：:（）()与和的]+/)
        .filter((t) => t.length >= 2);
      const score = terms.filter((t) => question.includes(t)).length;
      if (score > bestScore) {
        best = sec;
        bestScore = score;
      }
    }
    return best;
  }

  private parse(text: string): any {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  /** 模型未按 JSON 输出时，仅当内容本身不是 JSON 片段才作为纯文本回答使用 */
  private plainText(text: string | undefined): string {
    const t = (text || "").trim();
    if (!t || t.startsWith("{") || t.startsWith("```")) return "";
    return t;
  }
}
