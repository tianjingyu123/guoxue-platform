// ── 河洛理数共享类型 ──

export interface HeLuoInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: "男" | "女";
}

export interface HeLuoResult {
  siZhu: { nian: string; yue: string; ri: string; shi: string };
  ganNumbers: { nian: number; yue: number; ri: number; shi: number; total: number };
  zhiNumbers: { nian: number; yue: number; ri: number; shi: number; total: number };
  upperTrigram: { number: number; name: string; element: string };
  lowerTrigram: { number: number; name: string; element: string };
  hexagram: { name: string; symbol: string; number: number };
  dongYao: number;
  bianGua: { name: string; symbol: string };
  xianTianShu: number;
  houTianShu: number;
  interpretation: {
    benGua: string;
    dongYaoText: string;
    bianGuaText: string;
  };
  fortune: {
    career: string;
    wealth: string;
    love: string;
    health: string;
    personality: string;
  };
  summary: string;
}
