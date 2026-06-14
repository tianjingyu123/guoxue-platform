// ── 五格数理（姓名学）共享类型 ──

/** 数理吉凶 */
export type ShuLiJiXiong = "大吉" | "吉" | "半吉" | "凶" | "大凶";

/** 三才五行 */
export type SanCaiWuXing = "金" | "木" | "水" | "火" | "土";

/** 五格名称 */
export type WuGeName = "天格" | "人格" | "地格" | "总格" | "外格";

// ── 输入 ──

export interface XingMingJieXiInput {
  surname: string;
  givenName: string;
  gender?: "male" | "female";
  shengXiao?: string;
  birthYear?: number;
}

export interface WuGeInput {
  /** 姓氏（支持复姓） */
  surname: string;
  /** 名字 */
  givenName: string;
  /** 是否使用康熙笔画 */
  kangXiStrokes: boolean;
  /** 性别（影响部分数理解读） */
  gender?: "male" | "female";
}

// ── 单格详情 ──

export interface GeDetail {
  /** 格名 */
  name: WuGeName;
  /** 数理数 */
  number: number;
  /** 五行 */
  wuXing: SanCaiWuXing;
  /** 吉凶 */
  jiXiong: ShuLiJiXiong;
  /** 数理名称（如"春日花开"） */
  shuLiName: string;
  /** 数理含义 */
  meaning: string;
  /** 81数理诗文 */
  poem: string;
  /** 基业/家庭/健康等暗示 */
  hints: {
    jiYe: string;
    jiaTing: string;
    jianKang: string;
  };
}

// ── 三才配置 ──

export interface SanCaiConfig {
  /** 天格五行 */
  tian: SanCaiWuXing;
  /** 人格五行 */
  ren: SanCaiWuXing;
  /** 地格五行 */
  di: SanCaiWuXing;
  /** 三才组合编码（如"土火木"） */
  combo: string;
  /** 吉凶 */
  jiXiong: ShuLiJiXiong;
  /** 三才暗示 */
  desc: string;
  /** 基础运 */
  jiChuYun: string;
  /** 成功运 */
  chengGongYun: string;
  /** 社交运 */
  sheJiaoYun: string;
}

// ── 笔画明细 ──

export interface StrokeDetail {
  /** 字符 */
  char: string;
  /** 康熙笔画 */
  kangXiStroke: number;
  /** 简体笔画 */
  simpleStroke: number;
  /** 五行属性 */
  wuXing: SanCaiWuXing;
  /** 部首 */
  radical: string;
}

// ── 输出 ──

export interface WuGeResult {
  input: WuGeInput;

  /** 笔画明细 */
  strokes: StrokeDetail[];

  /** 五格详情 */
  geDetails: GeDetail[];

  /** 三才配置 */
  sanCai: SanCaiConfig;

  /** 人格与外格关系 */
  renWaiRelation: {
    relation: string;
    desc: string;
  };

  /** 人格与地格关系 */
  renDiRelation: {
    relation: string;
    desc: string;
  };

  /** 姓名总评分（百分制） */
  totalScore: number;

  /** 各维度评分 */
  scores: {
    /** 五格数理得分 */
    wuGe: number;
    /** 三才配置得分 */
    sanCai: number;
    /** 字义得分 */
    ziYi: number;
    /** 音韵得分 */
    yinYun: number;
  };

  /** 综合断语 */
  duanYu: string;

  /** 生肖姓名学分析（可选） */
  shengXiaoAnalysis?: {
    shengXiao: string;
    score: number;
    xiYongMatches: { char: string; radical: string; desc: string }[];
    jiYongMatches: { char: string; radical: string; desc: string }[];
    heHui: string;
    liuHe: string;
    chong: string;
    hai: string;
    namingTips: string;
    analysis: string;
  };
}
