/** 用神喜忌分析 — 共享类型 */

export interface YongShenFenXiInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  /** 真太阳时调整(分钟) */
  solarAdjustment?: number;
}

export interface YongShenFenXiResult {
  /** 日主五行 */
  dayMaster: { stem: string; element: string; yinYang: string };
  /** 月令旺衰 */
  monthOrder: { branch: string; season: string; strength: "旺" | "相" | "休" | "囚" | "死" };
  /** 五行力量分布(%) */
  elementDistribution: Record<string, number>;
  /** 日主综合评分(0-100) */
  dayMasterScore: number;
  /** 旺衰判断 */
  strengthLevel: "极旺" | "身强" | "中和" | "身弱" | "极弱";
  /** 用神推荐 */
  yongShen: YongShenDetail;
  /** 喜神 */
  xiShen: string[];
  /** 忌神 */
  jiShen: string[];
  /** 调候分析 */
  tiaoHou: TiaoHouAnalysis;
  /** 扶抑/通关/病药分析 */
  analysis: string[];
}

export interface YongShenDetail {
  primary: string;
  secondary: string[];
  reasoning: string;
  /** 用神是否有力 */
  strength: "有力" | "中等" | "偏弱";
  /** 大运是否助用神 */
  luckSupport: string;
}

export interface TiaoHouAnalysis {
  needed: boolean;
  season: string;
  description: string;
  recommended: string[];
}
