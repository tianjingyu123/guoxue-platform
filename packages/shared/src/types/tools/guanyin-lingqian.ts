// ── 观音灵签类型 ──
// 观音灵签100签占卜

export interface GuanYinLingQianInput {
  /** 签号(1-100)，不传则随机 */
  qianNumber?: number;
  /** 求签问题 */
  question?: string;
}

export interface LingQianDetail {
  /** 签号 */
  number: number;
  /** 签名 */
  name: string;
  /** 签等 */
  level: "上上" | "上吉" | "中吉" | "中平" | "下下";
  /** 签诗 */
  poem: string;
  /** 白话解 */
  baiHua: string;
  /** 解曰 */
  jieYue: string;
  /** 仙机（家宅/自身/求财/婚姻/六甲/行人/田蚕/六畜/寻人/公讼/移徙/疾病/山坟） */
  xianJi: Record<string, string>;
  /** 典故 */
  dianGu: string;
}

export interface GuanYinLingQianResult {
  qian: LingQianDetail;
  /** 所有签速查表 */
  allQian: { number: number; name: string; level: string }[];
  analysis: string;
}
