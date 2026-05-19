// ── 七政四余共享类型 ──

/** 七政（日月五星） */
export type QiZhengStar =
  | "太阳" | "太阴" | "金星" | "木星"
  | "水星" | "火星" | "土星";

/** 四余 */
export type SiYuStar = "紫气" | "月孛" | "罗睺" | "计都";

/** 所有星曜 */
export type AllStar = QiZhengStar | SiYuStar;

/** 二十八宿 */
export type ErShiBaXiu =
  | "角" | "亢" | "氐" | "房" | "心" | "尾" | "箕"
  | "斗" | "牛" | "女" | "虚" | "危" | "室" | "壁"
  | "奎" | "娄" | "胃" | "昴" | "毕" | "觜" | "参"
  | "井" | "鬼" | "柳" | "星" | "张" | "翼" | "轸";

/** 十二宫名 */
export type ShiErGong =
  | "命宫" | "财帛" | "兄弟" | "田宅"
  | "男女" | "奴仆" | "夫妻" | "疾厄"
  | "迁移" | "官禄" | "福德" | "相貌";

/** 庙旺落陷 */
export type StarState = "庙" | "旺" | "利" | "平" | "陷";

// ── 输入 ──

export interface QiZhengInput {
  /** 出生时间 */
  datetime: string;
  /** 出生经度（用于真太阳时修正） */
  longitude?: number;
  /** 出生纬度 */
  latitude?: number;
  /** 性别 */
  gender: "male" | "female";
  /** 是否用真太阳时 */
  trueSolar: boolean;
  /** 推算体系：果老/洞微 */
  system: "guolao" | "dongwei";
}

// ── 星曜位置 ──

export interface StarPosition {
  /** 星名 */
  star: AllStar;
  /** 所在宫位 */
  gong: ShiErGong;
  /** 所在宿度 */
  xiu: ErShiBaXiu;
  /** 宿度数 */
  xiuDu: number;
  /** 黄经度数 */
  eclipticDeg: number;
  /** 庙旺利平陷 */
  state: StarState;
  /** 顺逆行 */
  direction: "顺" | "逆" | "留" | "伏";
  /** 与日距离（度） */
  sunDistance?: number;
}

// ── 宫位信息 ──

export interface GongInfo {
  /** 宫名 */
  name: ShiErGong;
  /** 宫主星 */
  ruler: AllStar;
  /** 入宫星曜 */
  stars: AllStar[];
  /** 起始宿度 */
  startXiu: string;
  /** 人事断语 */
  renShi: string;
}

// ── 大限 ──

export interface DaXian {
  /** 起限年龄 */
  startAge: number;
  /** 终限年龄 */
  endAge: number;
  /** 大限宫位 */
  gong: ShiErGong;
  /** 行运星 */
  stars: AllStar[];
  /** 断语 */
  desc: string;
}

// ── 输出 ──

export interface QiZhengResult {
  input: QiZhengInput;

  /** 基本信息 */
  basicInfo: {
    /** 命宫所在 */
    mingGong: ShiErGong;
    /** 身宫所在 */
    shenGong: ShiErGong;
    /** 命主星 */
    mingZhu: AllStar;
    /** 身主星 */
    shenZhu: AllStar;
    /** 日主宿度 */
    riZhuXiu: string;
    /** 推算体系 */
    system: string;
  };

  /** 十一曜位置 */
  starPositions: StarPosition[];

  /** 十二宫信息 */
  gongs: GongInfo[];

  /** 星曜相位（合/刑/冲/拱等） */
  aspects: {
    star1: AllStar;
    star2: AllStar;
    type: "合" | "刑" | "冲" | "拱" | "夹";
    degree: number;
    desc: string;
  }[];

  /** 大限（洞微/果老） */
  daXian: DaXian[];

  /** 流年星行 */
  liuNian?: {
    year: number;
    transits: { star: AllStar; gong: ShiErGong; desc: string }[];
  };

  /** 格局 */
  geJu: {
    name: string;
    stars: AllStar[];
    desc: string;
    jiXiong: "吉" | "凶" | "平";
  }[];

  /** 综合断语 */
  duanYu: string;
}
