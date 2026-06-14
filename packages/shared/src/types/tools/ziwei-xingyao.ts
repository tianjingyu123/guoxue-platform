// ── 紫微星曜详解类型 ──
// 紫微斗数14主星+六吉六煞+禄存天马等星曜详解

export interface ZiWeiXingYaoInput {
  /** 星曜名称 */
  starName?: string;
}

export interface XingYaoDetail {
  /** 星曜名 */
  starName: string;
  /** 分类: 主星/吉星/煞星/辅星 */
  category: "主星" | "吉星" | "煞星" | "辅星";
  /** 五行 */
  wuXing: string;
  /** 阴阳 */
  yinYang: "阳" | "阴";
  /** 北斗/南斗/中天 */
  douBu: string;
  /** 庙旺宫位 */
  miaoWang: string;
  /** 利陷宫位 */
  liXian: string;
  /** 基本性格 */
  character: string;
  /** 事业属性 */
  career: string;
  /** 财运属性 */
  wealth: string;
  /** 感情属性 */
  romance: string;
  /** 化气 */
  huaQi: string;
  /** 代表人物 */
  representative: string;
  /** 特殊格局/用途 */
  specialUse: string;
}

export interface ZiWeiXingYaoResult {
  /** 星曜详情（若指定starName则只返回该星） */
  xingYao: XingYaoDetail | null;
  /** 全部星曜列表 */
  allXingYao: XingYaoDetail[];
  /** 按分类分组 */
  grouped: Record<string, XingYaoDetail[]>;
  analysis: string;
}
