// ── 二十四山方位类型 ──
// 风水二十四山方位详解（罗盘核心）

export interface ErShiSiShanInput {
  /** 山名(子/癸/丑/艮/寅/甲/卯/乙/辰/巽/巳/丙/午/丁/未/坤/申/庚/酉/辛/戌/乾/亥/壬) */
  shanName?: string;
}

export interface ShanDetail {
  /** 山名 */
  name: string;
  /** 方位角度 */
  angle: string;
  /** 八卦归属 */
  baGua: string;
  /** 五行 */
  wuXing: string;
  /** 阴阳 */
  yinYang: "阳" | "阴";
  /** 三元龙(地元/天元/人元) */
  sanYuanLong: "地元龙" | "天元龙" | "人元龙";
  /** 天地人三卦 */
  gua: string;
  /** 纳甲 */
  naJia: string;
  /** 九星 */
  jiuXing: string;
  /** 吉凶 */
  jiXiong: "吉" | "平" | "凶";
  /** 宜忌 */
  yi: string;
  /** 忌 */
  ji: string;
  /** 应事 */
  yingShi: string;
  /** 配水法 */
  shuiFa: string;
}

export interface ErShiSiShanResult {
  shan: ShanDetail | null;
  allShan: ShanDetail[];
  analysis: string;
}
