// ── 奇门终身局 ──

export interface QiMenZhongShenInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  gender?: "男" | "女";
  name?: string;
}

export interface QiMenGongInfo {
  gongWei: string;
  men: string;
  xing: string;
  gan: string;
  shen: string;
  baGua: string;
  level: "吉" | "平" | "凶";
  score: number;
}

export interface ZhongShenDaYunItem {
  age: number;
  gongWei: string;
  ganZhi: string;
  level: string;
  description: string;
}

export interface QiMenZhongShenResult {
  baZi: string;
  paiPan: {
    yangDun: boolean;
    juShu: number;
    gongList: QiMenGongInfo[];
  };
  daYunList: ZhongShenDaYunItem[];
  yiShengGist: string;
  summary: string;
}
