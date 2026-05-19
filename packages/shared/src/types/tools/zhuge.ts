// ── 诸葛神数共享类型 ──

/** 起数方式 */
export type ZhuGeMethod = "sanzi" | "baoshu" | "random";

// ── 输入 ──

export interface ZhuGeInput {
  /** 起数方式 */
  method: ZhuGeMethod;
  /** 三个汉字（method=sanzi 时必填） */
  chars?: string;
  /** 三个数字（method=baoshu 时必填，每个1-999） */
  numbers?: [number, number, number];
  /** 所问事项 */
  question?: string;
}

// ── 签文 ──

export interface QianWen {
  /** 签号（1-384） */
  number: number;
  /** 签文正文 */
  text: string;
  /** 签文类型 */
  type: "上上" | "上吉" | "中上" | "中平" | "中下" | "下下";
  /** 对应卦象（六十四卦） */
  gua?: string;
  /** 白话解释 */
  baiHua: string;
}

// ── 起数过程 ──

export interface QiShuProcess {
  /** 输入的三字/三数 */
  raw: string;
  /** 各字笔画数或数字 */
  strokes: [number, number, number];
  /** 第一数相加 */
  sum1: number;
  /** 第二数相加 */
  sum2: number;
  /** 第三数相加 */
  sum3: number;
  /** 总和 */
  totalSum: number;
  /** 折384后的签号 */
  finalNumber: number;
  /** 折算过程说明 */
  processDesc: string;
}

// ── 输出 ──

export interface ZhuGeResult {
  input: ZhuGeInput;

  /** 起数过程 */
  qiShuProcess: QiShuProcess;

  /** 签文 */
  qianWen: QianWen;

  /** 解签 */
  jieQian: {
    /** 逐句解释 */
    lineByLine: { line: string; explanation: string }[];
    /** 总论 */
    summary: string;
    /** 针对所问事项的具体指导 */
    guidance: string;
  };

  /** 综合断语 */
  duanYu: string;
}
