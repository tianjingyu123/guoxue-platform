/** 六十甲子纳音详解 — 共享类型 */
export interface NayinXiangJieInput {
  /** 干支字符串，如 "甲子", "丙寅" */
  ganZhi?: string;
  /** 或按天干+地支分别传入 */
  gan?: string;
  zhi?: string;
  /** 查询模式: single=单个查询, all=全部60甲子 */
  mode?: "single" | "all";
  /** 按纳音五行筛选: 金/木/水/火/土 */
  filterWx?: string;
}

export interface NayinItem {
  /** 干支对，如 "甲子 乙丑" */
  pairs: string;
  /** 纳音名，如 "海中金" */
  name: string;
  /** 简称，如 "海中" */
  shortName: string;
  /** 五行，金/木/水/火/土 */
  wuXing: string;
  /** 纳音意象 */
  imagery: string;
  /** 吉凶: 吉/平/凶 */
  jiXiong: string;
  /** 详细解读 */
  detail: string;
  /** 生克关系 */
  shengKe: string;
  /** 应用场景 */
  applications: string[];
}

export interface NayinXiangJieResult {
  /** 查询模式 */
  mode: string;
  /** 目标干支 */
  target?: string;
  /** 命中所属纳音 */
  matched?: NayinItem;
  /** 纳音速查表（五行分组） */
  lookupTable?: Record<string, NayinItem[]>;
  /** 综合解读 */
  analysis: string;
}
