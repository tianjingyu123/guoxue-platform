// ── 大衍筮法（周易50蓍草十八变起卦）共享类型 ──

export interface DaYanInput {
  question: string;
  datetime?: string;
}

export interface YaoChange {
  index: number;
  position: string;
  oldYao: string;
  newYao: string;
  changing: boolean;
}

export interface GuaInfo {
  name: string;
  symbol: string;
  number: number;
  yaoNames: string[];
  tuanCi: string;
  daXiang: string;
}

export interface DaYanResult {
  input: DaYanInput;
  process: { step: number; leftHand: number; rightHand: number; remaining: number; result: number }[];
  benGua: GuaInfo;
  zhiGua: GuaInfo | null;
  changes: YaoChange[];
  yaoCi: string[];
  duanYu: string;
}
