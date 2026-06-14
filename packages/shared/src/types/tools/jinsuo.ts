// ── 金锁玉关共享类型 ──

export type ShaShui = "砂" | "水" | "未知";

export interface JinSuoInput {
  kan?: ShaShui;
  kun?: ShaShui;
  zhen?: ShaShui;
  xun?: ShaShui;
  qian?: ShaShui;
  dui?: ShaShui;
  gen?: ShaShui;
  li?: ShaShui;
}

export interface DirectionAnalysis {
  position: string;
  number: number;
  direction: string;
  mountains: string;
  need: "砂" | "水";
  actual: ShaShui;
  isAuspicious: boolean;
  effect: string;
}

export interface JinSuoResult {
  analysis: DirectionAnalysis[];
  score: number;
  maxScore: number;
  level: string;
  auspicious: string[];
  inauspicious: string[];
  fortune: {
    overall: string;
    career: string;
    wealth: string;
    health: string;
    family: string;
  };
  advice: string[];
  summary: string;
}
