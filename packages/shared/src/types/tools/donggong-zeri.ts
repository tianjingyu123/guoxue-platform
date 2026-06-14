// ── 董公择日共享类型 ──

export type DongGongPurpose = "婚嫁" | "开业" | "搬迁" | "出行" | "动土" | "安葬" | "签约" | "祭祀" | "入学" | "求医" | "其他";

export interface DongGongInput {
  purpose: DongGongPurpose;
  year?: number;
  startMonth?: number;
  endMonth?: number;
}

export interface DongGongDay {
  date: string;
  lunarStr: string;
  dayGanZhi: string;
  grade: string;
  gradeName: string;
  score: number;
  reason: string;
  suitable: string[];
  unsuitable: string[];
}

export interface DongGongResult {
  input: DongGongInput;
  year: number;
  bestDays: DongGongDay[];
  allDays: DongGongDay[];
  summary: string;
}
