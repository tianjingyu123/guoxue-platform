// ── 梅花外应类型 ──
// 梅花易数外应预测/三要十应/外应取象

export interface MeiHuaWaiXiangInput {
  /** 外应类别 */
  waiXiangType?: "天时" | "地理" | "人事" | "物象" | "声音" | "文字";
}

export interface WaiXiangEntry {
  /** 外应现象 */
  xianXiang: string;
  /** 吉凶 */
  jiXiong: "吉" | "平" | "凶";
  /** 所主之事 */
  suoZhu: string;
  /** 应期 */
  yingQi: string;
  /** 实例说明 */
  shiLi: string;
}

export interface WaiXiangCategory {
  /** 类别 */
  type: string;
  /** 说明 */
  description: string;
  /** 外应条目 */
  entries: WaiXiangEntry[];
}

export interface MeiHuaWaiXiangResult {
  category: WaiXiangCategory | null;
  allCategories: WaiXiangCategory[];
  sanYaoShiYing: { name: string; content: string }[];
  analysis: string;
}
