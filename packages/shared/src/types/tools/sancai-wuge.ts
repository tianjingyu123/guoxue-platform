// ── 三才五格姓名学共享类型 ──

/** 输入：姓名分析 */
export interface SanCaiWuGeInput {
  surname: string;
  givenName: string;
  gender?: "男" | "女";
}

/** 输出：三才五格分析 */
export interface SanCaiWuGeResult {
  surname: string;
  givenName: string;
  totalStrokes: number;
  wuGe: WuGeItem[];
  sanCai: SanCaiWuGeConfig;
  score: number;
  summary: string;
}

/** 五格数理 */
export interface WuGeItem {
  name: string;
  strokes: number;
  source: string;
  lucky: boolean;
  wuXing: string;
  analysis: string;
  meaning: string;
}

/** 三才配置 */
export interface SanCaiWuGeConfig {
  tianGe: string;
  renGe: string;
  diGe: string;
  config: string;
  level: "大吉" | "吉" | "平" | "凶" | "大凶";
  description: string;
  careerInfluence: string;
  healthInfluence: string;
  familyInfluence: string;
}
