// ── 八宅风水共享类型 ──

import type { Gender } from "./bazi";

/** 八卦方位 */
export type BaGuaDirection = "坎" | "坤" | "震" | "巽" | "中" | "乾" | "兑" | "艮" | "离";

/** 东四宅/西四宅 */
export type ZhaiGroup = "东四宅" | "西四宅";

/** 东四命/西四命 */
export type MingGroup = "东四命" | "西四命";

/** 游年九星 */
export type YouNianStar =
  | "生气" | "天医" | "延年" | "伏位"
  | "绝命" | "五鬼" | "六煞" | "祸害";

// ── 输入 ──

export interface BaZhaiInput {
  /** 户主出生年份（用于计算命卦） */
  birthYear: number;
  /** 性别 */
  gender: Gender;
  /** 宅门坐向（坐山） */
  zuoShan: BaGuaDirection;
  /** 是否计算流年影响 */
  liuNian?: boolean;
  /** 流年年份 */
  liuNianYear?: number;
}

// ── 命卦 ──

export interface MingGua {
  /** 命卦名称 */
  guaName: BaGuaDirection;
  /** 命卦数 */
  guaNum: number;
  /** 东四命/西四命 */
  group: MingGroup;
  /** 计算过程 */
  calcProcess: string;
}

// ── 宅卦 ──

export interface ZhaiGua {
  /** 宅卦名称 */
  guaName: BaGuaDirection;
  /** 东四宅/西四宅 */
  group: ZhaiGroup;
  /** 坐山方位 */
  zuoShan: string;
  /** 朝向方位 */
  chaoXiang: string;
}

// ── 八方吉凶 ──

/** 布局建议 */
export interface LayoutTips {
  /** 适宜颜色 */
  colors: string[];
  /** 适宜材质 */
  materials: string[];
  /** 适宜形状 */
  shapes: string[];
  /** 适宜摆件 */
  items: string[];
}

export interface BaFangJiXiong {
  /** 方位 */
  direction: BaGuaDirection;
  /** 方位角度范围 */
  degreeRange: string;
  /** 游年星 */
  star: YouNianStar;
  /** 五行 */
  wuXing: string;
  /** 吉凶 */
  jiXiong: "大吉" | "中吉" | "小吉" | "大凶" | "中凶" | "小凶" | "平";
  /** 适宜 */
  yiYong: string[];
  /** 忌讳 */
  jiHui: string[];
  /** 断语 */
  desc: string;
  /** 布局建议 */
  layoutTips: LayoutTips;
  /** 化解方法（凶星） */
  huaJie?: string[];
  /** 催旺方法（吉星） */
  cuiWang?: string[];
}

// ── 宅命配合 ──

export interface ZhaiMingMatch {
  /** 是否宅命相配 */
  isMatch: boolean;
  /** 配合度评分（1-10） */
  score: number;
  /** 说明 */
  desc: string;
  /** 调整建议 */
  suggestion: string;
}

// ── 输出 ──

export interface BaZhaiResult {
  input: BaZhaiInput;

  /** 命卦信息 */
  mingGua: MingGua;

  /** 宅卦信息 */
  zhaiGua: ZhaiGua;

  /** 宅命配合 */
  zhaiMingMatch: ZhaiMingMatch;

  /** 八方吉凶 */
  baFang: BaFangJiXiong[];

  /** 大门方位分析 */
  menWei: {
    direction: BaGuaDirection;
    star: YouNianStar;
    jiXiong: string;
    suggestion: string;
  };

  /** 主卧方位分析 */
  zhuWo: {
    direction: BaGuaDirection;
    star: YouNianStar;
    jiXiong: string;
    suggestion: string;
  };

  /** 厨房方位分析 */
  chuFang: {
    direction: BaGuaDirection;
    star: YouNianStar;
    jiXiong: string;
    suggestion: string;
  };

  /** 大游年歌诀 */
  geJue: string;

  /** 综合断语 */
  duanYu: string;
}
