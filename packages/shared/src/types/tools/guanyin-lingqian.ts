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
  /**
   * 签等。
   *
   * 🔴 2026-09-21：原先只声明五档（缺「中下」），与同目录 `lingqian.ts` 的
   * `QianGrade` 六档不一致。而两份观音签数据本是同一套 100 签 ——
   * `guanyin-lingqian.calculator.ts` 把 23 支「中下」签并进了「中平」，
   * 正是被这个五档类型逼的。已统一为六档，并把那 23 签改回「中下」。
   * 把中下签显示成中平，对求签的人是偏乐观的误导。
   *
   * 与 `QianGrade` 保持同一组取值；闸门见 `test/lingqian-grade-parity.spec.ts`。
   */
  level: "上上" | "上吉" | "中吉" | "中平" | "中下" | "下下";
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
