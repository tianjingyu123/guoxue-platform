// ── 八字健康/疾病预测共享类型 ──

/** 输入：四柱八字 + 性别 */
export interface BaziJianKangInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  gender?: "男" | "女";
}

/** 输出：八字健康分析 */
export interface BaziJianKangResult {
  summary: string;
  wuXingHealth: WuXingHealthItem[];
  zangFuAnalysis: ZangFuItem[];
  yiHuanList: YiHuanItem[];
  yangShengAdvice: YangShengItem[];
}

/** 五行健康状态 */
export interface WuXingHealthItem {
  wuXing: string;
  status: "过旺" | "过弱" | "平衡" | "缺失";
  score: number;
  desc: string;
}

/** 脏腑分析 */
export interface ZangFuItem {
  organ: string;
  wuXing: string;
  level: "健康" | "需注意" | "易患病";
  detail: string;
}

/** 易患疾病 */
export interface YiHuanItem {
  name: string;
  category: string;
  probability: "高" | "中" | "低";
  reason: string;
  prevention: string;
}

/** 养生建议 */
export interface YangShengItem {
  aspect: string;
  advice: string;
  foods: string[];
  avoid: string[];
}
