import { Injectable, Logger, NotFoundException, Optional, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PreferredNameService } from "../dialogue/preferred-name.service";
import { buildSceneSystemPrefix, detectReferral, referralCard } from "../dialogue/dialogue-policy";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";

/**
 * 古籍伴读智能体（识典伴读）
 *
 * 路线：通用大模型 + 注入「用户当前正在阅读的章节正文」+ 伴读人格 prompt + 多轮对话。
 * 不依赖 embedding 知识库 —— 当前文本是真实注入的（零幻觉），泛化知识靠大模型内置能力。
 *
 * E3 带记忆升级（2026-07-03）：每用户每书一条持久会话（跨章节/跨登录），近期消息 + 滚动记忆摘要
 * 一起注入 —— AI「记得」此前共读到哪、聊过什么，陪用户读完一本经典。
 * 摘要每积累 SUMMARY_EVERY 条消息异步压缩一次（自吞失败，不影响对话主流程）。
 *
 * 小卜 AI 统一（2026-09-17）：
 * - 用户可见名称统一为“小卜”；
 * - 长章节不再只注入前 4000 字：按用户所问句子（focusText 或问题中的「」引文）在章节中的位置注入前后文，
 *   避免问后半章时模型看不到原文而凭空解释；
 * - 危机信号直接温和转介，不做古籍解读，不调用模型。
 */
// 人设（名字与性格）由角色谱 dialogue-personas 统一提供：伴读场景是「小简」。
// 这里只保留与伴读这件事本身相关的做事规则。
const COMPANION_SYSTEM = `你正陪伴用户研读一部古籍，贯通经史子集、历代注疏与现代研究。

请基于【当前正在阅读的原文】回应用户，并主动引导其深入思考。要求：
1. 紧扣【当前原文】解读；引用本章文字时点明是"本章原文"。涉及本文之外的古籍、观点或史实时，标注出处书名（如《论语·学而》）；不确定就坦诚说明，**绝不编造原文或出处**。
2. 像一位陪读的师长：先认真回应问题，再适时抛出一个延伸思考或追问，引导用户继续探索，让阅读越读越深。若【此前共读记忆】中有相关讨论，可自然呼应（如"我们之前读到……时聊过"），体现连续陪伴感。
3. 善于：解释疑难字词与概念、梳理脉络主旨、提出可研究的问题、关联其他典籍的相关论述、联系现实给予启发。
4. 条理清晰、详略得当（一般 400–600 字），语言典雅而不晦涩，不说空泛套话。
5. 本章原文之外、平台也没有收录依据的内容，可以按通行的学术说法讲，但要让用户知道这是通行说法而非某本书的原话；有不同说法时并列陈述。`;

/** 章节正文注入上限（字） */
const BODY_LIMIT = 4000;
/** 围绕所问句子注入的前后文长度（字） */
const FOCUS_WINDOW = 1800;

const CRISIS_PATTERNS = [/不想活/, /活着没意思/, /想死/, /自杀/, /轻生/, /结束(自己的)?生命/, /自残/];
export const COMPANION_CRISIS_REPLY =
  "听到你这样说，我很在意你现在的状态。这种时候读书和解读帮不上最重要的忙，请先联系身边信任的人，或拨打当地心理援助热线；如果有立即的危险，请拨打 110 或 120。等你愿意的时候，我们再一起读下去。";

/** 从问题中提取用户引用的句子（「」或“”内，至少 4 个字） */
export function extractQuoted(question: string): string | null {
  const m = question.match(/[「“"]([^」”"]{4,300})[」”"]/);
  return m ? m[1].replace(/…$/, "").trim() : null;
}

/** 选取注入正文：有所问句子且能在原文中定位时，注入其前后文；否则注入开头 BODY_LIMIT 字 */
export function selectChapterBody(content: string, focus?: string | null): { body: string; focused: boolean } {
  const text = content || "";
  if (text.length <= BODY_LIMIT) return { body: text, focused: false };
  const needle = (focus || "").trim();
  if (needle.length >= 4) {
    // 截断的引文（末尾省略号）取前 30 字定位
    const probe = needle.length > 30 ? needle.slice(0, 30) : needle;
    const idx = text.indexOf(probe);
    if (idx >= 0) {
      const start = Math.max(0, idx - FOCUS_WINDOW);
      const end = Math.min(text.length, idx + needle.length + FOCUS_WINDOW);
      return { body: `${start > 0 ? "……（前略）" : ""}${text.slice(start, end)}${end < text.length ? "（后略）……" : ""}`, focused: true };
    }
  }
  return { body: text.slice(0, BODY_LIMIT), focused: false };
}

/** 每次注入的近期消息条数 */
const RECENT_MESSAGES = 12;
/** 每积累多少条消息触发一次记忆压缩 */
const SUMMARY_EVERY = 24;
/** 会话恢复时返回给前端的历史条数 */
const RESTORE_MESSAGES = 50;

@Injectable()
export class ClassicCompanionService {
  private readonly logger = new Logger(ClassicCompanionService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AiGatewayService,
    /** 可选：称呼记忆。缺它时伴读照常，只是一律用「你」 */
    @Optional() private readonly names?: PreferredNameService,
  ) {}

  /** 载入当前章节正文与书目信息 */
  private async loadChapter(chapterId: string) {
    const ch = await this.prisma.classicChapter.findUnique({
      where: { id: chapterId },
      select: {
        title: true,
        content: true,
        bookId: true,
        book: { select: { title: true, author: true, dynasty: true } },
      },
    });
    if (!ch) throw new NotFoundException("章节不存在");
    return ch;
  }

  /** 开场引导问题（针对当前章节，启发用户提问） */
  async getGuidingPrompts(chapterId: string) {
    const ch = await this.loadChapter(chapterId);
    return {
      bookTitle: ch.book?.title ?? "本书",
      chapterTitle: ch.title,
      prompts: [
        "用一段话总结本章的主要内容与脉络",
        "本章中有哪些值得深入研究的问题？",
        "古籍中有哪些与本章相关的论述或互文？",
        "解释本章里最关键的概念与疑难字词",
      ],
    };
  }

  /** 会话恢复（按章节定位书）：返回记忆摘要与近期历史，供前端进页续聊 */
  async getSession(userId: string, chapterId: string) {
    const ch = await this.loadChapter(chapterId);
    const session = await this.prisma.classicCompanionSession.findUnique({
      where: { userId_bookId: { userId, bookId: ch.bookId } },
    });
    if (!session) return { bookId: ch.bookId, hasMemory: false, messages: [] };
    const rows = await this.prisma.classicCompanionMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: RESTORE_MESSAGES,
      select: { role: true, content: true, chapterId: true, createdAt: true },
    });
    return {
      bookId: ch.bookId,
      hasMemory: session.messageCount > 0,
      messageCount: session.messageCount,
      messages: rows.reverse(),
    };
  }

  /** 清空本书伴读记忆（用户主动重来） */
  async resetSession(userId: string, chapterId: string) {
    const ch = await this.loadChapter(chapterId);
    const session = await this.prisma.classicCompanionSession.findUnique({
      where: { userId_bookId: { userId, bookId: ch.bookId } },
      select: { id: true },
    });
    if (session) {
      await this.prisma.$transaction([
        this.prisma.classicCompanionMessage.deleteMany({ where: { sessionId: session.id } }),
        this.prisma.classicCompanionSession.update({
          where: { id: session.id },
          data: { summary: null, messageCount: 0 },
        }),
      ]);
    }
    return { reset: true };
  }

  /** 组装伴读上下文（chat / chatStream 共用）：章节正文 + 持久记忆 + 近期历史 */
  private async prepareContext(
    dto: { chapterId: string; question: string; focusText?: string; history?: { role: string; content: string }[] },
    userId?: string,
  ) {
    const ch = await this.loadChapter(dto.chapterId);
    const meta = [ch.book?.dynasty, ch.book?.author].filter(Boolean).join("·");
    // 章节正文可能很长：优先注入所问句子前后文，否则注入开头部分
    const { body, focused } = selectChapterBody(ch.content || "", dto.focusText || extractQuoted(dto.question));

    // 持久会话（登录用户）：DB 为多轮真源；无 userId 时降级为客户端传的 history（兼容旧行为）
    let session: { id: string; summary: string | null; messageCount: number } | null = null;
    let hist: AiMessage[] = [];
    if (userId) {
      session = await this.prisma.classicCompanionSession.upsert({
        where: { userId_bookId: { userId, bookId: ch.bookId } },
        create: { userId, bookId: ch.bookId },
        update: {},
        select: { id: true, summary: true, messageCount: true },
      });
      const recent = await this.prisma.classicCompanionMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
        take: RECENT_MESSAGES,
        select: { role: true, content: true, chapterId: true },
      });
      hist = recent.reverse().map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: `【${m.chapterId === dto.chapterId ? "当前章节历史讨论" : "其他章节历史讨论，仅供参考，不是当前原文"}】\n${m.content}`,
      }));
    } else {
      hist = (dto.history || []).slice(-10).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      }));
    }

    // 统一对话策略：本章原文为依据；超出伴读职责（如为用户排盘算命）转介到平台专业服务
    const referral = detectReferral("classic_companion", dto.question);
    const policyPrompt = buildSceneSystemPrefix({
      scene: "classic_companion",
      hasEvidence: !!body,
      referral,
    });

    // 称呼：昵称不适合当面叫时，伴读会在本轮结尾顺口商量一次并记住（与报告对话同一套口径）
    const address = (await this.names?.addressPrompt(userId)) ?? { prompt: "", preferred: null, shouldAsk: false };

    const messages: AiMessage[] = [
      { role: "system", content: COMPANION_SYSTEM },
      ...(policyPrompt ? [{ role: "system" as const, content: policyPrompt }] : []),
      ...(address.prompt ? [{ role: "system" as const, content: address.prompt }] : []),
      ...(session?.summary
        ? [{ role: "system" as const, content: `【此前共读记忆】（你与用户此前研读本书的讨论摘要）：\n${session.summary}` }]
        : []),
      {
        role: "system",
        content: `【当前正在阅读】《${ch.book?.title ?? ""}》${meta ? "（" + meta + "）" : ""} · ${ch.title}\n${focused ? "本章原文（节选，围绕用户所问句子前后）" : "本章原文"}：\n${body}\n用户本次所说的“本章”“这一章”均指上述章节。历史讨论和共读记忆不改变当前章节，不能把其他章节的回答当作本章总结。`,
      },
      ...hist,
      { role: "user", content: dto.question },
    ];

    return { ch, session, messages, referral, askedName: address.shouldAsk };
  }

  /** 持久化一轮对话 + 触发记忆压缩（chat / chatStream 共用，失败自吞不影响回答） */
  private async persistRound(
    session: { id: string; messageCount: number } | null,
    dto: { chapterId: string; question: string },
    answer: string,
    bookTitle: string,
    userId?: string,
  ) {
    if (!userId || !session) return;
    try {
      await this.prisma.$transaction([
        this.prisma.classicCompanionMessage.createMany({
          data: [
            { sessionId: session.id, role: "user", content: dto.question.slice(0, 2000), chapterId: dto.chapterId },
            { sessionId: session.id, role: "assistant", content: answer.slice(0, 4000), chapterId: dto.chapterId },
          ],
        }),
        this.prisma.classicCompanionSession.update({
          where: { id: session.id },
          data: { messageCount: { increment: 2 } },
        }),
      ]);
      const newCount = session.messageCount + 2;
      if (newCount % SUMMARY_EVERY === 0) {
        void this.compressMemory(session.id, bookTitle).catch((e) =>
          this.logger.warn(`伴读记忆压缩失败(session=${session.id})`, e as Error),
        );
      }
    } catch (e) {
      this.logger.warn(`伴读消息持久化失败(session=${session.id})`, e as Error);
    }
  }

  /** 伴读对话（非流式）：注入当前章节正文 + 持久记忆（摘要+近期历史） */
  async chat(
    dto: { chapterId: string; question: string; focusText?: string; history?: { role: string; content: string }[] },
    userId?: string,
  ): Promise<{ answer: string; disclaimer: string; referral?: ReturnType<typeof referralCard> | null }> {
    if (CRISIS_PATTERNS.some((re) => re.test(dto.question))) {
      return { answer: COMPANION_CRISIS_REPLY, disclaimer: "", referral: null };
    }
    // 用户这句话里若说了「叫我XX」，先记下来，本轮就按新称呼答
    if (userId) await this.names?.captureFromMessage(userId, dto.question);
    const { ch, session, messages, referral, askedName } = await this.prepareContext(dto, userId);

    const result = await this.gateway.chat({
      scene: "classic_companion",
      userId,
      skipCache: true, // 回答依赖章节原文与个人记忆，语义缓存只看用户问题，会跨章节/跨用户误命中
      messages,
      options: { temperature: 0.6, maxTokens: 1500 },
    });
    const answer = result.content?.trim();
    if (!answer) throw new ServiceUnavailableException("伴读未返回内容，请稍后重试。");

    await this.persistRound(session, dto, answer, ch.book?.title ?? "本书", userId);
    // 问过称呼就留痕：用户没答也算问过，否则下次又问一遍
    if (userId && askedName) await this.names?.markAsked(userId);

    return { answer, disclaimer: RISK_DISCLAIMER, referral: referral ? referralCard(referral) : null };
  }

  /** 伴读对话（流式）：同一套上下文/记忆闭环，文本增量逐块下发，完整回答落库 */
  async *chatStream(
    dto: { chapterId: string; question: string; focusText?: string; history?: { role: string; content: string }[] },
    userId?: string,
  ): AsyncIterable<string> {
    if (CRISIS_PATTERNS.some((re) => re.test(dto.question))) {
      yield COMPANION_CRISIS_REPLY;
      return;
    }
    const { ch, session, messages } = await this.prepareContext(dto, userId);

    let full = "";
    for await (const chunk of this.gateway.chatStream({
      scene: "classic_companion",
      userId,
      skipCache: true, // 回答依赖章节原文与个人记忆，语义缓存只看用户问题，会跨章节/跨用户误命中
      messages,
      options: { temperature: 0.6, maxTokens: 1500 },
    })) {
      full += chunk;
      yield chunk;
    }

    const answer = full.trim();
    if (!answer) throw new ServiceUnavailableException("伴读未返回内容，请稍后重试。");
    if (answer) {
      await this.persistRound(session, dto, answer, ch.book?.title ?? "本书", userId);
    }
  }

  /** 滚动记忆压缩：旧摘要 + 最近一批对话 → 新摘要（低温小额度，成本可控） */
  private async compressMemory(sessionId: string, bookTitle: string) {
    const session = await this.prisma.classicCompanionSession.findUnique({
      where: { id: sessionId },
      select: { summary: true },
    });
    const recent = await this.prisma.classicCompanionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: SUMMARY_EVERY,
      select: { role: true, content: true },
    });
    const dialog = recent
      .reverse()
      .map((m) => `${m.role === "assistant" ? "伴读" : "用户"}：${m.content.slice(0, 300)}`)
      .join("\n");

    const result = await this.gateway.chat({
      scene: "classic_companion",
      skipCache: true,
      messages: [
        {
          role: "system",
          content: "你是共读记忆的整理者。把「已有记忆」与「新增对话」合并压缩成一段不超过 300 字的第三人称摘要：记录用户读《" +
            bookTitle +
            "》的关注点、聊过的核心问题与结论、读到的位置。只输出摘要正文。",
        },
        {
          role: "user",
          content: `【已有记忆】\n${session?.summary || "（无）"}\n\n【新增对话】\n${dialog}`,
        },
      ],
      options: { temperature: 0.3, maxTokens: 500 },
    });
    const summary = result.content?.trim();
    if (summary) {
      await this.prisma.classicCompanionSession.update({
        where: { id: sessionId },
        data: { summary: summary.slice(0, 1500) },
      });
    }
  }
}
