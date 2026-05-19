// ── 玄空飞星风水共享类型 ──

/** 三元九运 */
export type YuanYun = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 二十四山向 */
export type ShanXiang =
  | "壬" | "子" | "癸" | "丑" | "艮" | "寅"
  | "甲" | "卯" | "乙" | "辰" | "巽" | "巳"
  | "丙" | "午" | "丁" | "未" | "坤" | "申"
  | "庚" | "酉" | "辛" | "戌" | "乾" | "亥";

/** 飞星数字 1-9 */
export type FeiXingNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 飞星名称 */
export type FeiXingName =
  | "一白贪狼" | "二黑巨门" | "三碧禄存" | "四绿文曲"
  | "五黄廉贞" | "六白武曲" | "七赤破军" | "八白左辅" | "九紫右弼";

/** 替卦条件 */
export type TiGuaType = "none" | "shanTi" | "xiangTi" | "shuangTi";

// ── 输入 ──

export interface XuanKongInput {
  /** 坐山（二十四山之一） */
  shan: ShanXiang;
  /** 朝向（二十四山之一，自动对冲或手动选） */
  xiang: ShanXiang;
  /** 建造/入伙年份（用于确定元运） */
  year: number;
  /** 元运（默认根据年份自动计算，可手动指定） */
  yuanYun?: YuanYun;
  /** 是否考虑替卦（默认 true） */
  tiGua?: boolean;
}

// ── 九宫格单格 ──

export interface XuanKongGong {
  /** 宫位名称（坎/坤/震/巽/中/乾/兑/艮/离） */
  gongName: string;
  /** 宫位方位 */
  direction: string;
  /** 运盘星 */
  yunStar: FeiXingNum;
  /** 山盘星 */
  shanStar: FeiXingNum;
  /** 向盘星 */
  xiangStar: FeiXingNum;
  /** 山星飞布顺逆 */
  shanOrder: "顺" | "逆";
  /** 向星飞布顺逆 */
  xiangOrder: "顺" | "逆";
  /** 山向合十/伏吟/反吟标记 */
  pattern?: "合十" | "伏吟" | "反吟" | "到山到向" | "上山下水";
  /** 星组合吉凶评语 */
  comment: string;
}

// ── 格局 ──

export interface XuanKongGeJu {
  /** 格局名称 */
  name: string;
  /** 是否成立 */
  active: boolean;
  /** 说明 */
  desc: string;
}

// ── 输出 ──

export interface XuanKongResult {
  input: XuanKongInput;

  /** 基本信息 */
  basicInfo: {
    /** 元运 */
    yuanYun: YuanYun;
    /** 元运起止年份 */
    yunRange: string;
    /** 坐山三元龙 */
    shanLong: "天元龙" | "地元龙" | "人元龙";
    /** 朝向三元龙 */
    xiangLong: "天元龙" | "地元龙" | "人元龙";
    /** 坐山阴阳 */
    shanYinYang: "阴" | "阳";
    /** 朝向阴阳 */
    xiangYinYang: "阴" | "阳";
    /** 替卦类型 */
    tiGuaType: TiGuaType;
    /** 运星入中 */
    yunStarCenter: FeiXingNum;
    /** 山星入中 */
    shanStarCenter: FeiXingNum;
    /** 向星入中 */
    xiangStarCenter: FeiXingNum;
  };

  /** 九宫飞星盘（按洛书排列） */
  gongs: XuanKongGong[];

  /** 格局判断 */
  geJu: XuanKongGeJu[];

  /** 旺山旺向判断 */
  wangShanWangXiang: {
    /** 是否旺山旺向 */
    isWang: boolean;
    /** 是否上山下水 */
    isShangShan: boolean;
    /** 是否双星到向 */
    isShuangXing: boolean;
    /** 说明 */
    desc: string;
  };

  /** 各方位风水建议 */
  advice: {
    direction: string;
    starCombo: string;
    jiXiong: "吉" | "凶" | "平";
    suggestion: string;
  }[];

  /** 流年飞星叠加（可选） */
  liuNian?: {
    year: number;
    centerStar: FeiXingNum;
    highlights: string[];
  };

  /** 综合断语 */
  duanYu: string;
}
