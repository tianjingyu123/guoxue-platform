/** 胎命身宫 — 共享类型 */

export interface TaiMingShenInput {
  /** 月柱 如 丙寅 */
  monthPillar: string;
  /** 时柱 如 庚申 */
  hourPillar: string;
  /** 年柱 如 甲子 */
  yearPillar: string;
  /** 性别 */
  gender: "男" | "女";
}

export interface TaiMingShenResult {
  /** 胎元 */
  taiYuan: { ganZhi: string; meaning: string };
  /** 命宫 */
  mingGong: { ganZhi: string; zhi: string; meaning: string };
  /** 身宫 */
  shenGong: { ganZhi: string; zhi: string; meaning: string };
  /** 三宫互动分析 */
  palaceInteractions: PalaceInteraction[];
  /** 综合解读 */
  analysis: string;
}

export interface PalaceInteraction {
  /** 两宫关系 */
  pair: string;
  /** 地支关系类型 */
  relation: string;
  /** 关系解读 */
  description: string;
}
