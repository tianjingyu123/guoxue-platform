import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { REPORT_KNOWLEDGE_SEEDS, seedCountByType, type ReportKnowledgeSeed } from "./knowledge-seed";

/**
 * 报告知识库种子入库（2026-09-18）
 *
 * 报告的「依据」只来自这张表里 APPROVED 的条目；表空着，报告就只剩模型自说自话。
 * 种子写在代码里而不是手工插库，是为了可评审、可复现：谁加的、依据什么、改了什么，git 里看得到。
 *
 * 幂等：按 (paipanType, title) 认定同一条。已存在的条目**不覆盖**——
 * 人工在后台改过的内容优先于种子，种子只负责把空白补上。
 *
 * 状态：种子条目直接置为 APPROVED（平台自行整理、已按重述口径处理），
 * createdBy 标记为 platform-seed，reviewNote 写明来源口径，后台可随时下架或改写。
 */
@Injectable()
export class PaipanReportKnowledgeSeeder {
  private readonly logger = new Logger(PaipanReportKnowledgeSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed(seeds: ReportKnowledgeSeed[] = REPORT_KNOWLEDGE_SEEDS) {
    let created = 0;
    let skipped = 0;

    for (const s of seeds) {
      const exists = await this.prisma.paipanReportKnowledge.findFirst({
        where: { paipanType: s.paipanType, title: s.title },
        select: { id: true },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const isClassic = s.kind === "classic_excerpt";
      const sourceKind = s.sourceKind ?? (isClassic ? "classic_public" : "platform_expert");
      try {
        await this.prisma.paipanReportKnowledge.create({
          data: {
            paipanType: s.paipanType,
            school: s.school ?? null,
            kind: s.kind,
            topic: s.topic,
            tags: s.tags,
            title: s.title,
            content: s.content,
            bookTitle: s.bookTitle ?? null,
            chapterTitle: s.chapterTitle ?? null,
            sourceKind,
            sourceRefs: (s.sourceRefs ?? []) as any,
            debateKey: s.debateKey ?? null,
            stance: s.stance ?? "mainstream",
            // 只有公版古籍白文能按「原文」展示；其余一律是自行重述的知识要点
            restated: !isClassic || sourceKind !== "classic_public",
            quotable: isClassic && sourceKind === "classic_public",
            status: "APPROVED",
            createdBy: "platform-seed",
            reviewNote: "平台整理的知识要点，按重述口径入库；来源线索见 sourceRefs",
          },
        });
        created++;
      } catch (error: any) {
        this.logger.warn(`报告知识种子入库失败（${s.paipanType}/${s.title}）：${error?.message || error}`);
      }
    }

    const byType = seedCountByType(seeds);
    this.logger.log(
      `报告知识种子完成：新增 ${created} 条，已存在跳过 ${skipped} 条；覆盖 ${Object.entries(byType)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ")}`,
    );
    return { created, skipped, byType };
  }
}
