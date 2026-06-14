// ── 数字能量扩展（车牌/门牌/银行卡号）共享类型 ──

import type { CiChangType, NumberPair } from "./phone-analysis";

export type NumberType = "license_plate" | "house_number" | "bank_card";

export interface ShuZiNengLiangInput {
  type: NumberType;
  number: string;
  birthday?: string;
}

export interface ShuZiNengLiangResult {
  input: ShuZiNengLiangInput;
  meta: { typeName: string; normalizedNumber: string; digitCount: number };
  pairs: NumberPair[];
  shuLi: { value: number; jiXiong: string; desc: string };
  ciChangSummary: { main: CiChangType; goodCount: number; badCount: number; desc: string };
  totalScore: number;
  scores: { career: number; wealth: number; love: number; health: number; social: number };
  duanYu: string;
  advice: string[];
}
