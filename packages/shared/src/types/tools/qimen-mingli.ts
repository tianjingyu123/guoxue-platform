// ── 奇门命理（阳盘）共享类型 ──

import type { QimenGong } from "./qimen";

export interface QiMenMingLiInput {
  birthTime: string;
  birthplace?: string;
  gender: string;
  jiGongMode: string;
  trueSolar: boolean;
  ziShiMode: string;
  daylightSaving: boolean;
}

export interface QiMenMingLiBazi {
  nian: string; yue: string; ri: string; shi: string;
  shengXiao: string; kongWang: string;
  wuXingEnergy: Record<string, number>;
  nianNaYin: string; yueNaYin: string; riNaYin: string; shiNaYin: string;
}

export interface QiMenMingLiGongDetail {
  ganZhi: string; gan: string; zhi: string;
  gongIndex: number; gongName: string;
  star: string; men: string; shen: string;
  ganShiShen: string; zhiShiShen: string;
}

export interface QiMenMingLiDaYunStep {
  name: string; ganZhi: string;
  startAge: number; endAge: number;
  startYear: number; endYear: number;
  ganShiShen: string; zhiShiShen: string;
  liuNian: Array<{ year: number; ganZhi: string; age: number }>;
}

export interface QiMenMingLiResult {
  input: QiMenMingLiInput;
  basicInfo: {
    juShu: number;
    dunType: string;
    riGanZhi: string;
    shiGanZhi: string;
    gender: string;
    birthplace: string;
  };
  gongs: QimenGong[];
  mingLi: {
    birthTime: string;
    gender: string;
    daYun: unknown;
    baziSwitch: { available: boolean; baziRecordId: unknown };
    bazi: QiMenMingLiBazi;
    mingGong: QiMenMingLiGongDetail;
    shenGong: QiMenMingLiGongDetail;
    qiYunInfo: { startAge: number; startYear: number; desc: string };
    liuNian: { year: number; ganZhi: string; age: number; luoGongIndex: number; luoGongName: string; daYunGanZhi: string; daYunStartAge: number; daYunEndAge: number };
    daYunSteps: QiMenMingLiDaYunStep[];
  };
  geJu: Array<{ name: string; active: boolean; desc: string; jiXiong: string }>;
  duanYu: string;
}
