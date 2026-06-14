/** 诗经楚辞起名 */

export interface ShiJingQiMingInput {
  surname: string;
  gender: "男" | "女";
  /** 期望寓意关键词 */
  preference?: string;
  /** 出处偏好：诗经/楚辞/唐诗/宋词 */
  source?: string;
}

export interface NameItem {
  name: string;
  meaning: string;
  source: string;
  sourceQuote: string;
  analysis: string;
}

export interface ShiJingQiMingResult {
  surname: string;
  suggestions: NameItem[];
  total: number;
  summary: string;
}
