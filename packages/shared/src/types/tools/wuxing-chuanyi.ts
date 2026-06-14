/** 五行穿衣指南 — 共享类型 */

export interface WuXingChuanYiInput {
  /** 日期 YYYY-MM-DD */
  date: string;
}

export interface WuXingChuanYiResult {
  date: string;
  /** 当日干支 */
  dayGanZhi: string;
  /** 当日五行 */
  dayWuXing: string;
  /** 日柱纳音 */
  naYin: string;
  /** 五行穿衣配色 */
  colors: WuXingColor[];
  /** 穿搭建议 */
  suggestion: string;
}

export interface WuXingColor {
  /** 五行 */
  element: string;
  /** 推荐度 */
  level: "大吉" | "吉" | "小吉" | "忌";
  /** 颜色列表 */
  colors: string[];
  /** 说明 */
  description: string;
}
