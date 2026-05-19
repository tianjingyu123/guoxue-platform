// ── 小成图共享类型 ──
// 霍斐然小成图：不涉五行，纯卦象推演

/** 八卦 */
export type BaGua = "乾" | "坤" | "震" | "巽" | "坎" | "离" | "艮" | "兑";

/** 九宫位置 */
export type JiuGongPos = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 起卦方式 */
export type XiaoChengTuMethod = "shici" | "baoshu" | "zimu" | "random";

// ── 输入 ──

export interface XiaoChengTuInput {
  /** 起卦时间 */
  datetime: string;
  /** 起卦方式 */
  method: XiaoChengTuMethod;
  /** 报数（method=baoshu时使用，三个数） */
  numbers?: [number, number, number];
  /** 字母/汉字（method=zimu时使用） */
  chars?: string;
  /** 所问事项 */
  question?: string;
}

// ── 九宫格 ──

export interface XiaoChengTuGong {
  /** 宫位编号（洛书序） */
  pos: JiuGongPos;
  /** 方位 */
  direction: string;
  /** 天盘卦 */
  tianPanGua: BaGua;
  /** 地盘卦（固定后天八卦） */
  diPanGua: BaGua;
  /** 天地盘成卦（六十四卦之一） */
  chengGua: string;
  /** 阖辟状态 */
  heBi: "阖" | "辟";
  /** 往来状态 */
  wangLai: "往" | "来" | "不动";
}

// ── 成卦 ──

export interface ChengGuaInfo {
  /** 本卦名 */
  benGua: string;
  /** 互卦名 */
  huGua: string;
  /** 变卦名 */
  bianGua: string;
  /** 动爻 */
  dongYao: number;
  /** 卦辞 */
  guaCi: string;
  /** 爻辞 */
  yaoCi: string;
}

// ── 正推/旁推 ──

export interface TuiDuan {
  /** 推断类型 */
  type: "正推" | "旁推";
  /** 推断宫位 */
  gong: JiuGongPos;
  /** 取象 */
  quXiang: string;
  /** 断语 */
  duanYu: string;
}

// ── 输出 ──

export interface XiaoChengTuResult {
  input: XiaoChengTuInput;

  /** 基本信息 */
  basicInfo: {
    /** 起卦时间干支 */
    ganZhi: string;
    /** 得卦过程 */
    process: string;
  };

  /** 九宫盘 */
  gongs: XiaoChengTuGong[];

  /** 主卦信息 */
  mainGua: ChengGuaInfo;

  /** 阖辟往来总论 */
  heBiWangLai: {
    /** 阖（静/收）的宫位 */
    heGongs: JiuGongPos[];
    /** 辟（动/放）的宫位 */
    biGongs: JiuGongPos[];
    /** 往（外出）的宫位 */
    wangGongs: JiuGongPos[];
    /** 来（归来）的宫位 */
    laiGongs: JiuGongPos[];
    desc: string;
  };

  /** 正推旁推断语 */
  tuiDuan: TuiDuan[];

  /** 综合断语 */
  duanYu: string;
}
