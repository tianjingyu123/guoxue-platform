// ── 六爻排盘共享类型 ──

/** 起卦方式 */
export type LiuYaoQiGuaMethod =
  | "time"         // 时间起卦
  | "manual"       // 手动指定
  | "shake"        // 在线摇卦
  | "hex-name"     // 卦名起卦
  | "number-2"     // 数字起卦1（两数法）
  | "number-3"     // 数字起卦2（三数法）
  | "auto"         // 自动起卦
  | "phone"        // 手机号起卦
  | "stroke";      // 笔画起卦

/** 爻象 */
export type YaoType = "shaoyang" | "shaoyin" | "laoyang" | "laoyin";

/** 一爻 */
export interface Yao {
  /** 爻位 1-6（1=初爻，6=上爻） */
  position: number;
  /** 爻类型 */
  type: YaoType;
  /** 纳甲（天干地支） */
  naJia: string;
  /** 六亲 */
  liuQin: string;
  /** 六兽 */
  liuShou: string;
  /** 世应 */
  shiYing: "世" | "应" | null;
  /** 五行 */
  wuXing: string;
  /** 是否动爻 */
  isDongYao: boolean;
}

/** 六十四卦 */
export interface Hexagram {
  /** 卦名 */
  name: string;
  /** 卦象（如䷀） */
  symbol: string;
  /** 上下卦 */
  upper: string;
  lower: string;
}

/** 六爻输入 */
export interface LiuYaoInput {
  method: LiuYaoQiGuaMethod;
  /** 时间起卦-时间 */
  datetime?: string;
  /** 数字起卦1-两个数字 */
  numbers2?: [number, number];
  /** 数字起卦2-三个数字 */
  numbers3?: [number, number, number];
  /** 卦名起卦-卦名+动爻 */
  hexName?: string;
  dongYaoPositions?: number[];
  /** 手动指定-六爻类型 */
  yaos?: YaoType[];
}

/** 六爻排盘结果 */
export interface LiuYaoResult {
  input: LiuYaoInput;
  /** 本卦 */
  benGua: Hexagram;
  /** 变卦 */
  bianGua?: Hexagram;
  /** 互卦 */
  huGua?: Hexagram;
  /** 六爻详情 */
  yaos: Yao[];
  /** 装卦：世爻位置 */
  shiYao: number;
  /** 装卦：应爻位置 */
  yingYao: number;
  /** 卦宫 */
  guaGong: string;
  /** 五行属性 */
  wuXing: string;
}
