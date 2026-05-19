// ── 金钱课（六爻简版/铜钱卦）共享类型 ──

/** 铜钱面 */
export type CoinFace = "zi" | "bei";

/** 爻类型 */
export type JinQianYaoType = "老阳" | "少阳" | "老阴" | "少阴";

/** 起卦方式 */
export type JinQianKeMethod = "shoutou" | "baoshu" | "random";

// ── 输入 ──

export interface JinQianKeInput {
  /** 起卦时间 */
  datetime: string;
  /** 起卦方式 */
  method: JinQianKeMethod;
  /** 六次摇卦结果（method=shoutou 时，每次3枚铜钱） */
  coins?: [CoinFace, CoinFace, CoinFace][];
  /** 报数（method=baoshu 时） */
  numbers?: [number, number];
  /** 所问事项 */
  question?: string;
}

// ── 单爻 ──

export interface JinQianYao {
  /** 爻位（初爻=1，上爻=6） */
  position: number;
  /** 三枚铜钱结果 */
  coins: [CoinFace, CoinFace, CoinFace];
  /** 字面数 */
  ziCount: number;
  /** 爻类型 */
  yaoType: JinQianYaoType;
  /** 是否动爻 */
  isDong: boolean;
  /** 爻画 */
  symbol: "⚊" | "⚋";
  /** 变爻画（动爻变后） */
  bianSymbol?: "⚊" | "⚋";
}

// ── 输出 ──

export interface JinQianKeResult {
  input: JinQianKeInput;

  /** 六爻详情 */
  yaos: JinQianYao[];

  /** 本卦 */
  benGua: {
    name: string;
    symbol: string;
    guaCi: string;
    shangGua: string;
    xiaGua: string;
  };

  /** 变卦（有动爻时） */
  bianGua?: {
    name: string;
    symbol: string;
    guaCi: string;
    shangGua: string;
    xiaGua: string;
  };

  /** 互卦 */
  huGua: {
    name: string;
    symbol: string;
  };

  /** 动爻爻辞 */
  dongYaoCi: {
    position: number;
    yaoCi: string;
  }[];

  /** 断卦要点 */
  duanGua: {
    /** 体用关系 */
    tiYong: string;
    /** 世应关系 */
    shiYing: string;
    /** 动静分析 */
    dongJing: string;
    /** 吉凶判断 */
    jiXiong: "吉" | "凶" | "平";
  };

  /** 综合断语 */
  duanYu: string;
}
