/** 品牌起名 */

export interface BrandNamingInput {
  /** 行业类型 */
  industry: string;
  /** 期望风格 */
  style?: string;
  /** 名字长度 */
  length?: number;
}

export interface BrandNameItem {
  name: string;
  meaning: string;
  style: string;
  shuLiScore: number;
  shuLiDetail: string;
  wuXing: string;
  analysis: string;
  suitable: string[];
}

export interface BrandNamingResult {
  suggestions: BrandNameItem[];
  industry: string;
  total: number;
  summary: string;
}
