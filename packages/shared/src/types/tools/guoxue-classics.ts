/** 国学经典导读 */

export interface GuoXueClassicsInput {
  keyword?: string;
  /** 学派：儒家/道家/佛家/兵家/法家/墨家/杂家 */
  school?: string;
}

export interface ClassicItem {
  title: string;
  author: string;
  dynasty: string;
  school: string;
  summary: string;
  keyContent: string[];
  famousQuotes: string[];
  influence: string;
}

export interface GuoXueClassicsResult {
  items: ClassicItem[];
  total: number;
  summary: string;
}
