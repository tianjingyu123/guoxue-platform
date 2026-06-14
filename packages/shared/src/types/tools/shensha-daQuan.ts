// ── 神煞大全共享类型 ──

/** 输入：四柱八字 */
export interface ShenShaDaQuanInput {
  yearPillar: string;   // 如 "甲子"
  monthPillar: string;  // 如 "丙寅"
  dayPillar: string;    // 如 "戊辰"
  hourPillar: string;   // 如 "庚申"
  gender?: "男" | "女";
}

/** 输出：分14类的神煞结果 */
export interface ShenShaDaQuanResult {
  summary: { total: number; jiCount: number; xiongCount: number };
  categories: ShenShaCategory[];
}

/** 神煞分类 */
export interface ShenShaCategory {
  name: string;        // 分类名
  items: ShenShaDaQuanEntry[];
}

/** 单个神煞 */
export interface ShenShaDaQuanEntry {
  name: string;        // 神煞名
  type: "吉" | "凶" | "中性";
  applicable: boolean; // 此命是否带此神煞
  location?: string;   // 落在哪一柱
  meaning: string;     // 简短含义
  detail: string;      // 详细解释（20-50字）
}
