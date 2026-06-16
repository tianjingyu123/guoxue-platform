/** 三合四大水法 — 共享类型 */

export interface SanheShuifaInput {
  /** 坐山，二十四山之一，如 "子"、"午"、"卯" */
  sitting?: string;
  /** 朝向，二十四山之一，如 "午"、"子"、"酉" */
  facing?: string;
  /** 或直接传坐山朝向字符串，如 "子山午向" */
  shanXiang?: string;
  /** 水口位置，二十四山双山之一，如 "乙辰"、"辛戌" */
  shuiKou?: string;
  /** 查询模式: single=单盘分析, all=四大局全览 */
  mode?: "single" | "all";
}

export interface BureauInfo {
  /** 局名: 火局/水局/金局/木局 */
  name: string;
  /** 五行 */
  wuXing: string;
  /** 库位 */
  ku: string;
  /** 长生起处 */
  changeSheng: string;
  /** 口诀 */
  kouJue: string;
  /** 十二长生宫在二十四山上的分布 */
  stages: Record<string, string>;
}

export interface DirectionEval {
  /** 向的类型 */
  type: string;
  /** 长生宫位 */
  stage: string;
  /** 吉凶 */
  jiXiong: string;
  /** 来水宜从 */
  laiShui: string;
  /** 去水宜从 */
  quShui: string;
  /** 详细评语 */
  eval: string;
}

export interface SanheShuifaResult {
  /** 查询模式 */
  mode: string;
  /** 坐山朝向 */
  shanXiang?: string;
  /** 所属四大局 */
  bureau?: BureauInfo;
  /** 水法评价 */
  evaluation?: DirectionEval;
  /** 四大局全览 */
  allBureaus?: BureauInfo[];
  /** 综合解读 */
  analysis: string;
}
