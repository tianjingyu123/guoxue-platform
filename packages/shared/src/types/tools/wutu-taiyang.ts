// ── 乌兔太阳择日共享类型 ──

export interface WuTuTaiYangInput {
  datetime?: string;
  mountain?: string;
}

export interface ShanInfo {
  name: string;
  degree: number;
  direction: string;
}

export interface TaiYangResult {
  shan: string;
  degree: number;
  status: string;
  statusName: string;
  description: string;
}

export interface WuTuTaiYangResult {
  input: WuTuTaiYangInput;
  date: string;
  solarLongitude: number;
  solarShan: ShanInfo;
  taiYang: TaiYangResult;
  sanHe: string[];
  liuHe: string[];
  wuTuShiChen: { time: string; jiXiong: string; desc: string }[];
  summary: string;
  advice: string[];
}
