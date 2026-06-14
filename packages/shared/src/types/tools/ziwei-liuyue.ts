// ── 紫微流月运势分析 ──

export interface ZiWeiLiuYueInput {
  mingGongZhi?: string;
  mingGongGan?: string;
  wuXingJu?: number;
  gender?: "男" | "女";
  liuNianYear?: number;
  liuYueMonth?: number;
}

export interface LiuYueSiHuaItem {
  star: string;
  huaType: "化禄" | "化权" | "化科" | "化忌";
  gongWei: string;
  effect: string;
}

export interface LiuYueGongItem {
  gongWei: string;
  yueJian: string;
  starList: string[];
  siHua: LiuYueSiHuaItem[];
  level: "吉" | "平" | "凶";
  summary: string;
}

export interface ZiWeiLiuYueResult {
  year: number;
  month: number;
  liuNianGanZhi: string;
  liuYueGanZhi: string;
  mingGongZhi: string;
  gongList: LiuYueGongItem[];
  summary: string;
}
