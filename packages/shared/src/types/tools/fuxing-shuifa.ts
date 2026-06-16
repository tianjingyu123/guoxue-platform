/** 辅星水法 — 共享类型 */

export interface FuxingShuifaInput {
  /** 坐山，二十四山之一 */
  sitting?: string;
  /** 朝向，二十四山之一 */
  facing?: string;
  /** 或直接传坐山朝向字符串，如 "子山午向" */
  shanXiang?: string;
  /** 查询模式: single=单盘分析, all=八卦全览 */
  mode?: "single" | "all";
}

export interface FuxingStarPosition {
  /** 卦名 */
  gua: string;
  /** 二十四山中的哪些山属于此卦位 */
  mountains: string[];
  /** 九星名 */
  star: string;
  /** 吉凶 */
  jiXiong: string;
  /** 宜来水还是去水 */
  waterDirection: string;
  /** 五行属性 */
  wuXing: string;
  /** 评语 */
  eval: string;
}

export interface FuxingShuifaResult {
  /** 查询模式 */
  mode: string;
  /** 坐山朝向 */
  shanXiang?: string;
  /** 本卦 */
  benGua?: string;
  /** 九星分布 */
  starMap?: FuxingStarPosition[];
  /** 吉方来水 */
  laiShuiDirections?: string[];
  /** 凶方去水 */
  quShuiDirections?: string[];
  /** 翻卦详情（变爻过程） */
  fanGuaSteps?: string[];
  /** 综合解读 */
  analysis: string;
}
