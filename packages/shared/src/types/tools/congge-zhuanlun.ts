// ── 从格专论类型 ──
// 八字从格/专旺格/化气格深度分析

export interface CongGeZhuanLunInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface CongGeZhuanLunResult {
  dayMaster: string;
  dayWx: string;
  /** 格局类型 */
  geType: "从强格" | "从旺格" | "从气格" | "从势格" | "假从格" | "正格";
  /** 详细格局名 */
  geName: string;
  /** 成格条件检查 */
  conditions: { name: string; satisfied: boolean; description: string }[];
  /** 用神（喜/忌） */
  xiShen: string[];
  jiShen: string[];
  /** 行运喜忌 */
  yunXi: string[];
  yunJi: string[];
  /** 真假从格判断 */
  isTrueCong: boolean;
  /** 破格条件 */
  poGeConditions: string[];
  /** 从格详解 */
  detail: string;
  analysis: string;
}
