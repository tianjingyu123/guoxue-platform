// ── 择日大全共享类型 ──

export interface ZeRiInput {
  eventType: string;
  startDate: string;
  endDate: string;
  maxResults?: number;
}

export interface DateScore {
  date: string;
  lunarDate: string;
  ganZhi: string;
  score: number;
  level: string;
  zhiXing: string;
  xiu: string;
  tianShen: string;
  reasons: string[];
  yi: string[];
  ji: string[];
}

export interface ZeRiResult {
  eventType: string;
  dateRange: { start: string; end: string };
  totalDays: number;
  recommendedDates: DateScore[];
  summary: string;
}
