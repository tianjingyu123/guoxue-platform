import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CircleKnowledgeService } from "./circle-knowledge.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

interface ExtractedKnowledge {
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  category: string;
  confidence: number;
}

/**
 * UGC 知识萃取服务（RAG 第4层）
 *
 * 用 AI 从圈子精华帖、付费问答、高赞评论中提取结构化知识，
 * 自动去重后同步到 circle_knowledge 表供 RAG 召回。
 */
@Injectable()
export class UgcKnowledgeService {
  private readonly logger = new Logger(UgcKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: CircleKnowledgeService,
    private readonly ai: AiGatewayService,
  ) {}

  /** 从精华帖萃取知识 */
  async extractFromEssencePosts(limit = 10): Promise<number> {
    const posts = await this.prisma.post.findMany({
      where: { isEssence: true, status: "PUBLISHED" },
      select: { id: true, circleId: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    let count = 0;
    for (const post of posts) {
      try {
        if (await this.isProcessed("ugc_post", post.id)) continue;

        const text = `${post.title || ""}\n${post.content}`.trim();
        if (text.length < 50) continue;

        const extracted = await this.extractKnowledge(text, "post");
        if (!extracted || extracted.confidence < 0.5) continue;

        await this.ingestExtracted(post.circleId, "ugc_post", post.id, extracted);
        count++;
      } catch (err: any) {
        this.logger.warn(`萃取帖子 ${post.id} 失败: ${err.message}`);
      }
    }
    return count;
  }

  /** 从已回复的付费问答中萃取知识 */
  async extractFromPaidQuestions(limit = 10): Promise<number> {
    const questions = await this.prisma.paidQuestion.findMany({
      where: {
        status: "ANSWERED",
        isPublic: true,
        answer: { not: null },
      },
      select: {
        id: true,
        circleId: true,
        questionTitle: true,
        question: true,
        answer: true,
      },
      orderBy: { peekCount: "desc" },
      take: limit,
    });

    let count = 0;
    for (const q of questions) {
      try {
        if (await this.isProcessed("ugc_qa", q.id)) continue;

        const text = `问题：${q.questionTitle || q.question}\n回答：${q.answer}`;
        if (text.length < 50) continue;

        const extracted = await this.extractKnowledge(text, "qa");
        if (!extracted || extracted.confidence < 0.5) continue;

        await this.ingestExtracted(q.circleId, "ugc_qa", q.id, extracted);
        count++;
      } catch (err: any) {
        this.logger.warn(`萃取问答 ${q.id} 失败: ${err.message}`);
      }
    }
    return count;
  }

  /** 从高赞评论中萃取知识 */
  async extractFromComments(limit = 10): Promise<number> {
    const comments = await this.prisma.comment.findMany({
      where: {
        status: "PUBLISHED",
        likeCount: { gte: 5 },
        targetType: "POST",
      },
      select: {
        id: true,
        targetId: true,
        content: true,
      },
      orderBy: { likeCount: "desc" },
      take: limit,
    });

    if (comments.length === 0) return 0;

    // 批量获取关联帖子信息
    const postIds = [...new Set(comments.map((c) => c.targetId))];
    const posts = await this.prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, circleId: true, title: true },
    });
    const postMap = new Map(posts.map((p) => [p.id, p]));

    let count = 0;
    for (const comment of comments) {
      try {
        if (comment.content.length < 80) continue;
        if (await this.isProcessed("ugc_comment", comment.id)) continue;

        const post = postMap.get(comment.targetId);
        if (!post) continue;

        const text = post.title
          ? `原文：${post.title}\n\n精选评论：${comment.content}`
          : comment.content;

        const extracted = await this.extractKnowledge(text, "comment");
        if (!extracted || extracted.confidence < 0.6) continue;

        await this.ingestExtracted(post.circleId, "ugc_comment", comment.id, extracted);
        count++;
      } catch (err: any) {
        this.logger.warn(`萃取评论 ${comment.id} 失败: ${err.message}`);
      }
    }
    return count;
  }

  /** 运行完整萃取管道 */
  async runFullPipeline(): Promise<{
    posts: number;
    paidQuestions: number;
    comments: number;
  }> {
    this.logger.log("UGC知识萃取管道启动");
    const [posts, paidQuestions, comments] = await Promise.all([
      this.extractFromEssencePosts(10),
      this.extractFromPaidQuestions(10),
      this.extractFromComments(10),
    ]);
    this.logger.log(
      `UGC知识萃取完成: 帖子${posts} 问答${paidQuestions} 评论${comments}`,
    );
    return { posts, paidQuestions, comments };
  }

  // ───────── 私有方法 ─────────

  /** 检查指定来源是否已处理过 */
  private async isProcessed(sourceType: string, sourceId: string): Promise<boolean> {
    const existing = await this.prisma.circleKnowledgeCandidate.findFirst({
      where: { sourceType, sourceId },
      select: { id: true },
    });
    return !!existing;
  }

  /** 调用 LLM 从原文中萃取结构化知识 */
  private async extractKnowledge(
    text: string,
    sourceType: string,
  ): Promise<ExtractedKnowledge | null> {
    const prompt = this.buildExtractionPrompt(text, sourceType);
    try {
      const result = await this.ai.chat({
        scene: "ugc_knowledge_extraction",
        messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.3, maxTokens: 1024 },
      });

      return this.parseExtractionResult(result.content);
    } catch (err: any) {
      this.logger.warn(`LLM萃取失败: ${err.message}`);
      return null;
    }
  }

  /** 解析 LLM 返回的 JSON 结果 */
  private parseExtractionResult(raw: string): ExtractedKnowledge | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title?.trim() || "",
        summary: parsed.summary?.trim() || "",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        category: parsed.category?.trim() || "国学知识",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch (err) {
      this.logger.warn(`提取结果 JSON 解析失败`, err);
      return null;
    }
  }

  /** 格式化入库内容 */
  private formatContent(extracted: ExtractedKnowledge): string {
    const parts = [
      `【${extracted.category}】${extracted.title}`,
      "",
      extracted.summary,
    ];
    if (extracted.keyPoints.length > 0) {
      parts.push("", "要点：");
      extracted.keyPoints.forEach((p, i) => parts.push(`${i + 1}. ${p}`));
    }
    if (extracted.tags.length > 0) {
      parts.push("", `标签：${extracted.tags.join("、")}`);
    }
    return parts.join("\n");
  }

  /** 高置信度直接入库，低置信度进候选 */
  private async ingestExtracted(
    circleId: string,
    sourceType: string,
    sourceId: string,
    extracted: ExtractedKnowledge,
  ) {
    const content = this.formatContent(extracted);

    if (extracted.confidence >= 0.8) {
      await this.knowledge.add({
        circleId,
        sourceType,
        sourceId,
        content,
        addedBy: "AI_UGC",
      });
      this.logger.log(`高置信度(${extracted.confidence})直接入库: ${extracted.title}`);
    } else {
      await this.knowledge.addCandidate({
        circleId,
        sourceType,
        sourceId,
        content,
      });
      this.logger.log(`低置信度(${extracted.confidence})进候选: ${extracted.title}`);
    }
  }

  /** 构造 AI 抽取提示词 */
  private buildExtractionPrompt(text: string, sourceType: string): string {
    const sourceLabel =
      sourceType === "post" ? "帖子" :
      sourceType === "qa" ? "问答" :
      sourceType === "comment" ? "评论" : "内容";

    return `你是一位国学知识管理专家。请从以下${sourceLabel}中提取可供RAG系统检索的结构化知识点。

原文：
---
${text.slice(0, 3000)}
---

请以JSON格式返回（不要包含其他文字）：
{
  "title": "提炼的知识标题（15字以内）",
  "summary": "100-200字的核心内容摘要，保留关键细节",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "tags": ["标签1", "标签2", "标签3"],
  "category": "归类：经典解读/诗词赏析/历史人物/哲学思想/养生修身/礼仪民俗/命理中医/其他",
  "confidence": 0.0-1.0（该内容作为可靠知识条目的置信度）
}

判断标准：
- 有实质知识含量、非闲聊 → confidence >= 0.7
- 有一定见解但不够系统 → confidence 0.5-0.7
- 主要是个人感受、无普遍参考价值 → confidence < 0.5
- 请严格只返回JSON，不要有任何额外说明文字`;
  }
}
