// ── 奇门出行指导 ──

export interface QiMenChuXingInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  fromDirection?: string;
  toDirection?: string;
  purpose?: "出差" | "旅游" | "搬家" | "返乡" | "求学";
}

export interface ChuXingShiChen {
  shiChen: string;
  timeRange: string;
  level: "宜行" | "可行" | "不宜" | "大忌";
  direction: string;
  jiXiong: string;
  advice: string;
}

export interface FangWeiJiXiong {
  fangWei: string;
  jiXiong: string;
  men: string;
  description: string;
}

export interface QiMenChuXingResult {
  date: string;
  shiChenList: ChuXingShiChen[];
  fangWeiList: FangWeiJiXiong[];
  bestTime: string;
  bestDirection: string;
  summary: string;
}
