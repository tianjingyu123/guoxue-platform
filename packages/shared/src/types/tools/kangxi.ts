// ── 康熙字典查询共享类型 ──

/** 查询方式 */
export type KangXiQueryType = "char" | "pinyin" | "radical" | "stroke" | "wuxing";

// ── 输入 ──

export interface KangXiInput {
  /** 查询方式 */
  queryType: KangXiQueryType;
  /** 查询内容 */
  query: string;
  /** 五行筛选 */
  wuXingFilter?: string;
  /** 笔画范围 */
  strokeRange?: { min: number; max: number };
  /** 分页 */
  page?: number;
  pageSize?: number;
}

// ── 字详情 ──

export interface KangXiChar {
  /** 汉字 */
  char: string;
  /** 康熙笔画 */
  kangXiStroke: number;
  /** 简体笔画 */
  simpleStroke: number;
  /** 部首 */
  radical: string;
  /** 部首外笔画 */
  remainStroke: number;
  /** 拼音 */
  pinyin: string[];
  /** 五行属性 */
  wuXing: string;
  /** 字义摘要 */
  meaning: string;
  /** 姓名学解释 */
  nameMeaning: string;
  /** 是否常用字 */
  isCommon: boolean;
  /** 是否为姓名推荐字 */
  isNameRecommended: boolean;
  /** Unicode编码 */
  unicode: string;
  /** 四角号码 */
  siJiao?: string;
  /** 仓颉码 */
  cangJie?: string;
}

// ── 输出 ──

export interface KangXiResult {
  input: KangXiInput;

  /** 查询结果 */
  chars: KangXiChar[];

  /** 总数 */
  total: number;

  /** 分页信息 */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };

  /** 笔画统计（按五行分组） */
  stats?: {
    wuXing: string;
    count: number;
    strokeRange: string;
  }[];
}
