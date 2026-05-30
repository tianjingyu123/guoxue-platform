// ── 星座运势 共享类型 ──

export type XingZuo = "白羊座" | "金牛座" | "双子座" | "巨蟹座" | "狮子座" | "处女座" | "天秤座" | "天蝎座" | "射手座" | "摩羯座" | "水瓶座" | "双鱼座";

export interface XingZuoYunshiInput {
  xingZuo?: XingZuo;
  birthMonth?: number;
  birthDay?: number;
  date?: string;
}

export interface XingZuoScores {
  total: number;
  career: number;
  wealth: number;
  love: number;
  health: number;
}

export interface XingZuoYunshiResult {
  input: XingZuoYunshiInput;
  xingZuo: XingZuo;
  element: string;
  date: string;
  scores: XingZuoScores;
  lucky: {
    color: string;
    number: number;
    xingZuoPartner: XingZuo;
  };
  summary: string;
  advice: string;
}
