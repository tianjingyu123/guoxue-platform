// ── 大六壬排盘共享类型 ──

/** 天干 */
type Gan = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";

/** 地支 */
type Zhi = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

/** 换将方式 */
export type JiangMethod = "zhongqi" | "jiaojie";

/** 贵人诀 */
export type GuiRenJue = "jiawugeng-niuyang" | "jiayang-wugengniu";

/** 贵神昼夜 */
export type GuiRenDayNight = "maoyou" | "day" | "night";

/** 涉害取法 */
export type SheHaiType = "mengzhongji" | "shenqian";

// ── 大六壬输入 ──

export interface DaLiuRenInput {
  /** 起课时间（默认当前） */
  datetime: string;
  /** 出生/命主年份（用于年命行年计算） */
  birthYear: number;
  /** 性别 */
  gender: "男" | "女";
  /** 活时（默认当下时辰），可手动选择 */
  liveTime: string;
  /** 报数起课（选填，与活时互斥） */
  reportNumber?: number;
  /** 随机起课 */
  random: boolean;
  /** 换将方式：中气换将 / 交节换将 */
  jiangMethod: JiangMethod;
  /** 贵人诀：甲戊庚牛羊 / 甲羊戊庚牛 */
  guiRenJue: GuiRenJue;
  /** 贵神昼夜：卯酉区分 / 白天 / 夜晚 */
  guiRenDayNight: GuiRenDayNight;
  /** 涉害取法：孟仲季 / 深浅 */
  sheHaiType: SheHaiType;
  /** 真太阳时 */
  trueSolar: boolean;
}

// ── 十二宫神 ──

/** 十二天将 */
export type TianJiangName =
  | "贵人" | "螣蛇" | "朱雀" | "六合" | "勾陈" | "青龙"
  | "天空" | "白虎" | "太常" | "玄武" | "太阴" | "天后";

/** 月将 */
export type YueJiangName =
  | "神后" | "大吉" | "功曹" | "太冲" | "天罡" | "太乙"
  | "胜光" | "小吉" | "传送" | "从魁" | "河魁" | "登明";

/** 十二宫中的一宫 */
export interface LiuRenGong {
  /** 宫位地支 */
  zhi: Zhi;
  /** 地盘神 */
  diPan: string;
  /** 天盘神（月将加时后） */
  tianPan: string;
  /** 天将 */
  tianJiang?: TianJiangName;
  /** 遁干 */
  dunGan?: string;
  /** 六亲 */
  liuQin?: string;
  /** 本宫神煞 */
  shenSha: string[];
}

// ── 四课 ──

export interface SiKeColumn {
  /** 课位序号 1-4 */
  index: number;
  /** 下神（支） */
  xiaZhi: Zhi;
  /** 下神天干（寄宫所得） */
  xiaGan: Gan;
  /** 上神（支） */
  shangZhi: Zhi;
  /** 上神含义 */
  description: string;
}

// ── 三传 ──

export interface SanChuan {
  /** 初传 */
  chu: {
    zhi: Zhi;
    dunGan?: string;
    liuQin?: string;
    tianJiang?: TianJiangName;
    description: string;
  };
  /** 中传 */
  zhong: {
    zhi: Zhi;
    dunGan?: string;
    liuQin?: string;
    tianJiang?: TianJiangName;
    description: string;
  };
  /** 末传 */
  mo: {
    zhi: Zhi;
    dunGan?: string;
    liuQin?: string;
    tianJiang?: TianJiangName;
    description: string;
  };
}

// ── 宗门（发三传的方式）──

export type ZongMen =
  | "贼克" | "比用" | "涉害" | "遥克"
  | "昴星" | "别责" | "八专" | "伏吟" | "反吟";

/** 课经信息 */
export interface KeJing {
  /** 课体名称（64课之一） */
  name: string;
  /** 课体编号 */
  number: number;
  /** 课体断语概要 */
  summary: string;
  /** 相关毕法赋条目 */
  biFaFu: string[];
}

// ── 大六壬排盘结果 ──

export interface DaLiuRenResult {
  /** 输入参数 */
  input: DaLiuRenInput;

  // ── 基本信息 ──
  /** 占时（用事时辰） */
  zhanShi: Zhi;
  /** 月将 */
  yueJiang: YueJiangName;
  /** 月将对应地支 */
  yueJiangZhi: Zhi;
  /** 昼夜 */
  dayNight: "昼" | "夜";
  /** 所用节气 */
  jieQi: string;
  /** 日柱干支 */
  riGanZhi: string;

  // ── 天地盘 ──
  /** 十二宫（地盘固定，天盘+天将） */
  gongs: LiuRenGong[];

  // ── 四课 ──
  siKe: SiKeColumn[];

  // ── 三传 ──
  sanChuan: SanChuan;
  /** 所用宗门 */
  zongMen: ZongMen;
  /** 宗门使用说明 */
  zongMenDesc: string;

  // ── 十二天将 ──
  tianJiangLayout: {
    zhi: Zhi;
    tianJiang: TianJiangName;
    dayNight: "昼" | "夜";
  }[];

  // ── 课经 ──
  keJing: KeJing[];

  // ── 神煞 ──
  shenSha: {
    name: string;
    zhi: Zhi;
    type: "ji" | "xiong";
    description: string;
  }[];

  // ── 空亡 ──
  kongWang: Zhi[];

  // ── 年命行年 ──
  nianMing: {
    /** 命主出生年干支 */
    ganZhi: string;
    /** 年命所在宫位 */
    gongWei: Zhi;
  };
  xingNian: {
    /** 行年干支 */
    ganZhi: string;
    /** 行年所在宫位 */
    gongWei: Zhi;
  };

  // ── 遁干全表 ──
  dunGanTable: { zhi: Zhi; gan: Gan }[];

  // ── 六亲全表 ──
  liuQinTable: { zhi: Zhi; liuQin: string }[];

  // ── 断语汇总 ──
  duanYu?: string;
}
