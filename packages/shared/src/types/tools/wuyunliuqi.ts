// ── 五运六气共享类型 ──

/** 五运 */
export type WuYun = "木运" | "火运" | "土运" | "金运" | "水运";

/** 六气 */
export type LiuQi = "厥阴风木" | "少阴君火" | "少阳相火" | "太阴湿土" | "阳明燥金" | "太阳寒水";

/** 运的太过不及 */
export type YunState = "太过" | "不及" | "平气";

/** 同化类型 */
export type TongHuaType = "天符" | "岁会" | "太乙天符" | "同天符" | "同岁会" | "无";

/** 主气客气步 */
export type QiBu = "初之气" | "二之气" | "三之气" | "四之气" | "五之气" | "终之气";

// ── 输入 ──

export interface WuYunLiuQiInput {
  /** 年份 */
  year: number;
  /** 是否显示详细运气推算过程 */
  showProcess?: boolean;
  /** 是否叠加当日节气分析 */
  currentDate?: string;
}

// ── 大运 ──

export interface DaYun {
  /** 天干化运 */
  tianGanHuaYun: WuYun;
  /** 太过/不及 */
  yunState: YunState;
  /** 岁运（中运） */
  suiYun: string;
  /** 主运五步 */
  zhuYun: string[];
  /** 客运五步 */
  keYun: string[];
}

// ── 六气详情 ──

export interface LiuQiDetail {
  /** 司天 */
  siTian: LiuQi;
  /** 在泉 */
  zaiQuan: LiuQi;
  /** 主气六步 */
  zhuQi: {
    step: QiBu;
    qi: LiuQi;
    timeRange: string;
    desc: string;
  }[];
  /** 客气六步 */
  keQi: {
    step: QiBu;
    qi: LiuQi;
    timeRange: string;
    desc: string;
  }[];
}

// ── 运气同化 ──

export interface YunQiTongHua {
  type: TongHuaType;
  desc: string;
  /** 同化条件是否满足 */
  active: boolean;
}

// ── 气候病候 ──

export interface QiHouBingHou {
  /** 当前气步 */
  step: QiBu;
  /** 主气 */
  zhuQi: LiuQi;
  /** 客气 */
  keQi: LiuQi;
  /** 气候特点 */
  qiHou: string;
  /** 易发疾病 */
  yiFaBing: string[];
  /** 养生建议 */
  yangSheng: string;
  /** 用药方向 */
  yongYao: string;
}

// ── 输出 ──

export interface WuYunLiuQiResult {
  input: WuYunLiuQiInput;

  /** 基本信息 */
  basicInfo: {
    /** 年干支 */
    nianGanZhi: string;
    /** 年份 */
    year: number;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
  };

  /** 大运 */
  daYun: DaYun;

  /** 六气 */
  liuQi: LiuQiDetail;

  /** 运气同化 */
  tongHua: YunQiTongHua;

  /** 各气步病候 */
  bingHou: QiHouBingHou[];

  /** 五运郁发 */
  yuFa: {
    /** 是否有郁发 */
    hasYuFa: boolean;
    /** 郁发描述 */
    desc: string;
  };

  /** 运气相合/相克 */
  yunQiRelation: {
    /** 运克气/气克运/运气相生 */
    relation: string;
    /** 顺逆 */
    shunNi: "顺" | "逆" | "平";
    desc: string;
  };

  /** 综合断语 */
  duanYu: string;
}
