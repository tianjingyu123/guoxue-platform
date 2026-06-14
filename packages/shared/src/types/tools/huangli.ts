// ── 每日黄历 共享类型 ──

export interface HuangLiInput {
  date?: string;
}

export interface ErShiBaXiuDetail {
  name: string;
  animal: string;
  element: string;
  jiXiong: string;
  song: string;
  suitable: string[];
  unsuitable: string[];
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
  erShiBaXiu: ErShiBaXiuDetail;
  jianChu: string;
  summary: string;
}
