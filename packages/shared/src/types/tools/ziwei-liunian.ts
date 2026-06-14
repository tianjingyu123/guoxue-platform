// ── 紫微流年专项共享类型 ──

export interface ZiWeiLiuNianInput {
  mingGongZhi: string;
  mingGongGan: string;
  wuXingJu: number;
  gender: "男" | "女";
  liuNianYear: number;
  mingGongStars?: string[];
}

export interface ZiWeiLiuNianResult {
  liuNianYear: number;
  liuNianGanZhi: string;
  liuNianGongWei: string;
  siHua: LiuNianSiHuaItem[];
  liuYueYun: LiuYueItem[];
  summary: string;
}

export interface LiuNianSiHuaItem {
  star: string;
  huaType: "化禄" | "化权" | "化科" | "化忌";
  gongWei: string;
  meaning: string;
}

export interface LiuYueItem {
  month: number;
  monthZhi: string;
  keyStar: string;
  level: "吉" | "平" | "凶";
  event: string;
  advice: string;
}
