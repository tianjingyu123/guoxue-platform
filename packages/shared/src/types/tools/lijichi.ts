// ── 立极尺（鲁班尺/丁兰尺/门公尺）共享类型 ──

/** 尺种类 */
export type ChiType =
  | "luban"     // 鲁班尺（阳宅用，门窗家具）
  | "dinglan"   // 丁兰尺（阴宅用，神位牌位）
  | "mengong"   // 门公尺（台寸换算）
  | "yacun";    // 压白尺（寸白配合）

/** 鲁班尺八字 */
export type LuBanBaZi = "财" | "病" | "离" | "义" | "官" | "劫" | "害" | "本";

/** 丁兰尺十字 */
export type DingLanShiZi = "丁" | "害" | "旺" | "苦" | "义" | "官" | "死" | "兴" | "失" | "财";

// ── 输入 ──

export interface LiJiChiInput {
  /** 尺种类 */
  chiType: ChiType;
  /** 尺寸（厘米） */
  lengthCm: number;
  /** 用途说明（门/窗/桌/牌位等） */
  usage?: string;
  /** 是否批量验算 */
  batch?: boolean;
  /** 批量尺寸列表 */
  batchLengths?: number[];
}

// ── 单尺寸结果 ──

export interface ChiMeasurement {
  /** 尺寸（cm） */
  lengthCm: number;
  /** 换算台寸 */
  taiCun: number;
  /** 鲁班尺落字 */
  luBanZi?: LuBanBaZi;
  /** 鲁班尺细分 */
  luBanDetail?: string;
  /** 丁兰尺落字 */
  dingLanZi?: DingLanShiZi;
  /** 丁兰尺细分 */
  dingLanDetail?: string;
  /** 压白（寸白）落位 */
  cunBai?: string;
  /** 吉凶 */
  jiXiong: "吉" | "凶" | "平";
  /** 说明 */
  desc: string;
  /** 适用场景 */
  suitableFor: string[];
}

// ── 输出 ──

export interface LiJiChiResult {
  input: LiJiChiInput;

  /** 测量结果 */
  measurement: ChiMeasurement;

  /** 批量结果 */
  batchResults?: ChiMeasurement[];

  /** 推荐吉利尺寸（在给定范围内） */
  recommended?: {
    lengthCm: number;
    luBanZi: LuBanBaZi;
    desc: string;
  }[];

  /** 鲁班尺全表参考 */
  reference: {
    baZi: LuBanBaZi;
    range: string;
    meaning: string;
    yiYong: string;
  }[];

  /** 综合断语 */
  duanYu: string;
}
