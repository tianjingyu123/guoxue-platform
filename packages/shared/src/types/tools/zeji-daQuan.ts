// ── 择吉大全共享类型 ──

/** 输入：择吉查询 */
export interface ZeJiDaQuanInput {
  purpose: string;
  year: number;
  month?: number;
  shengXiao?: string;
  excludeMonths?: number[];
}

/** 输出：择吉结果 */
export interface ZeJiDaQuanResult {
  purpose: string;
  year: number;
  totalDays: number;
  bestDays: JiRiItem[];
  goodDays: JiRiItem[];
  summary: string;
}

/** 吉日条目 */
export interface JiRiItem {
  date: string;
  lunarDate: string;
  level: "上吉" | "大吉" | "吉";
  yi: string[];
  ji: string[];
  shenSha: string[];
  chongShengXiao: string;
  suitable: string[];
  unsuitable: string[];
}
