// ── 奇门命理（阴盘）共享类型 ──

import type { QimenGong } from "./qimen";

export interface QiMenYinMingLiInput {
  birthTime: string;
  birthplace?: string;
  gender: string;
  useTrueSolar: boolean;
  ziShiMode: string;
  useDaylightSaving: boolean;
}

export interface QiMenYinMingLiResult {
  input: {
    birthTime: string;
    birthplace: string;
    gender: string;
    trueSolar: boolean;
    ziShiMode: string;
    daylightSaving: boolean;
  };
  basicInfo: {
    juShu: number;
    dunType: string;
    riGanZhi: string;
    shiGanZhi: string;
    gender: string;
    birthplace: string;
  };
  gongs: QimenGong[];
  mingLi: Record<string, unknown>;
  geJu: Array<{ name: string; active: boolean; desc: string; jiXiong: string }>;
  duanYu: string;
}
