// ── 周易六十四卦详解共享类型 ──

export interface ZhouYi64GuaInput {
  guaName?: string;
  guaCategory?: string;
  guaIndex?: number;
}

export interface ZhouYi64GuaResult {
  category: string;
  guaList: ZhouYiGuaItem[];
  guaCategories: GuaCategory[];
  summary: string;
}

export interface ZhouYiGuaItem {
  index: number;
  name: string;
  symbol: string;
  shangGua: string;
  xiaGua: string;
  guaCi: string;
  tuanZhuan: string;
  xiangZhuan: string;
  yaoCi: string[];
  category: string;
  meaning: string;
}

export interface GuaCategory {
  name: string;
  count: number;
  description: string;
}
