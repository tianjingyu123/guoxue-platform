// ── 奇门应期判断类型 ──
// 奇门遁甲应期判断：何时事成/何时化解

export interface QiMenYingXunInput {
  /** 所问之事类型 */
  matterType?: "求财" | "婚姻" | "出行" | "失物" | "官讼" | "疾病" | "行人" | "谋事";
  /** 用神宫位落宫(可选，不传则看通用) */
  yongShenGong?: string;
}

export interface YingXunRule {
  /** 应期类型 */
  ruleType: string;
  /** 判断方法 */
  method: string;
  /** 示例 */
  example: string;
  /** 准确度 */
  accuracy: "高" | "中";
}

export interface MatterYingXun {
  /** 事项 */
  matter: string;
  /** 用神说明 */
  yongShen: string;
  /** 应期规则列表 */
  rules: YingXunRule[];
  /** 速断口诀 */
  kouJue: string;
}

export interface QiMenYingXunResult {
  matter: MatterYingXun | null;
  allMatters: MatterYingXun[];
  analysis: string;
}
