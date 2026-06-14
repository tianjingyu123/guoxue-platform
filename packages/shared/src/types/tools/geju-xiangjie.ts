/** 格局详解 — 共享类型 */

export interface GeJuXiangJieInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface GeJuXiangJieResult {
  /** 月令格局 */
  monthPattern: GeJuDetail;
  /** 其他可能格局 */
  alternativePatterns: GeJuDetail[];
  /** 格局层次 */
  quality: "上等" | "中等" | "下等";
  /** 是否有破格 */
  brokenPatterns: BrokenPattern[];
  /** 成格条件分析 */
  analysis: string;
}

export interface GeJuDetail {
  name: string;
  type: "正格" | "变格" | "特殊格局";
  category: "财格" | "官格" | "印格" | "食伤格" | "建禄格" | "羊刃格" | "从格" | "化格" | "其他";
  /** 成格条件 */
  conditions: string[];
  /** 是否成格 */
  formed: boolean;
  /** 相神/用神 */
  supportingGod: string;
  /** 古籍出处 */
  source: string;
  /** 详细解释 */
  description: string;
}

export interface BrokenPattern {
  pattern: string;
  breaks: string[];
  /** 是否有救应 */
  remedy?: string;
}
