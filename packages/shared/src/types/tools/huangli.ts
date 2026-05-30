// ── 每日黄历 共享类型 ──

export interface HuangLiInput {
  date?: string;
}

export interface HuangLiResult {
  date: string;
  lunarDate: string;
  ganZhi: { year: string; month: string; day: string };
  jieQi: string | null;
  chongSha: string;
  caiShen: string;
  xiShen: string;
  fuShen: string;
  jiShen: string[];
  xiongShen: string[];
  yi: string[];
  ji: string[];
  jiShi: string[];
  summary: string;
}
