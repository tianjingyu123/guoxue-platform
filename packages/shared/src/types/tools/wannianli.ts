// ── 万年历（含择吉）共享类型 ──
// 全面权威的万年历+择吉指导系统

/** 择吉方法 */
export type ZeJiMethod =
  | "huangli"      // 黄历宜忌
  | "xuan-ze"      // 玄学择日（天星择日）
  | "dong-gong"    // 董公择日
  | "qi-zheng"     // 七政择日
  | "liu-yao"      // 六壬择日
  | "qimen"        // 奇门择日
  | "taiyi"        // 太乙择日
  | "shen-sha"     // 神煞择日
  | "jian-chu"     // 建除十二值日
  | "er-shi-ba-xiu" // 二十八宿值日
  | "tian-de"      // 天德/月德择日
  | "wu-bu-yu";    // 五不遇时

/** 事项类型 */
export type ShiXiangType =
  | "jiehun" | "banqian" | "kaiye" | "dongtu" | "anmen"
  | "chuxing" | "qiuyi" | "zangmai" | "jisi" | "liangzhuo"
  | "ruze" | "mumu" | "shoulie" | "kaishi" | "poma"
  | "caiyi" | "naqian" | "jiaoyi" | "pobing" | "chuxi";

/** 建除十二值 */
export type JianChuZhi =
  | "建" | "除" | "满" | "平" | "定" | "执"
  | "破" | "危" | "成" | "收" | "开" | "闭";

/** 二十八宿 */
export type ErShiBaXiuDay =
  | "角" | "亢" | "氐" | "房" | "心" | "尾" | "箕"
  | "斗" | "牛" | "女" | "虚" | "危" | "室" | "壁"
  | "奎" | "娄" | "胃" | "昴" | "毕" | "觜" | "参"
  | "井" | "鬼" | "柳" | "星" | "张" | "翼" | "轸";

// ── 输入 ──

export interface WanNianLiInput {
  /** 查询日期 */
  date: string;
  /** 查询范围类型 */
  rangeType: "day" | "month" | "range";
  /** 结束日期（rangeType=range时） */
  endDate?: string;
  /** 择吉事项（可选，用于筛选吉日） */
  shiXiang?: ShiXiangType[];
  /** 择吉方法偏好 */
  zeJiMethods?: ZeJiMethod[];
  /** 生辰八字（个人择吉时用） */
  bazi?: string;
}

// ── 日历单日详情 ──

export interface DayDetail {
  /** 公历日期 */
  solarDate: string;
  /** 农历日期 */
  lunarDate: string;
  /** 年干支 */
  nianGanZhi: string;
  /** 月干支 */
  yueGanZhi: string;
  /** 日干支 */
  riGanZhi: string;
  /** 时干支列表（12时辰） */
  shiGanZhi: string[];
  /** 星期 */
  weekDay: string;
  /** 节气（当日有则显示） */
  jieQi?: string;
  /** 农历月份 */
  lunarMonth: string;
  /** 农历日 */
  lunarDay: string;
  /** 是否闰月 */
  isLeap: boolean;

  /** 建除值日 */
  jianChu: JianChuZhi;
  /** 二十八宿值日 */
  erShiBaXiu: ErShiBaXiuDay;
  /** 纳音 */
  naYin: string;
  /** 九星值日 */
  jiuXing: string;
  /** 十二值神 */
  zhiShen: string;
  /** 彭祖百忌 */
  pengZu: string;

  /** 胎神占方 */
  taiShen: string;
  /** 冲煞 */
  chongSha: string;
  /** 岁煞方 */
  suiSha: string;

  /** 黄历宜 */
  yi: string[];
  /** 黄历忌 */
  ji: string[];

  /** 吉神宜趋 */
  jiShen: string[];
  /** 凶神宜忌 */
  xiongSha: string[];

  /** 时辰吉凶 */
  shiChenJiXiong: {
    shi: string;
    ganZhi: string;
    jiXiong: "吉" | "凶" | "平";
    chong: string;
    yi: string[];
    ji: string[];
  }[];

  /** 节日列表 */
  festivals?: string[];

  /** 吉日评分（0-100） */
  score?: number;
}

// ── 择吉结果 ──

export interface ZeJiResult {
  /** 推荐吉日列表 */
  jiDays: {
    date: string;
    score: number;
    reasons: string[];
    methods: ZeJiMethod[];
  }[];
  /** 各方法汇总分析 */
  methodAnalysis: {
    method: ZeJiMethod;
    result: string;
    jiDates: string[];
  }[];
  /** 综合建议 */
  suggestion: string;
}

// ── 输出 ──

export interface WanNianLiResult {
  input: WanNianLiInput;

  /** 日历详情列表 */
  days: DayDetail[];

  /** 当月节气 */
  jieQiList: {
    name: string;
    date: string;
    time: string;
  }[];

  /** 择吉结果（有择吉需求时返回） */
  zeJi?: ZeJiResult;

  /** 月相（朔望弦晦） */
  moonPhases?: {
    date: string;
    phase: "朔" | "上弦" | "望" | "下弦";
  }[];

  /** 本月重要日子 */
  importantDays?: {
    date: string;
    name: string;
    type: "节日" | "节气" | "纪念日";
  }[];
}
