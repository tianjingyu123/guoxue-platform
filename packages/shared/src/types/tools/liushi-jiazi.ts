/** 六十甲子详解 — 共享类型 */

export interface LiuShiJiaZiInput {
  /** 干支对，如 "甲子" */
  ganZhi: string;
}

export interface LiuShiJiaZiResult {
  ganZhi: string;
  /** 序号(1-60) */
  index: number;
  /** 纳音 */
  naYin: string;
  /** 纳音详解 */
  naYinDetail: string;
  /** 天干信息 */
  gan: { name: string; element: string; yinYang: string; meaning: string };
  /** 地支信息 */
  zhi: { name: string; element: string; animal: string; meaning: string };
  /** 日柱性格特征 */
  personality: string[];
  /** 喜忌 */
  preferences: { suitable: string[]; avoid: string[] };
  /** 职业适配 */
  careerFit: string[];
  /** 婚配参考 */
  marriageRef: string;
  /** 古籍诗文 */
  poem: string;
  /** 综合断语 */
  judgment: string;
}
