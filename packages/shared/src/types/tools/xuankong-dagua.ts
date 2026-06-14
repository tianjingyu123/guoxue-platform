// ── 玄空大卦类型 ──
// 六十四卦风水 + 抽爻换象 + 卦运卦气

export interface XuanKongDaGuaInput {
  /** 1-64 卦序号 */
  guaNumber: number;
  /** 坐山朝向(可选)，如 "子山午向" */
  orientation?: string;
  /** 查询年份(用于卦运)，默认当前年 */
  year?: number;
}

export interface XuanKongDaGuaResult {
  guaNumber: number;
  guaName: string;
  guaSymbol: string;
  /** 上下卦 */
  upperTrigram: string;
  lowerTrigram: string;
  /** 玄空五行：1水2火3木4金5土6水7火8木9金 */
  xuanKongWx: { value: number; name: string; };
  /** 卦运（1-9运） */
  guaYun: number;
  /** 天卦/地卦/父母卦 */
  tianGua: string;
  diGua: string;
  fuMuGua: string;
  /** 卦气（旺衰平） */
  guaQi: "旺" | "衰" | "平";
  /** 抽爻换象：6爻变换分析 */
  yaoBian: XuanKongYaoBian[];
  /** 天心正运 */
  tianXinZhengYun: string;
  /** 七星打劫 */
  qiXingDaJie: string;
  /** 零正神 */
  lingZheng: string;
  /** 山水配合 */
  shanShui: string;
  analysis: string;
}

export interface XuanKongYaoBian {
  yaoIndex: number;
  yaoName: string;
  afterGua: string;
  afterGuaNumber: number;
  description: string;
  /** 此爻变换后的吉凶 */
  jiXiong: "吉" | "凶" | "平";
}
