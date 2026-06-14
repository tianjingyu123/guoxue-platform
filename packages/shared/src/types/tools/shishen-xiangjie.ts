/** 十神详解 — 共享类型 */

export interface ShiShenXiangJieInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface ShiShenXiangJieResult {
  /** 日主 */
  dayMaster: string;
  /** 四柱十神 */
  pillars: PillarShiShen[];
  /** 十神力量分布 */
  distribution: Record<string, number>;
  /** 十神格局简评 */
  pattern: string;
  /** 各十神详解 */
  details: ShiShenDetail[];
  /** 综合断语 */
  analysis: string;
}

export interface PillarShiShen {
  pillar: string;
  ganZhi: string;
  ganShiShen: string;
  zhiCangGan: { gan: string; shiShen: string }[];
}

export interface ShiShenDetail {
  name: string;
  count: number;
  meaning: string;
  /** 性格影响 */
  personality: string;
  /** 六亲对应 */
  kinship: string;
}
