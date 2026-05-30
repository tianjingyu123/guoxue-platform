// ── 灵签/抽签 共享类型 ──

export type LingQianType = "guanyin" | "guandi" | "lvzu" | "mazu" | "huangdaxian" | "yuelao";

export type QianGrade = "上上" | "上吉" | "中吉" | "中平" | "中下" | "下下";

export interface LingQianInput {
  type: LingQianType;
  question?: string;
  seed?: number;
}

export interface QianEntry {
  number: number;
  grade: QianGrade;
  title: string;
  poem: string;
  interpretation: string;
  advice: {
    general: string;
    wealth: string;
    love: string;
    career: string;
    health: string;
  };
}

export interface LingQianResult {
  input: LingQianInput;
  typeName: string;
  totalSigns: number;
  sign: QianEntry;
  shakeProcess: string;
}
