// ── 孔明神卦（诸葛亮马前课变体）共享类型 ──

/** 起卦方式 */
export type KongMingMethod = "shici" | "baoshu" | "random";

// ── 输入 ──

export interface KongMingInput {
  /** 起卦时间 */
  datetime: string;
  /** 起卦方式 */
  method: KongMingMethod;
  /** 报数（1-384） */
  number?: number;
  /** 时辰起卦用的汉字/事物 */
  trigger?: string;
  /** 所问事项 */
  question?: string;
}

// ── 卦象 ──

export interface KongMingGua {
  /** 卦序号 */
  index: number;
  /** 卦名 */
  name: string;
  /** 上卦 */
  shangGua: string;
  /** 下卦 */
  xiaGua: string;
  /** 卦象符号 */
  symbol: string;
  /** 卦辞 */
  guaCi: string;
  /** 彖辞 */
  tuanCi: string;
  /** 大象辞 */
  daXiang: string;
}

// ── 爻辞 ──

export interface KongMingYao {
  /** 爻位 */
  position: number;
  /** 爻名（初六/九二等） */
  yaoName: string;
  /** 爻辞 */
  yaoCi: string;
  /** 小象辞 */
  xiaoXiang: string;
}

// ── 输出 ──

export interface KongMingResult {
  input: KongMingInput;

  /** 起卦过程 */
  process: {
    method: string;
    calcDesc: string;
    guaNumber: number;
    dongYao: number;
  };

  /** 本卦 */
  benGua: KongMingGua;

  /** 变卦 */
  bianGua: KongMingGua;

  /** 动爻爻辞 */
  dongYaoCi: KongMingYao;

  /** 解卦 */
  jieGua: {
    /** 卦象大意 */
    daYi: string;
    /** 事业 */
    shiYe: string;
    /** 财运 */
    caiYun: string;
    /** 感情 */
    ganQing: string;
    /** 健康 */
    jianKang: string;
    /** 出行 */
    chuXing: string;
    /** 针对问题的具体分析 */
    specific: string;
  };

  /** 综合断语 */
  duanYu: string;
}
