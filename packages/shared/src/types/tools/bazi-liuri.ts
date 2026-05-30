// ── 八字流日流时 共享类型 ──

export interface BaziLiuRiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: "男" | "女";
  targetYear: number;
  targetMonth: number;
  targetDay: number;
  targetHour?: number;
}

export interface LiuRiPillar {
  ganZhi: string;
  gan: string;
  zhi: string;
  ganShiShen: string;
  zhiShiShen: string;
  nayin: string;
}

export interface LiuRiInteraction {
  type: "天干合" | "地支六合" | "地支三合" | "地支六冲" | "地支六害" | "地支刑" | "地支自刑";
  from: string;
  to: string;
  desc: string;
}

export interface LiuRiDaYunContext {
  ganZhi: string;
  ganShiShen: string;
  zhiShiShen: string;
  startAge: number;
  endAge: number;
}

export interface LiuRiLiuNianContext {
  year: number;
  ganZhi: string;
  ganShiShen: string;
  zhiShiShen: string;
}

export interface BaziLiuRiResult {
  natalChart: {
    nian: string;
    yue: string;
    ri: string;
    shi: string;
    riGan: string;
  };
  currentDaYun: LiuRiDaYunContext | null;
  currentLiuNian: LiuRiLiuNianContext;
  liuRi: LiuRiPillar;
  liuShi: LiuRiPillar | null;
  interactions: LiuRiInteraction[];
  fortune: {
    overall: string;
    career: string;
    wealth: string;
    love: string;
    health: string;
  };
  advice: string;
  summary: string;
}
