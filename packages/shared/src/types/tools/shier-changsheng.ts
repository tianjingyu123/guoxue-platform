/** 十二长生运程 — 共享类型 */

export interface ShiErChangShengInput {
  /** 日干，如 甲 */
  dayGan: string;
  /** 四柱地支：年支/月支/日支/时支 */
  yearZhi: string;
  monthZhi: string;
  dayZhi: string;
  hourZhi: string;
}

export interface ShiErChangShengResult {
  dayGan: string;
  /** 日干五行 */
  dayWx: string;
  /** 阴阳 */
  yinYang: "阳" | "阴";
  /** 十二长生顺逆 */
  direction: "顺行" | "逆行";
  /** 各柱长生状态 */
  pillars: {
    label: string;
    zhi: string;
    changSheng: string;
    stage: number;
    meaning: string;
  }[];
  /** 长生十二宫完整解读 */
  changShengMap: { name: string; stage: number; meaning: string }[];
  /** 综合解读 */
  analysis: string;
}
