import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

/** 单次 cron 最多评分条数（控制 AI 成本与时长） */
const BATCH_LIMIT = 30;
/** 提权/降权幅度（小时）：作用于 feed 的「等效时间」排序 */
export const BOOST_HOURS_A = 48; // 优质内容等效提前 48 小时（更"新鲜"）
export const DEMOTE_HOURS_D = 48; // 劣质内容等效滞后 48 小时（自然沉底）

export interface QualityScore {
  depth: number;
  originality: number;
  utility: number;
  appeal: number;
  total: number;
  grade: "A" | "B" | "C" | "D";
  reason: string;
}

/**
 * AI 内容质量评估（T7 · 任务八）：四维打分（深度/原创性/实用性/吸引力，各 0-25）
 * - 每小时 cron 扫描未评分的新文章/帖子，DeepSeek 打分落库（未配 KEY 静默跳过）
 * - 流量倾斜：getBoostMap 给 feed 提供「等效时间」偏移——A 级提权、D 级降权，B/C 不动
 * - 只做质量分层，不做违规判断（违规是 audit 三层漏斗的职责，两套体系分离）
 */
@Injectable()
export class ContentQualityService {
  private readonly logger = new Logger(ContentQualityService.name);

  constructor(private prisma: PrismaService) {}

  private aiEnabled(): boolean {
    return !!process.env.DEEPSEEK_API_KEY && process.env.NODE_ENV !== "test";
  }

  @Cron("30 * * * *")
  async scoreNewContentCron() {
    if (!this.aiEnabled()) return;
    try {
      const result = await this.scoreNewContent();
      if (result.scored > 0) this.logger.log(`内容质量评分：本轮 ${result.scored} 条`);
    } catch (e) {
      this.logger.error("内容质量评分批次失败", e as Error);
    }
  }

  /** 扫描近 7 天未评分的文章/帖子，逐条打分（单轮限量） */
  async scoreNewContent() {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [articles, posts] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED", createdAt: { gte: since } },
        select: { id: true, title: true, content: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.post.findMany({
        where: { status: "PUBLISHED", createdAt: { gte: since } },
        select: { id: true, content: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const candidates = [
      ...articles.map((a) => ({ type: "ARTICLE", id: a.id, text: `${a.title}\n${a.content ?? ""}` })),
      ...posts.map((p) => ({ type: "POST", id: p.id, text: p.content ?? "" })),
    ].filter((c) => c.text.trim().length >= 50); // 太短的内容不值得花 AI 成本

    const scoredRows = await this.prisma.contentQualityScore.findMany({
      where: { OR: candidates.slice(0, 500).map((c) => ({ targetType: c.type, targetId: c.id })) },
      select: { targetType: true, targetId: true },
    });
    const scoredSet = new Set(scoredRows.map((s) => `${s.targetType}:${s.targetId}`));
    const todo = candidates.filter((c) => !scoredSet.has(`${c.type}:${c.id}`)).slice(0, BATCH_LIMIT);

    let scored = 0;
    for (const item of todo) {
      const score = await this.scoreText(item.text);
      if (!score) continue;
      await this.prisma.contentQualityScore
        .create({
          data: {
            targetType: item.type,
            targetId: item.id,
            ...score,
            model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          },
        })
        .catch(() => undefined); // 并发重复评分冲突幂等忽略
      scored++;
    }
    return { scored, candidates: todo.length };
  }

  /** AI 四维打分；解析失败返回 null（该条下轮重试） */
  async scoreText(text: string): Promise<QualityScore | null> {
    if (!this.aiEnabled()) return null;
    try {
      const resp = await fetch(
        `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "你是国学传统文化平台的内容质量评审。对给定内容按四个维度各打 0-25 分：depth（学术/思想深度，有无出处与推理）、originality（原创性，是否有独立见解而非套话搬运）、utility（实用性，读者能否带走可用的东西）、appeal（吸引力，表达是否清晰生动）。只输出一个 JSON 对象，不要解释不要 markdown：{\"depth\":n,\"originality\":n,\"utility\":n,\"appeal\":n,\"reason\":\"一句话中文评语\"}",
              },
              { role: "user", content: text.slice(0, 3000) },
            ],
            temperature: 0.2,
            max_tokens: 200,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!resp.ok) return null;
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      return this.parseScore(data?.choices?.[0]?.message?.content ?? "");
    } catch {
      return null;
    }
  }

  /** 解析 AI 输出（容错：截取首个 JSON 对象；越界钳到 0-25） */
  parseScore(raw: string): QualityScore | null {
    try {
      const m = /\{[\s\S]*\}/.exec(raw);
      if (!m) return null;
      const obj = JSON.parse(m[0]) as Record<string, unknown>;
      const clamp = (v: unknown) => Math.max(0, Math.min(25, Math.round(Number(v) || 0)));
      const depth = clamp(obj.depth);
      const originality = clamp(obj.originality);
      const utility = clamp(obj.utility);
      const appeal = clamp(obj.appeal);
      const total = depth + originality + utility + appeal;
      const grade = total >= 80 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : "D";
      return { depth, originality, utility, appeal, total, grade, reason: String(obj.reason ?? "").slice(0, 100) };
    } catch {
      return null;
    }
  }

  /**
   * 流量倾斜：返回目标的「等效时间偏移」（毫秒）。A 级 +48h（更新鲜），D 级 -48h（沉底），其余 0。
   * feed 排序用 createdAt + offset，比改写排序算法侵入小得多。
   */
  async getBoostMap(targets: Array<{ type: string; id: string }>): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (targets.length === 0) return map;
    try {
      const scores = await this.prisma.contentQualityScore.findMany({
        where: { OR: targets.map((t) => ({ targetType: t.type, targetId: t.id })) },
        select: { targetType: true, targetId: true, grade: true },
      });
      for (const s of scores) {
        const offset =
          s.grade === "A" ? BOOST_HOURS_A * 3_600_000 : s.grade === "D" ? -DEMOTE_HOURS_D * 3_600_000 : 0;
        if (offset !== 0) map.set(`${s.targetType}:${s.targetId}`, offset);
      }
    } catch {
      /* 提权失败按无偏移处理，不影响 feed */
    }
    return map;
  }
}
