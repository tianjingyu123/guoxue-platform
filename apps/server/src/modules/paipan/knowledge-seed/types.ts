/**
 * 报告知识库种子（2026-09-18）
 *
 * 为什么要有这个文件：报告的「依据」只来自 PaipanReportKnowledge 里人工审核过的条目，
 * 知识库空着，报告就只剩模型自说自话——那正是我们要跟普通 AI 拉开距离的地方。
 * 种子进版本库的好处是可评审、可复现、可追责：谁加的、依据什么、改了什么，git 里都看得到。
 *
 * 版权口径（决策人 2026-09-18 确认，并据此收紧了做法）：
 * 著作权保护的是**表达**，不是思想、方法与规则。命理的理论本身不受保护，
 * 但逐字抄录他人（含网络文章、现代著作、点校本）的文字，即使注明来源也不免责。
 * 因此这里的条目一律是**自己的话重述**（restated=true），来源线索记在 sourceRefs 里供审核追溯；
 * 只有公版古籍白文才允许 quotable=true 并按「原文」展示、跳转读原书。
 *
 * tags 是硬约束：报告检索按 `tags hasSome signals.value` 精确命中，
 * 所以 tags 必须与各盘 signals 产出的 value 一字不差（如六爻的「妻财持世」、梅花的「体克用」）。
 */

export interface ReportKnowledgeSeed {
  /** bazi / ziwei / liuyao / meihua / qimen / daliuren */
  paipanType: string;
  /** 门派 id；不填＝各派通用的基础理论 */
  school?: string;
  kind: "school_theory" | "classic_excerpt" | "knowledge_point";
  topic: string;
  /** 必须与 signals 的 value 完全一致，否则永远检索不到 */
  tags: string[];
  title: string;
  content: string;
  bookTitle?: string;
  chapterTitle?: string;
  sourceKind?: "classic_public" | "modern_work" | "web" | "oral" | "platform_expert";
  /** 来源线索，仅供审核追溯，不对外展示 */
  sourceRefs?: { label: string; note?: string }[];
  /**
   * 议题键：讲同一件事的条目（不论哪派）挂同一个键，报告才聚得成一组，
   * 说得清「这件事上共识是什么、我们取哪一说」。留空＝不参与观点对照。
   */
  debateKey?: string;
  /** 这条在议题里的位置；每个议题必须有且只有一条 platform_line，否则该议题不会展示 */
  stance?: "consensus" | "mainstream" | "alternative" | "minority" | "platform_line";
}
