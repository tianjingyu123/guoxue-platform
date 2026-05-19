// ── 金口诀排盘共享类型 ──
// 注：换将方式/贵人诀/贵神昼夜 复用 daliuren.ts 中的同名类型

import type { JiangMethod, GuiRenJue, GuiRenDayNight } from "./daliuren";

/** 地分获取方式 */
export type DiFenMethod = "select" | "baoshu" | "random";

/** 五动类型 */
export type WuDongType = "jiang-ke-shen" | "shen-ke-jiang" | "gan-ke-fang" | "fang-ke-gan" | "tong-lei";

/** 三动类型 */
export type SanDongType = "qi-mou" | "guan-dong" | "shen-dong";

// ── 金口诀输入 ──

export interface JinKouJueInput {
  /** 排盘时间（默认当前） */
  datetime: string;
  /** 地分（十二地支之一，报数时传数字） */
  diFen: string;
  /** 地分获取方式 */
  diFenMethod: DiFenMethod;
  /** 换将方式 */
  jiangMethod: JiangMethod;
  /** 贵人诀 */
  guiRenJue: GuiRenJue;
  /** 贵神昼夜 */
  guiRenDayNight: GuiRenDayNight;
  /** 真太阳时 */
  trueSolar: boolean;
}

// ── 四位课 ──

export interface SiWeiKe {
  /** 人元（天干，最上层） */
  renYuan: {
    gan: string;
    /** 与地分的生克关系 */
    relation: string;
    /** 纳音 */
    naYin: string;
  };
  /** 贵神（天将，第二层） */
  guiShen: {
    name: string;
    ganZhi: string;
    /** 五行 */
    wuXing: string;
    /** 纳音 */
    naYin: string;
  };
  /** 月将（第三层） */
  yueJiang: {
    name: string;
    ganZhi: string;
    /** 五行 */
    wuXing: string;
    /** 纳音 */
    naYin: string;
  };
  /** 地分（地支，最下层） */
  diFen: {
    zhi: string;
    /** 五行 */
    wuXing: string;
    /** 方位 */
    direction: string;
    /** 所属地支三合 */
    sanHe: string;
  };
}

// ── 用爻 ──

export interface YongYao {
  /** 用爻所在层位 */
  position: "renYuan" | "guiShen" | "yueJiang" | "diFen";
  /** 用爻值 */
  label: string;
  /** 用爻五行 */
  wuXing: string;
  /** 旺相休囚死状态 */
  wangShuai: "旺" | "相" | "休" | "囚" | "死";
  /** 断语 */
  desc: string;
}

// ── 五动 ──

export interface WuDong {
  type: WuDongType;
  name: string;
  /** 涉及的两层 */
  layers: [string, string];
  /** 五行生克描述 */
  desc: string;
  /** 动爻断语 */
  duanYu: string;
}

// ── 三动 ──

export interface SanDong {
  type: SanDongType;
  name: string;
  /** 涉及的两层 */
  layers: [string, string];
  desc: string;
  duanYu: string;
}

// ── 金口诀排盘结果 ──

export interface JinKouJueResult {
  /** 输入参数 */
  input: JinKouJueInput;

  /** 起课基本信息 */
  basicInfo: {
    /** 占时 */
    zhanShi: string;
    /** 月将 */
    yueJiang: string;
    /** 日柱 */
    riGanZhi: string;
    /** 昼夜 */
    dayNight: "昼" | "夜";
    /** 节气 */
    jieQi: string;
  };

  /** 四位课 */
  siWeiKe: SiWeiKe;

  /** 用爻 */
  yongYao: YongYao;

  /** 五动 */
  wuDong: WuDong[];

  /** 三动 */
  sanDong: SanDong[];

  /** 四位生克关系总表 */
  shengKeTable: {
    /** 干→方 */
    ganFang: string;
    /** 干→神 */
    ganShen: string;
    /** 干→将 */
    ganJiang: string;
    /** 神→方 */
    shenFang: string;
    /** 神→将 */
    shenJiang: string;
    /** 将→方 */
    jiangFang: string;
  };

  /** 神煞 */
  shenSha: {
    name: string;
    type: "ji" | "xiong";
    layer: string;
    description: string;
  }[];

  /** 空亡 */
  kongWang: string[];

  /** 遁干 */
  dunGan: string;

  /** 干元关系 */
  ganYuan: {
    /** 干神合 */
    ganShenHe?: string;
    /** 干将合 */
    ganJiangHe?: string;
    /** 干方合 */
    ganFangHe?: string;
  };

  /** 综合断语 */
  duanYu: string;
}
