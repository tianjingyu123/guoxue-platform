// ── 八字排盘共享类型 ──

/** 性别 */
export type Gender = "男" | "女";

/** 天干 */
export type Gan = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";

/** 地支 */
export type Zhi = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

/** 十神 */
export type ShiShen = "比" | "劫" | "食" | "伤" | "才" | "财" | "杀" | "官" | "枭" | "印";

/** 十二长生 */
export type ShiErChangSheng =
  | "长生" | "沐浴" | "冠带" | "临官" | "帝旺"
  | "衰" | "病" | "死" | "墓" | "绝" | "胎" | "养";

/** 八字输入参数 */
export interface BaziInput {
  name: string;
  gender: Gender;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 出生城市（选填，用于真太阳时校正） */
  city?: string;
  /** 经度（选填，精确真太阳时） */
  longitude?: number;
  /** 纬度（选填） */
  latitude?: number;
}

/** 八字计算选项 */
export interface BaziCalcOptions {
  /** 早晚子时：traditional = 传统（23点后即次日子时）, early-late = 早晚子时分立 */
  ziShiMode: "traditional" | "early-late";
  /** 空亡起法 */
  kongWangMode: "day-pillar" | "year-pillar";
  /** 藏干版本 */
  cangGanVersion: "yuanhai" | "sanming";
  /** 神煞范围 */
  shenShaScope: "core" | "full";
  /** 真太阳时 */
  useTrueSolar: boolean;
  /** 夏令时 */
  useDaylightSaving: boolean;
}

/** 一柱（天干+地支全部信息） */
export interface Pillar {
  gan: Gan;
  zhi: Zhi;
  /** 天干十神（主星） */
  ganShiShen: ShiShen;
  /** 地支十神（主星） */
  zhiShiShen: ShiShen;
  /** 藏干详情 */
  cangGan: CangGanItem[];
  /** 纳音 */
  nayin: string;
  /** 地势（十二长生/星运） */
  diShi: ShiErChangSheng;
  /** 自坐（日柱专有） */
  ziZuo?: ShiShen;
}

/** 藏干项 */
export interface CangGanItem {
  gan: Gan;
  /** 藏干十神（副星） */
  shiShen: ShiShen;
}

/** 四柱 */
export interface SiZhu {
  nian: Pillar;
  yue: Pillar;
  ri: Pillar;
  shi: Pillar;
}

/** 大运步骤 */
export interface DaYunStep {
  ganZhi: string;
  tianGan: Gan;
  diZhi: Zhi;
  ganShiShen: ShiShen;
  zhiShiShen: ShiShen;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  liuNian: LiuNian[];
}

/** 流年 */
export interface LiuNian {
  year: number;
  age: number;
  ganZhi: string;
  ganShiShen: ShiShen;
  zhiShiShen: ShiShen;
}

/** 流月 */
export interface LiuYue {
  month: number;
  ganZhi: string;
}

/** 流时 */
export interface LiuShi {
  hour: number;
  ganZhi: string;
}

/** 起运信息 */
export interface QiYun {
  startYear: number;
  startAge: number;
  jiaoYunGan: Gan;
  jiaoYunMonth: number;
  jiaoYunDay: number;
  dayCount: number;
  desc: string;
  daYun: DaYunStep[];
}

/** 神煞项 */
export interface ShenShaItem {
  name: string;
  type: "ji" | "xiong";
  desc: string;
  pillar: string;
}

/** 合冲刑害分析 */
export interface FenXiTiShi {
  ganHe: string[];
  sanHe: string[];
  sanHui: string[];
  liuChong: string[];
  liuHe: string[];
  liuHai: string[];
  sanXing: string[];
  ziXing: string[];
  /** 暗合 */
  anHe?: string[];
  /** 破 */
  po?: string[];
  /** 相破（传统模式展示用，引擎待补） */
  xiangPo?: string[];
  /** 暗绝（传统模式展示用，引擎待补） */
  anJue?: string[];
}

/** 格局 */
export interface GeJu {
  name: string;
  type: "zheng" | "bian";
  yongShen: string;
  xiShen: string;
  jiShen: string;
  desc: string;
}

/** 五行能量 */
export interface WuXingEnergy {
  mu: number;
  huo: number;
  tu: number;
  jin: number;
  shui: number;
  desc: string;
}

/** 完整八字排盘结果 */
export interface BaziResult {
  input: BaziInput;
  siZhu: SiZhu;
  qiYun: QiYun;
  kongWang: string;
  shengXiao: string;
  lunarDate: string;
  taiYuan: Pillar;
  mingGong: Pillar;
  shenGong: Pillar;
  wangXiang: string;
  fenXiTiShi: FenXiTiShi;
  shenSha: ShenShaItem[];
  geJu?: GeJu;
  wuXingEnergy?: WuXingEnergy;
  /** 当前流月 */
  liuYue?: LiuYue[];
  /** 真太阳时信息 */
  trueSolarInfo?: {
    isAdjusted: boolean;
    adjustedTime: string;
    offsetMinutes: number;
  };
  /** 真太阳时校正（传统模式展示，引擎待补） */
  taiYangShi?: { desc: string };
  /** 夏令时校正（传统模式展示，引擎待补） */
  daylightSaving?: { adjusted: boolean; desc: string };
  /** 自坐（传统模式展示，引擎待补） */
  ziZuo?: { riGan: string; riZhi: string; shiShen: string; desc: string };
  /** 流时列表（传统模式展示，引擎待补） */
  liuShiList?: { hour: number; ganZhi: string; ganShiShen: string }[];
}
