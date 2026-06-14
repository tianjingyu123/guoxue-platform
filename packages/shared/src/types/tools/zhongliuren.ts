// ── 中六壬共享类型 ──

export interface ZhongLiuRenInput {
  datetime: string;
  question?: string;
}

export interface ZhongLiuRenResult {
  input: ZhongLiuRenInput;
  yueJiang: string;
  tianGang: string;
  shiChen: string;
  pan: { diPan: string[]; tianPan: string[] };
  keChuan: { name: string; meaning: string; jiXiong: string }[];
  duanYu: string;
  advice: string[];
}
