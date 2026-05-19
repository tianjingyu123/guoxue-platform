// ── 太乙神数共享类型 ──

/** 太乙十六神 */
export type TaiYiShenName =
  | "太乙" | "文昌" | "始击" | "地主"
  | "吕申" | "四神" | "天目" | "太簇"
  | "大炅" | "大威" | "天马" | "大武"
  | "大簇" | "阴主" | "阴德" | "大义";

/** 太乙八将 */
export type TaiYiBaJiang =
  | "天蓬" | "天芮" | "天冲" | "天辅"
  | "天禽" | "天心" | "天柱" | "天任";

/** 三算类型 */
export type SuanType = "主算" | "客算" | "定算";

/** 太乙式类型 */
export type TaiYiShiType = "年计" | "月计" | "日计" | "时计";

// ── 输入 ──

export interface TaiYiInput {
  /** 起算时间 */
  datetime: string;
  /** 太乙式类型（年/月/日/时计） */
  shiType: TaiYiShiType;
  /** 是否用阳遁（默认根据节气自动判断） */
  yangDun?: boolean;
}

// ── 积年计算 ──

export interface JiNianCalc {
  /** 上元积年数 */
  jiNian: number;
  /** 五元六纪归属 */
  wuYuanLiuJi: string;
  /** 当前纪名 */
  jiName: string;
  /** 太乙数（积年 % 360） */
  taiYiShu: number;
  /** 计算过程 */
  process: string;
}

// ── 十六神盘 ──

export interface ShiLiuShenPan {
  /** 天盘十六神位置 */
  tianPan: { shen: string; gong: number }[];
  /** 地盘十六神位置 */
  diPan: { shen: string; gong: number }[];
  /** 太乙所在宫 */
  taiYiGong: number;
  /** 文昌所在宫 */
  wenChangGong: number;
  /** 始击所在宫 */
  shiJiGong: number;
  /** 计神 */
  jiShen: string;
  /** 定目 */
  dingMu: string;
}

// ── 三算 ──

export interface SanSuan {
  /** 主算 */
  zhuSuan: {
    value: number;
    wuXing: string;
    desc: string;
  };
  /** 客算 */
  keSuan: {
    value: number;
    wuXing: string;
    desc: string;
  };
  /** 定算 */
  dingSuan: {
    value: number;
    wuXing: string;
    desc: string;
  };
  /** 主客关系 */
  zhuKeRelation: string;
  /** 胜负判断 */
  shengFu: "主胜" | "客胜" | "和";
}

// ── 输出 ──

export interface TaiYiResult {
  input: TaiYiInput;

  /** 基本信息 */
  basicInfo: {
    /** 太乙式类型 */
    shiType: TaiYiShiType;
    /** 干支 */
    ganZhi: string;
    /** 阴阳遁 */
    dunType: "阳遁" | "阴遁";
    /** 节气 */
    jieQi: string;
    /** 年号纪年 */
    nianHao: string;
  };

  /** 积年计算 */
  jiNianCalc: JiNianCalc;

  /** 十六神盘 */
  shiLiuShenPan: ShiLiuShenPan;

  /** 八将 */
  baJiang: {
    name: TaiYiBaJiang;
    gong: number;
    desc: string;
  }[];

  /** 三算 */
  sanSuan: SanSuan;

  /** 太乙数理 */
  shuLi: {
    /** 太乙局数 */
    juShu: number;
    /** 天地转盘数 */
    zhuanPanShu: number;
    /** 推演卦象 */
    guaXiang: string;
  };

  /** 格局 */
  geJu: {
    name: string;
    active: boolean;
    desc: string;
    jiXiong: "吉" | "凶" | "平";
  }[];

  /** 综合断语 */
  duanYu: string;
}
