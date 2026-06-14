// ── 八字合婚 共享类型 ──

export interface BaziHehunInput {
  male: { year: number; month: number; day: number; hour: number; minute?: number };
  female: { year: number; month: number; day: number; hour: number; minute?: number };
}

export interface HehunDimension {
  name: string;
  score: number;
  maxScore: number;
  desc: string;
  details: string[];
}

export interface BaziHehunResult {
  input: BaziHehunInput;
  maleShengXiao: string;
  femaleShengXiao: string;
  maleDayPillar: string;
  femaleDayPillar: string;
  dimensions: {
    shengXiao: HehunDimension;
    riZhu: HehunDimension;
    wuXing: HehunDimension;
    shiShen: HehunDimension;
    yongShen: HehunDimension;
    nayin: HehunDimension;
  };
  totalScore: number;
  level: string;
  summary: string;
  advice: string[];
}
