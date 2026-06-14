// ── 嫁娶择日类型 ──
// 大利月 + 翁姑禁忌 + 周堂图 + 嫁娶吉日

export interface JiaQuZeRiInput {
  /** 新娘出生年 */
  brideYear: number;
  /** 新郎生肖 */
  groomShengXiao?: string;
  /** 目标年份 */
  targetYear: number;
  /** 目标月份(可选1-12) */
  targetMonth?: number;
  /** 新娘父母生肖(可选，用于翁姑禁忌) */
  brideFatherSX?: string;
  brideMotherSX?: string;
  /** 新郎父母生肖(可选) */
  groomFatherSX?: string;
  groomMotherSX?: string;
}

export interface JiaQuZeRiResult {
  brideYear: number;
  brideShengXiao: string;
  targetYear: number;
  /** 大利月 */
  daLiYue: { month: number; name: string; desc: string }[];
  /** 小利月 */
  xiaoLiYue: { month: number; name: string; desc: string }[];
  /** 翁姑禁忌月 */
  tabooMonths: { month: number; name: string; taboo: string; description: string }[];
  /** 周堂图结果 */
  zhouTang: ZhouTangResult;
  /** 具体推荐日期(在目标月份内) */
  recommendDates: JiaQuDate[];
  /** 全年嫁娶吉日概览 */
  yearlyOverview: { month: number; name: string; goodDates: number; level: "大利" | "小利" | "忌" }[];
  suggestions: string[];
  analysis: string;
}

export interface ZhouTangResult {
  /** 周堂图起法说明 */
  rule: string;
  /** 当月每日周堂吉凶 */
  dailyStatus: { day: number; zhouTang: string; available: boolean }[];
}

export interface JiaQuDate {
  /** YYYY-MM-DD */
  date: string;
  /** 农历日期 */
  lunarDate: string;
  /** 当日干支 */
  ganZhi: string;
  /** 宜嫁娶原因 */
  reason: string;
  /** 吉神 */
  jiShen: string[];
  /** 凶神 */
  xiongShen: string[];
  /** 冲煞 */
  chongSha: string;
  /** 综合评分 1-10 */
  score: number;
  /** 当日宜忌 */
  yiJi: string;
}
