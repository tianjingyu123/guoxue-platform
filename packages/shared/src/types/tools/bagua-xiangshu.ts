// ── 八卦象数疗法共享类型 ──

export type SymptomCategory = string;

export interface BaGuaXiangShuInput {
  symptom: SymptomCategory;
  description?: string;
  duration?: string;
}

export interface XiangShuFormula {
  guaName: string;
  guaNumber: number;
  element: string;
  organ: string;
  baseFormula: string;
  meaning: string;
}

export interface BaGuaXiangShuResult {
  input: BaGuaXiangShuInput;
  primaryFormula: XiangShuFormula;
  supplementaryFormulas: XiangShuFormula[];
  fullFormula: string;
  usage: { method: string; duration: string; timeOfDay: string; posture: string; frequency: string };
  mechanism: string;
  precautions: string[];
}
