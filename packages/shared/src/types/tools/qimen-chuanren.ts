// ── 奇门穿壬共享类型 ──

export interface QiMenChuanRenInput {
  datetime: string;
  method: string;
  qiJuMethod: string;
  trueSolar: boolean;
  birthYear: number;
  gender: string;
}

export interface Ju72Entry {
  name: string;
  star: string;
  men: string;
  shiZhi: string;
  tianJiang: string;
  jiXiong: "大吉" | "吉" | "平" | "小凶" | "凶";
  desc: string;
}

export interface QiMenChuanRenResult {
  input: {
    datetime: string;
    method: string;
    qiJuMethod: string;
    trueSolar: boolean;
    birthYear: number;
    gender: string;
  };
  qimen: Record<string, unknown>;
  liuren: Record<string, unknown>;
  chuanren: {
    ju72: Ju72Entry[];
    xunShou: string;
    analysis: string;
  };
  duanYu: string;
}
