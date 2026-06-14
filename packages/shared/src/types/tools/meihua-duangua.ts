// ── 梅花断卦体用进阶共享类型 ──

export interface MeiHuaDuanGuaInput {
  shangGua?: string;
  xiaGua?: string;
  dongYao?: number;
  huGuaShang?: string;
  huGuaXia?: string;
  bianGuaShang?: string;
  bianGuaXia?: string;
}

export interface MeiHuaDuanGuaResult {
  tiYongAnalysis: TiYongInfo;
  guaXiangAnalysis: MeiHuaGuaXiangDetail[];
  shengKeChain: ShengKeItem[];
  duanGuaTips: DuanGuaTip[];
  summary: string;
}

export interface TiYongInfo {
  tiGua: string;
  yongGua: string;
  tiYongRelation: string;
  level: string;
  generalMeaning: string;
}

export interface MeiHuaGuaXiangDetail {
  position: string;
  guaName: string;
  guaXiang: string;
  wuXing: string;
  meaning: string;
}

export interface ShengKeItem {
  from: string;
  to: string;
  relation: string;
  meaning: string;
}

export interface DuanGuaTip {
  scenario: string;
  principle: string;
  example: string;
}
