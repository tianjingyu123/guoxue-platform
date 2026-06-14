// ── 八字大运排盘共享类型 ──

export interface BaziDaYunInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  gender: "男" | "女";
}

export interface BaziDaYunResult {
  baZi: string;
  qiYunAge: number;
  qiYunDate: string;
  daYunList: DaYunItem[];
  summary: string;
}

export interface DaYunItem {
  order: number;
  startAge: number;
  endAge: number;
  ganZhi: string;
  ganShiShen: string;
  zhiShiShen: string;
  level: string;
  summary: string;
  careerTip: string;
  wealthTip: string;
  relationshipTip: string;
}
