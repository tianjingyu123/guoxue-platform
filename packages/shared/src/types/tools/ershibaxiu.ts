// ── 二十八宿类型 ──
// 二十八宿星象 + 禽星演禽 + 宿曜择日

export interface ErShiBaXiuInput {
  /** 查询日期 YYYY-MM-DD */
  date?: string;
  /** 二十八宿序号(1-28)，与date二选一 */
  xiuNumber?: number;
  /** 年份(用于演禽) */
  year?: number;
}

export interface XiuEntry {
  /** 序号 1-28 */
  index: number;
  /** 宿名 */
  name: string;
  /** 七曜配属 */
  yao: "日" | "月" | "火" | "水" | "木" | "金" | "土";
  /** 禽星 */
  qinXing: string;
  /** 方位（东西南北各七宿） */
  direction: "东" | "南" | "西" | "北";
  /** 所属动物象 */
  animal: string;
  /** 度数 */
  duShu: string;
  /** 吉凶 */
  jiXiong: "吉" | "凶" | "平";
  /** 宜 */
  yi: string;
  /** 忌 */
  ji: string;
  /** 宿曜释义 */
  meaning: string;
}

export interface ErShiBaXiuResult {
  /** 当日值宿 */
  currentXiu: XiuEntry;
  /** 日期 */
  date: string;
  /** 日干支 */
  ganZhi: string;
  /** 禽星值日 */
  qinXingZhiRi: string;
  /** 演禽关系 */
  yanQin: {
    riQin: string;
    shiQin: string;
    relation: string;
  };
  /** 28宿速查表 */
  fullTable: { index: number; name: string; yao: string; qinXing: string; direction: string; jiXiong: string }[];
  analysis: string;
}
