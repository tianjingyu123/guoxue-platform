// ── 汉字筛选工具共享类型 ──
// 用于起名时按条件筛选合适汉字

/** 筛选条件 */
export interface HanZiFilterCondition {
  /** 五行 */
  wuXing?: string[];
  /** 笔画数（精确） */
  stroke?: number;
  /** 笔画范围 */
  strokeRange?: { min: number; max: number };
  /** 部首 */
  radical?: string[];
  /** 声调（1234） */
  tone?: number[];
  /** 拼音首字母 */
  pinyinInitial?: string[];
  /** 是否仅常用字 */
  commonOnly?: boolean;
  /** 是否仅姓名推荐字 */
  nameOnly?: boolean;
  /** 字义关键词 */
  meaningKeyword?: string;
  /** 排除字 */
  excludeChars?: string[];
  /** 生肖喜忌筛选 */
  zodiac?: string;
  /** 与某字搭配（五行相生/音韵互补） */
  pairWith?: string;
}

// ── 输入 ──

export interface HanZiFilterInput {
  /** 筛选条件 */
  conditions: HanZiFilterCondition;
  /** 排序方式 */
  sortBy?: "stroke" | "pinyin" | "frequency" | "wuxing";
  /** 分页 */
  page?: number;
  pageSize?: number;
}

// ── 筛选结果字 ──

export interface FilteredChar {
  /** 汉字 */
  char: string;
  /** 康熙笔画 */
  kangXiStroke: number;
  /** 拼音 */
  pinyin: string;
  /** 五行 */
  wuXing: string;
  /** 字义简述 */
  meaning: string;
  /** 部首 */
  radical: string;
  /** 使用频率评级 */
  frequency: "高" | "中" | "低";
  /** 适合性别倾向 */
  genderHint?: "男" | "女" | "通用";
  /** 姓名学评价 */
  nameComment?: string;
  /** 生肖适配 */
  zodiacFit?: "宜" | "忌" | "平";
}

// ── 输出 ──

export interface HanZiFilterResult {
  input: HanZiFilterInput;

  /** 筛选结果 */
  chars: FilteredChar[];

  /** 总数 */
  total: number;

  /** 分页 */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };

  /** 筛选统计 */
  stats: {
    /** 五行分布 */
    wuXingDist: Record<string, number>;
    /** 笔画分布 */
    strokeDist: Record<number, number>;
  };
}
