// ── 子午流注/经络养生共享类型 ──

export interface ZiWuLiuZhuInput {
  shiChen?: string;
  season?: string;
  wuXing?: string;
}

export interface ZiWuLiuZhuResult {
  currentShiChen: ShiChenInfo;
  allShiChen: ShiChenInfo[];
  seasonAdvice: YangShengAdvice;
  summary: string;
}

export interface ShiChenInfo {
  name: string;
  timeRange: string;
  zhi: string;
  jingLuo: string;
  zangFu: string;
  wuXing: string;
  active: boolean;
  function: string;
  advice: string;
  acupoints: string[];
}

export interface YangShengAdvice {
  season: string;
  mainFocus: string;
  diet: string[];
  avoid: string[];
  exercise: string;
  sleep: string;
}
