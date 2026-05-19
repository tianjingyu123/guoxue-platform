// ── 梅花易数共享类型 ──

/** 梅花起卦方式 */
export type MeiHuaMethod = "time" | "manual" | "number" | "auto";

/** 体用关系 */
export type TiYongRelation =
  | "yong-sheng-ti"   // 用生体（大吉）
  | "ti-yong-bihe"    // 体用比和（吉）
  | "ti-ke-yong"      // 体克用（小吉）
  | "ti-sheng-yong"   // 体生用（凶）
  | "yong-ke-ti";     // 用克体（大凶）

/** 梅花易数输入 */
export interface MeiHuaInput {
  method: MeiHuaMethod;
  datetime?: string;
  numbers?: number[];
  upperGua?: number;
  lowerGua?: number;
  dongYao?: number;
}

/** 梅花易数排盘结果 */
export interface MeiHuaResult {
  input: MeiHuaInput;
  /** 本卦 */
  benGua: {
    name: string;
    symbol: string;
    upper: { number: number; name: string; wuXing: string };
    lower: { number: number; name: string; wuXing: string };
    binary: string;
  };
  /** 动爻位置 */
  dongYao: number;
  /** 变卦 */
  bianGua: {
    name: string;
    symbol: string;
    upper: { number: number; name: string; wuXing: string };
    lower: { number: number; name: string; wuXing: string };
  };
  /** 互卦 */
  huGua: {
    name: string;
    symbol: string;
    upper: { number: number; name: string; wuXing: string };
    lower: { number: number; name: string; wuXing: string };
  };
  /** 体卦信息 */
  tiGua: { number: number; name: string; wuXing: string };
  /** 用卦信息 */
  yongGua: { number: number; name: string; wuXing: string };
  /** 体用关系 */
  tiYongRelation: TiYongRelation;
  /** 卦气旺衰 */
  guaQi: Record<string, "旺" | "相" | "休" | "囚" | "死">;
  /** 策轨 */
  ceGui: {
    /** 原策数 */
    yuanCe: number;
    /** 原轨数 */
    yuanGui: number;
    /** 演策数（元会运世） */
    yanCe: { yuan: number; hui: number; yun: number; shi: number };
  };
  /** 节气 */
  jieQi: string;
  /** 神煞 */
  shenSha: string[];
  /** 空亡 */
  kongWang: string;
  /** 断语总结 */
  duanYu: string;
  /** 卦辞 */
  guaCi?: string;
  /** 爻辞 */
  yaoCi?: string;
  /** 体用深度解读 */
  tiYongAnalysis?: string;
}
