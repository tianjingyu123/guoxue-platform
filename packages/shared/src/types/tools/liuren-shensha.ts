/** 六壬神煞大全 */

export interface LiuRenShenShaInput {
  keyword?: string;
  /** 神/煞/全部 */
  type?: string;
}

export interface LiuRenShenShaItem {
  name: string;
  alias: string[];
  type: "神" | "煞";
  wuXing: string;
  jiXiong: "吉" | "凶" | "平";
  position: string;
  mainMeaning: string;
  detailed: string;
  formula: string;
  suitable: string[];
  avoid: string[];
}

export interface LiuRenShenShaResult {
  shenSha: LiuRenShenShaItem[];
  total: number;
  summary: string;
}
