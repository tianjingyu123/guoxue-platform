// ── 焦氏易林（焦赣《易林》）共享类型 ──
// 西汉焦延寿著，以64卦为本，每卦可变为64卦，共4096条林辞（变卦判词）
// 每条林辞含四言诗判词、吉凶判断和象喻

export interface JiaoshiYilinInput {
  /** 本卦（1-64 按周易卦序） */
  baseHexagram: number;
  /** 变卦（1-64，不传则随机） */
  changingHexagram?: number;
  /** 随机种子（传则结果确定） */
  seed?: number;
}

export interface JiaoshiYilinResult {
  baseHexagram: { number: number; name: string; symbol: string };
  changingHexagram: { number: number; name: string; symbol: string };
  /** 林辞正文（四言韵文） */
  verse: string;
  /** 白话释义 */
  interpretation: string;
  /** 吉凶判断 */
  judgment: "大吉" | "吉" | "中" | "凶" | "大凶";
  /** 所问事项宜忌 */
  advice: { suitable: string[]; avoid: string[] };
}
