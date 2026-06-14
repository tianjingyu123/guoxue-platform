/** 六爻纳甲 — 共享类型 */

export interface LiuYaoNaJiaInput {
  /** 卦序号 1-64 */
  guaNumber: number;
}

export interface LiuYaoNaJiaResult {
  number: number;
  /** 卦名 */
  name: string;
  /** 卦符 */
  symbol: string;
  /** 上下卦 */
  composition: { upper: string; lower: string };
  /** 六爻纳甲 */
  lines: NaJiaLine[];
  /** 世应 */
  shiYing: { shi: number; ying: number };
  /** 卦身 */
  guaShen: { position: number; ganZhi: string; meaning: string } | null;
  /** 六亲 */
  sixRelatives: string;
  /** 五行属性 */
  wuXing: string;
}

export interface NaJiaLine {
  position: number;
  name: string;
  naJia: string;
  liuQin: string;
  shiYing: "世" | "应" | "";
}
