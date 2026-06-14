// ── 奇门择吉共享类型 ──

export type ZeJiPurpose = "婚嫁" | "开业" | "搬迁" | "出行" | "动土" | "安葬" | "签约" | "求医" | "祭祀" | "入学" | "面试" | "其他";

export interface QiMenZeJiInput {
  purpose: ZeJiPurpose;
  dateRange: { start: string; end: string };
  location?: string;
}

export interface ZeJiDate {
  date: string;
  lunarDate: string;
  score: number;
  jiXiong: string;
  shiShen: string[];
  xiongShen: string[];
  suitable: string[];
  unsuitable: string[];
  bestHours: { time: string; score: number }[];
  duanYu: string;
}

export interface QiMenZeJiResult {
  input: QiMenZeJiInput;
  dates: ZeJiDate[];
  bestDate: ZeJiDate | null;
  summary: string;
}
