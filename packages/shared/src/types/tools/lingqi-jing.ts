// ── 灵棋经类型 ──
// 125卦 + 颜幼明/何承天古注 + 白话释义

export interface LingQiJingInput {
  /** 1-125 卦序号，或随机生成 */
  guaNumber?: number;
  /** 是否随机起卦 */
  random?: boolean;
  /** 所问事项 */
  question?: string;
}

export interface LingQiJingGua {
  /** 1-125 卦序号 */
  index: number;
  /** 卦名 */
  name: string;
  /** 卦象描述（上中下三爻组合） */
  xiangDesc: string;
  /** 颜幼明注 */
  yanZhu: string;
  /** 何承天注 */
  heZhu: string;
  /** 现代白话释义 */
  baiHua: string;
  /** 吉凶：大吉/上吉/中平/下凶/大凶 */
  jiXiong: "大吉" | "上吉" | "中平" | "下凶" | "大凶";
  /** 所宜 */
  suoyi: string;
  /** 所忌 */
  suoji: string;
  /** 卦象诗曰 */
  shiYue: string;
}

export interface LingQiJingResult {
  gua: LingQiJingGua;
  question?: string;
  analysis: string;
  /** 125卦速查索引 */
  fullIndex: { index: number; name: string; jiXiong: string }[];
}
