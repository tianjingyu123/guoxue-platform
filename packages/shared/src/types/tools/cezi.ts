/** 测字占卜 — 共享类型 */

export interface CeZiInput {
  /** 所测汉字 */
  character: string;
  /** 所问事项 */
  question?: string;
  /** 性别 */
  gender?: "男" | "女";
}

export interface CeZiResult {
  character: string;
  /** 字形拆解 */
  deconstruction: CeZiDeconstruct;
  /** 五行属性 */
  wuXing: { primary: string; analysis: string };
  /** 吉凶判断 */
  judgment: "大吉" | "吉" | "中" | "凶" | "大凶";
  /** 断语 */
  verdict: string;
  /** 各项分析 */
  analysis: {
    事业: string;
    财运: string;
    感情: string;
    健康: string;
  };
}

export interface CeZiDeconstruct {
  /** 部首 */
  radical: string;
  /** 组成部件 */
  components: string[];
  /** 总笔画数 */
  strokes: number;
  /** 结构 */
  structure: "左右" | "上下" | "包围" | "独体" | "左中右" | "上中下" | "品字";
  /** 拆解说明 */
  description: string;
}
