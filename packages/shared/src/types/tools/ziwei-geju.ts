/** 紫微格局详解 — 共享类型 */

export interface ZiweiGeJuInput {
  /** 命宫地支 */
  mingGongZhi: string;
  /** 命宫主星 */
  mingGongStars: string[];
  /** 十二宫星曜分布 */
  palaces: ZiweiPalaceInput[];
  /** 四化星 */
  siHua: { star: string; huaType: "化禄" | "化权" | "化科" | "化忌"; palace: string }[];
}

export interface ZiweiPalaceInput {
  name: string;
  zhi: string;
  stars: string[];
}

export interface ZiweiGeJuResult {
  /** 命宫格局（主格） */
  mainPatterns: ZiweiPattern[];
  /** 其他宫位格局 */
  otherPatterns: ZiweiPattern[];
  /** 格局总结 */
  summary: string;
  /** 吉凶综合评分(0-100) */
  score: number;
}

export interface ZiweiPattern {
  name: string;
  type: "富贵格" | "贫贱格" | "杂格" | "特殊格";
  /** 是否成格 */
  formed: boolean;
  /** 成格条件 */
  conditions: string[];
  /** 详细解释 */
  description: string;
  /** 古籍出处 */
  source: string;
}
