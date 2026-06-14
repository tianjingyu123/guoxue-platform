/** 五行力量分析 — 共享类型 */

export interface WuXingLiLiangInput {
  /** 年柱 */
  yearPillar: string;
  /** 月柱 */
  monthPillar: string;
  /** 日柱 */
  dayPillar: string;
  /** 时柱 */
  hourPillar: string;
}

export interface WuXingLiLiangResult {
  /** 各五行权重 */
  wuXing: {
    wood: WuXingScore;
    fire: WuXingScore;
    earth: WuXingScore;
    metal: WuXingScore;
    water: WuXingScore;
  };
  /** 日主五行 */
  dayMaster: string;
  /** 身强身弱判断 */
  shenQiangRuo: string;
  /** 喜用建议 */
  xiYong: string[];
  /** 能量雷达图数据 */
  radar: { name: string; value: number }[];
  /** 综合解读 */
  analysis: string;
}

export interface WuXingScore {
  value: number;
  percent: string;
  detail: string[];
}
