/** 八字流月 — 共享类型 */

export interface BaziLiuYueInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  /** 目标年份 */
  targetYear: number;
  /** 目标月份(1-12)，可选，不传则返回全年12个月 */
  targetMonth?: number;
}

export interface BaziLiuYueResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  /** 日主 */
  dayMaster: string;
  /** 目标流年 */
  liuNian: { year: number; ganZhi: string };
  /** 逐月运势，12个月 */
  monthly: LiuYueMonthly[];
  /** 综合建议 */
  suggestion: string;
}

export interface LiuYueMonthly {
  /** 月份 1-12 */
  month: number;
  /** 流月干支 */
  ganZhi: string;
  /** 与日主十神关系 */
  shiShen: string;
  /** 月运评分 1-10 */
  score: number;
  /** 运势简评 */
  fortune: string;
  /** 重点关注 */
  focus: string[];
}
