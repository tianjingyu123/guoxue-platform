// ── 奇门时课分析 ──

export interface QiMenShiKeInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  matterType?: "求财" | "出行" | "谈判" | "婚嫁" | "求职" | "搬迁" | "祭祀" | "谋事";
  name?: string;
}

export interface ShiKeGongPan {
  gongWei: string;
  men: string;
  xing: string;
  gan: string;
  shen: string;
  keYing: string;
  level: "吉" | "平" | "凶";
  advice: string;
}

export interface ShiKeJieGuo {
  bestTime: string;
  bestDirection: string;
  bestGongWei: string;
  avoidTime: string;
  avoidDirection: string;
}

export interface QiMenShiKeResult {
  datetime: string;
  juInfo: { yangDun: boolean; juShu: number; tianGan: string };
  gongPan: ShiKeGongPan[];
  jieGuo: ShiKeJieGuo;
  summary: string;
}
