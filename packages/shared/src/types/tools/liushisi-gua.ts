/** 六十四卦详解 — 共享类型 */

export interface LiuShiSiGuaInput {
  /** 卦序号 1-64 */
  hexagramNumber: number;
}

export interface LiuShiSiGuaResult {
  /** 序号 */
  number: number;
  /** 卦名 */
  name: string;
  /** 卦符（Unicode） */
  symbol: string;
  /** 上卦/下卦 */
  composition: { upper: string; lower: string };
  /** 卦辞 */
  judgment: string;
  /** 彖传 */
  tuanZhuan: string;
  /** 大象传 */
  xiangZhuan: string;
  /** 六爻爻辞 */
  lines: HexagramLine[];
  /** 吉凶 */
  overall: "大吉" | "吉" | "中" | "凶" | "大凶";
  /** 五行属性 */
  wuXing: string;
  /** 事业/财运/感情/健康简析 */
  analysis: { 事业: string; 财运: string; 感情: string; 健康: string };
  /** 关键词 */
  keywords: string[];
}

export interface HexagramLine {
  position: number;  // 1-6（初爻→上爻）
  name: string;      // 初九/六二 等
  text: string;      // 爻辞
  meaning: string;   // 白话释义
}
