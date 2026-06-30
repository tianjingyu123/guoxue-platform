// ── 奇门遁甲共享类型 ──

/** 奇门排盘方法 */
export type QimenMethod = "zhuanpan" | "feipan";

/** 飞宫方式 */
export type FeiGongMode = "yang-shun-yin-ni" | "yinyang-jie-shun";

/** 起居方式 */
export type QiJuMethod = "chaibu" | "maoshan" | "zhirun" | "zixuan";

/** 暗干起法 */
export type AnGanMethod = "zhishimen-qi" | "men-dipan-qi";

/** 寄宫方式 */
export type JiGongMode = "kungong" | "yang-gen-yin-kun";

/** 阴阳遁 */
export type YinYangDun = "yang" | "yin";

/** 排盘类型 */
export type PanType = "nian" | "yue" | "ri" | "shi" | "ke";

// ── 阳盘奇门输入 ──

export interface QimenYangInput {
  /** 排盘时间 */
  datetime: string;
  /** 排盘方法 */
  method: QimenMethod;
  /** 飞宫方式（飞盘时生效） */
  feiGongMode?: FeiGongMode;
  /** 起居方式 */
  qiJuMethod: QiJuMethod;
  /** 自选局数（起居=自选时生效） */
  customJu?: number;
  /** 暗干起法 */
  anGanMethod: AnGanMethod;
  /** 真太阳时 */
  useTrueSolar: boolean;
}

// ── 阳盘命理奇门输入 ──

export interface QimenYangMingLiInput extends QimenYangInput {
  /** 寄宫方式 */
  jiGongMode: JiGongMode;
  /** 出生时间 */
  birthTime: string;
  /** 出生地点 */
  birthplace?: string;
  /** 夏令时 */
  useDaylightSaving: boolean;
  /** 早晚子时 */
  ziShiMode: "traditional" | "early-late";
}

// ── 阴盘奇门输入 ──

export interface QimenYinInput {
  /** 排盘时间 */
  datetime: string;
  /** 排盘类型 */
  panType: PanType;
  /** 自选局 */
  customJu?: number;
  /** 真太阳时 */
  useTrueSolar: boolean;
}

// ── 阴盘命理奇门输入 ──

export interface QimenYinMingLiInput extends QimenYinInput {
  birthTime: string;
  birthplace?: string;
  useDaylightSaving: boolean;
  ziShiMode: "traditional" | "early-late";
}

// ── 通用奇门宫位信息 ──

/** 奇门宫位 */
export interface QimenGong {
  /** 宫位序号 1-9 */
  index: number;
  /** 宫位名称 */
  name: string;
  /** 八卦名 */
  bagua: string;
  /** 地盘干 */
  diPan: string;
  /** 天盘干 */
  tianPan: string;
  /** 九星 */
  star: string;
  /** 八门 */
  men: string;
  /** 八神 */
  shen: string;
  /** 隐干（阴盘特有） */
  yinGan?: string;
  /** 安干/暗干（人元，阳盘命理奇门特有） */
  anGan?: string;
  /** 地盘神（阳盘命理奇门：值符起旬首宫阳顺阴逆的原始八神位） */
  dipanShen?: string;
  /** 天盘干、地盘干、安干在本宫地支的十二长生（阳盘命理奇门/时家奇门） */
  changsheng?: { tian: string; di: string; an: string };
  /** 入墓 */
  isRuMu: boolean;
  /** 击刑 */
  isJiXing: boolean;
  /** 门破 */
  isMenPo: boolean;
  /** 十二长生 */
  changSheng?: string;
  /** 空亡 */
  kongWang: boolean;
  /** 马星 */
  maXing: boolean;
  /** 神煞列表 */
  shenSha?: string[];
  /** 宫内象意解读 */
  interpretation?: string;
}

// ── 奇门排盘结果 ──

export interface QimenResult {
  /** 局数（1-9） */
  juNumber: number;
  /** 阳遁/阴遁 */
  dunType: YinYangDun;
  /** 用事节气 */
  jieQi: string;
  /** 用事时辰 */
  yongShi: string;
  /** 值符 */
  zhiFu: string;
  /** 值使门 */
  zhiShiMen: string;
  /** 九宫信息 */
  gongs: QimenGong[];
  /** 地盘八神标注 */
  dipanBashen: string[];
  /** 上一局参数 */
  prevJu?: { number: number; type: YinYangDun };
  /** 下一局参数 */
  nextJu?: { number: number; type: YinYangDun };
}

// ── 命理奇门额外信息 ──

/** 八字简略信息 */
export interface BaZiInfo {
  nian: string;        // 年柱干支
  yue: string;         // 月柱干支
  ri: string;          // 日柱干支
  shi: string;         // 时柱干支
  shengXiao: string;   // 生肖
  kongWang: string;    // 空亡
  wuXingEnergy: { mu: number; huo: number; tu: number; jin: number; shui: number; desc: string };
  nianNaYin: string;   // 年纳音
  yueNaYin: string;
  riNaYin: string;
  shiNaYin: string;
}

/** 命宫/身宫九宫映射信息 */
export interface MingShenGongInfo {
  ganZhi: string;
  gan: string;
  zhi: string;
  gongIndex: number;
  gongName: string;
  star: string;
  men: string;
  shen: string;
  ganShiShen?: string;
  zhiShiShen?: string;
}

/** 流年分析 */
export interface LiuNianAnalysis {
  year: number;
  ganZhi: string;
  age: number;
  luoGongIndex: number;
  luoGongName: string;
  daYunGanZhi: string;
  daYunStartAge: number;
  daYunEndAge: number;
}

export interface MingLiInfo {
  /** 大运列表 */
  daYun: { name: string; startAge: number; endAge: number; juNumber: number }[];
  /** 八字切换信息 */
  baziSwitch: {
    available: boolean;
    baziRecordId?: string;
  };
  /** 八字排盘总结 */
  bazi?: BaZiInfo;
  /** 命宫落宫信息 */
  mingGong?: MingShenGongInfo;
  /** 身宫落宫信息 */
  shenGong?: MingShenGongInfo;
  /** 起运信息 */
  qiYunInfo?: { startAge: number; startYear: number; desc: string };
  /** 当前流年分析 */
  liuNian?: LiuNianAnalysis;
  /** 详细大运（扩展） */
  daYunSteps?: {
    name: string;
    ganZhi: string;
    startAge: number;
    endAge: number;
    startYear: number;
    endYear: number;
    ganShiShen?: string;
    zhiShiShen?: string;
    liuNian?: { year: number; ganZhi: string; age: number }[];
  }[];
}
