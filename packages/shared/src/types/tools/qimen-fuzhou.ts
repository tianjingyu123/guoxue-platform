// ── 奇门符咒化解（移星换斗）共享类型 ──
// 基于阴盘奇门排盘结果，通过转宫/拆填/添加三法化解
// 参考：王凤麟道家奇门符咒化解、移星换斗理论

/** 化解方法 */
export type ResolutionMethod = "转宫法" | "拆填法" | "添加法";

/** 化解方案 */
export interface ResolutionPlan {
  /** 目标宫位 */
  gongIndex: number;
  gongName: string;
  /** 当前问题 */
  problem: string;
  /** 问题符号（天干/九星/八门） */
  problemSymbols: string[];
  /** 严重程度 1-10 */
  severity: number;
  /** 推荐化解方法 */
  method: ResolutionMethod;
  /** 方法说明 */
  methodDesc: string;
  /** 具体操作步骤 */
  steps: string[];
  /** 所需物品 */
  items: { name: string; quantity: string; placement: string }[];
  /** 目标宫位（转宫法时有值） */
  targetGong?: { index: number; name: string };
  /** 预期效果 */
  expectedEffect: string;
  /** 时效 */
  duration: string;
}

/** 符咒化解输入 */
export interface QiMenFuZhouInput {
  /** 排盘日期时间 */
  datetime: string;
  /** 化解目标（财运/健康/感情/事业/学业/综合） */
  target: "财运" | "健康" | "感情" | "事业" | "学业" | "综合";
  /** 具体诉求 */
  description?: string;
}

/** 符咒化解结果 */
export interface QiMenFuZhouResult {
  input: QiMenFuZhouInput;
  /** 排盘信息 */
  panInfo: {
    juNumber: number;
    dunType: "yang" | "yin";
    yongShi: string;
    zhiFu: string;
    zhiShiMen: string;
  };
  /** 化解方案列表（最多3处） */
  plans: ResolutionPlan[];
  /** 调理顺序 */
  executionOrder: string;
  /** 综合断语 */
  duanYu: string;
  /** 禁忌事项 */
  taboos: string[];
  /** 有效期提醒 */
  validityReminder: string;
}
