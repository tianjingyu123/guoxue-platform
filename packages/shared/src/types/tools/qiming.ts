// ── 起名工具共享类型 ──
// 多流派起名：用户自由选择方法体系

/** 起名模式 */
export type QiMingMode = "auto" | "manual" | "fix";

/** 起名方法体系（用户可自由选择组合） */
export type NamingMethod =
  | "wuge"         // 五格数理
  | "bazi-yongshen" // 八字用神
  | "shengxiao"   // 生肖姓名学
  | "yinyang-wuxing" // 阴阳五行
  | "zhouyi-gua"  // 周易卦象
  | "yinyun"      // 音韵学
  | "ziyi"        // 字义学
  | "sancai"      // 三才配置
  | "shici"       // 诗词典故
  | "kangxi"      // 康熙笔画
  | "liushu";     // 六书造字

/** 起名约束 */
export interface NamingConstraint {
  /** 指定辈分字 */
  generationChar?: string;
  /** 辈分字位置 */
  generationPos?: "first" | "second";
  /** 偏好字（可选入） */
  preferChars?: string[];
  /** 排除字 */
  excludeChars?: string[];
  /** 名字字数 */
  nameLength: 1 | 2;
  /** 偏好五行 */
  preferWuXing?: string[];
  /** 是否用典故 */
  useDianGu?: boolean;
  /** 偏好风格 */
  style?: "古典" | "现代" | "诗词" | "国学";
  /** 生肖喜忌偏好（shengxiao方法用） */
  zodiacPrefer?: string;
}

// ── 输入 ──

export interface QiMingInput {
  /** 姓氏 */
  surname: string;
  /** 性别 */
  gender: "male" | "female";
  /** 出生时间（用于八字用神分析） */
  datetime: string;
  /** 起名模式 */
  mode: QiMingMode;
  /** 用户选择的起名方法（可多选组合） */
  methods: NamingMethod[];
  /** 约束条件 */
  constraints: NamingConstraint;
  /** 生成数量 */
  count?: number;
}

// ── 候选名字 ──

export interface NameCandidate {
  /** 全名 */
  fullName: string;
  /** 名字部分 */
  givenName: string;
  /** 总评分 */
  totalScore: number;
  /** 各维度评分 */
  scores: {
    /** 五格数理 */
    wuGe: number;
    /** 八字用神匹配 */
    baZi: number;
    /** 音韵 */
    yinYun: number;
    /** 字义 */
    ziYi: number;
    /** 字形 */
    ziXing: number;
  };
  /** 五格概要 */
  wuGeSummary: {
    tianGe: number;
    renGe: number;
    diGe: number;
    zongGe: number;
    waiGe: number;
    sanCai: string;
    jiXiong: string;
  };
  /** 字义解释 */
  meaning: string;
  /** 出处/典故 */
  origin?: string;
  /** 音韵分析 */
  phonetics: {
    pinyin: string;
    tone: string;
    comment: string;
  };
  /** 八字匹配说明 */
  baZiMatch: string;
}

// ── 输出 ──

export interface QiMingResult {
  input: QiMingInput;

  /** 八字用神分析 */
  baZiAnalysis: {
    /** 八字 */
    baZi: string;
    /** 日主 */
    riZhu: string;
    /** 喜用神 */
    xiYongShen: string[];
    /** 忌神 */
    jiShen: string[];
    /** 建议补益五行 */
    buYiWuXing: string[];
  };

  /** 姓氏笔画信息 */
  surnameInfo: {
    char: string;
    kangXiStroke: number;
    wuXing: string;
  };

  /** 候选名字列表 */
  candidates: NameCandidate[];

  /** 起名建议 */
  advice: string;
}
