// ── 紫微流日共享类型 ──

export interface ZiweiLiuRiInput {
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

export interface FlowPalace {
  flowGongName: string;
  natalGongName: string;
  zhi: string;
  natalStars: string[];
  isHuaLu: boolean;
  isHuaQuan: boolean;
  isHuaKe: boolean;
  isHuaJi: boolean;
}

export interface ZiweiLiuRiResult {
  natalInfo: {
    wuXingJu: string;
    mingGongZhi: string;
    shenGong: string;
  };
  flowDay: {
    ganZhi: string;
    gan: string;
    zhi: string;
  };
  flowHour: { ganZhi: string; gan: string; zhi: string } | null;
  flowDayMingGong: string;
  flowSiHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string };
  palaces: FlowPalace[];
  fortune: {
    overall: string;
    career: string;
    wealth: string;
    love: string;
    health: string;
  };
  highlights: string[];
  summary: string;
}
