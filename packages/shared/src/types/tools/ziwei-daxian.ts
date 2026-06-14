// ── 紫微大限十年吉凶共享类型 ──

/** 输入：紫微命盘构造参数 */
export interface ZiWeiDaXianInput {
  mingGongZhi: string;
  mingGongGan: string;
  shenGongZhi?: string;
  wuXingJu: number;
  gender: "男" | "女";
  /** 命宫主星列表 */
  mingGongStars?: string[];
  /** 身宫主星列表 */
  shenGongStars?: string[];
}

/** 输出：大限分析 */
export interface ZiWeiDaXianResult {
  mingGong: string;
  xianTianGeJu: string;
  daXianList: DaXianItem[];
  summary: string;
}

/** 单条大限信息 */
export interface DaXianItem {
  startAge: number;
  endAge: number;
  daXianZhi: string;
  daXianGan: string;
  gongWei: string;
  stars: string[];
  siHua: SiHuaItem[];
  level: "大吉" | "吉" | "平" | "凶" | "大凶";
  generalSummary: string;
  careerTip: string;
  wealthTip: string;
  healthTip: string;
  relationshipTip: string;
}

/** 四化信息 */
export interface SiHuaItem {
  star: string;
  huaType: "化禄" | "化权" | "化科" | "化忌";
  meaning: string;
}
