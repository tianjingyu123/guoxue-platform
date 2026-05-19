// ── 电子罗盘（风水罗盘）共享类型 ──
// 综合罗盘：三合盘/三元盘/综合盘，含风水指导意见

/** 罗盘类型 */
export type LuoPanType = "sanhe" | "sanyuan" | "zonghe";

/** 二十四山 */
export type ErShiSiShan =
  | "壬" | "子" | "癸" | "丑" | "艮" | "寅"
  | "甲" | "卯" | "乙" | "辰" | "巽" | "巳"
  | "丙" | "午" | "丁" | "未" | "坤" | "申"
  | "庚" | "酉" | "辛" | "戌" | "乾" | "亥";

/** 罗盘层 */
export interface LuoPanLayer {
  /** 层序号 */
  index: number;
  /** 层名称 */
  name: string;
  /** 用途说明 */
  usage: string;
  /** 层数据（分格内容） */
  data: string[];
  /** 当前指针对应的值 */
  currentValue?: string;
}

// ── 输入 ──

export interface LuoPanInput {
  /** 罗盘类型 */
  type: LuoPanType;
  /** 当前朝向角度（0-360，正北=0） */
  degree: number;
  /** 是否修正磁偏角 */
  magneticCorrection: boolean;
  /** 当前位置经度（用于磁偏角计算） */
  longitude?: number;
  /** 当前位置纬度 */
  latitude?: number;
  /** 建造年份（用于玄空飞星参考） */
  buildYear?: number;
}

// ── 二十四山分析 ──

export interface ShanAnalysis {
  /** 当前坐山 */
  zuoShan: ErShiSiShan;
  /** 当前朝向 */
  chaoXiang: ErShiSiShan;
  /** 精确度数 */
  degree: number;
  /** 三元龙 */
  sanYuanLong: "天元龙" | "地元龙" | "人元龙";
  /** 阴阳 */
  yinYang: "阴" | "阳";
  /** 所属卦宫 */
  guaGong: string;
  /** 兼向判断 */
  jianXiang?: {
    isJian: boolean;
    jianDeg: number;
    jianShan: ErShiSiShan;
    canUse: boolean;
    reason: string;
  };
}

// ── 风水流派指导 ──

export interface FengShuiAdvice {
  /** 流派名称 */
  school: string;
  /** 适用方法 */
  method: string;
  /** 山向评价 */
  evaluation: string;
  /** 吉凶 */
  jiXiong: "吉" | "凶" | "平" | "需化解";
  /** 具体建议 */
  suggestions: string[];
}

// ── 输出 ──

export interface LuoPanResult {
  input: LuoPanInput;

  /** 精确角度信息 */
  degreeInfo: {
    /** 原始角度 */
    rawDegree: number;
    /** 磁偏角 */
    magneticDeclination: number;
    /** 修正后真北角度 */
    trueDegree: number;
  };

  /** 二十四山分析 */
  shanAnalysis: ShanAnalysis;

  /** 罗盘各层解读 */
  layers: LuoPanLayer[];

  /** 纳甲信息 */
  naJia: {
    /** 坐山纳甲 */
    zuoNaJia: string;
    /** 向首纳甲 */
    xiangNaJia: string;
  };

  /** 三合水法 */
  sanHeShui?: {
    /** 水口方位 */
    shuiKou: string;
    /** 四大局归属 */
    siDaJu: string;
    /** 长生十二宫水法 */
    changShengShui: string;
    /** 吉凶 */
    jiXiong: string;
  };

  /** 各流派风水指导 */
  fengShuiAdvice: FengShuiAdvice[];

  /** 综合断语 */
  duanYu: string;
}
