// ── 飞宫小奇门共享类型 ──
// 简化版奇门遁甲：九宫飞布，不用遁甲盘

/** 起局方式 */
export type FeiGongMethod = "shichen" | "baoshu" | "random";

/** 九星（小奇门用） */
export type FeiGongStar =
  | "天蓬" | "天芮" | "天冲" | "天辅"
  | "天禽" | "天心" | "天柱" | "天任" | "天英";

/** 八门 */
export type FeiGongMen =
  | "休门" | "死门" | "伤门" | "杜门"
  | "中门" | "开门" | "惊门" | "生门" | "景门";

// ── 输入 ──

export interface FeiGongQiMenInput {
  /** 起局时间 */
  datetime: string;
  /** 起局方式 */
  method: FeiGongMethod;
  /** 报数（method=baoshu 时） */
  number?: number;
  /** 所问事项 */
  question?: string;
}

// ── 九宫 ──

export interface FeiGongGong {
  /** 宫位（1-9洛书序） */
  pos: number;
  /** 方位 */
  direction: string;
  /** 天盘星 */
  star: FeiGongStar;
  /** 天盘门 */
  men: FeiGongMen;
  /** 天盘干 */
  tianGan: string;
  /** 地盘干 */
  diGan: string;
  /** 星门组合吉凶 */
  jiXiong: "吉" | "凶" | "平";
  /** 组合断语 */
  comment: string;
}

// ── 输出 ──

export interface FeiGongQiMenResult {
  input: FeiGongQiMenInput;

  /** 基本信息 */
  basicInfo: {
    /** 局数 */
    juShu: number;
    /** 旬首 */
    xunShou: string;
    /** 值使门 */
    zhiShiMen: FeiGongMen;
    /** 值符星 */
    zhiFuStar: FeiGongStar;
    /** 阴阳遁 */
    dunType: "阳遁" | "阴遁";
    /** 时辰干支 */
    shiGanZhi: string;
  };

  /** 九宫盘 */
  gongs: FeiGongGong[];

  /** 用神落宫 */
  yongShen: {
    /** 日干（求测人）落宫 */
    riGanGong: number;
    /** 时干（所测事）落宫 */
    shiGanGong: number;
    /** 关系 */
    relation: string;
  };

  /** 格局 */
  geJu: {
    name: string;
    gong: number;
    desc: string;
    jiXiong: "吉" | "凶" | "平";
  }[];

  /** 综合断语 */
  duanYu: string;
}
