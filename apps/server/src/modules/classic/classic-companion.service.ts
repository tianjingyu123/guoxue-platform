import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";

/**
 * 古籍伴读智能体（识典伴读）
 *
 * 路线：通用大模型 + 注入「用户当前正在阅读的章节正文」+ 伴读人格 prompt + 多轮对话。
 * 不依赖 embedding 知识库 —— 当前文本是真实注入的（零幻觉），泛化知识靠大模型内置能力，
 * 跨古籍关联作为后续可选增强。scene="classic_companion"，模型可由 ModelRouter 按场景配置。
 */
const COMPANION_SYSTEM = `你是「识典伴读」，一位博学、亲切、善于启发的国学伴读导师，正陪伴用户研读一部古籍。你贯通经史子集、历代注疏与现代研究。

请基于【当前正在阅读的原文】回应用户，并主动引导其深入思考。要求：
1. 紧扣【当前原文】解读；引用本章文字时点明是"本章原文"。涉及本文之外的古籍、观点或史实时，标注出处书名（如《论语·学而》）；不确定就坦诚说明，**绝不编造原文或出处**。
2. 像一位陪读的师长：先认真回应问题，再适时抛出一个延伸思考或追问，引导用户继续探索，让阅读越读越深。
3. 善于：解释疑难字词与概念、梳理脉络主旨、提出可研究的问题、关联其他典籍的相关论述、联系现实给予启发。
4. 条理清晰、详略得当（一般 400–600 字），语言典雅而不晦涩，不说空泛套话。`;

@Injectable()
export class ClassicCompanionService {
  constructor(
    private prisma: PrismaService,
    private gateway: AiGatewayService,
  ) {}

  /** 载入当前章节正文与书目信息 */
  private async loadChapter(chapterId: string) {
    const ch = await this.prisma.classicChapter.findUnique({
      where: { id: chapterId },
      select: {
        title: true,
        content: true,
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

  /** 伴读对话：注入当前章节正文 + 多轮历史 */
  async chat(
    dto: { chapterId: string; question: string; history?: { role: string; content: string }[] },
    userId?: string,
  ): Promise<{ answer: string; disclaimer: string }> {
    const ch = await this.loadChapter(dto.chapterId);
    const meta = [ch.book?.dynasty, ch.book?.author].filter(Boolean).join("·");
    // 章节正文可能很长，截断注入控制 token
    const body = (ch.content || "").slice(0, 4000);

    // 归一化多轮历史（仅保留 user/assistant，取最近 10 条）
    const hist: AiMessage[] = (dto.history || []).slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    }));

    const messages: AiMessage[] = [
      { role: "system", content: COMPANION_SYSTEM },
      {
        role: "system",
        content: `【当前正在阅读】《${ch.book?.title ?? ""}》${meta ? "（" + meta + "）" : ""} · ${ch.title}\n本章原文：\n${body}`,
      },
      ...hist,
      { role: "user", content: dto.question },
    ];

    const result = await this.gateway.chat({
      scene: "classic_companion",
      userId,
      messages,
      options: { temperature: 0.6, maxTokens: 1500 },
    });

    return {
      answer: result.content?.trim() || "抱歉，我暂时无法回答，请换个角度再问问。",
      disclaimer: RISK_DISCLAIMER,
    };
  }
}
