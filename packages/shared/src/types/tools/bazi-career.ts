// ── 八字事业方向/择业共享类型 ──

export interface BaziCareerInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  gender?: "男" | "女";
}

export interface BaziCareerResult {
  summary: string;
  riZhuAnalysis: RiZhuCareerInfo;
  yongShenCareer: YongShenCareerInfo;
  suitableCareers: CareerItem[];
  unsuitableCareers: CareerItem[];
  caiYunAnalysis: CaiYunInfo;
}

export interface RiZhuCareerInfo {
  riZhu: string;
  wuXing: string;
  personality: string;
  careerStyle: string;
}

export interface YongShenCareerInfo {
  yongShen: string;
  xiShen: string;
  jiShen: string;
  careerDirection: string;
}

export interface CareerItem {
  industry: string;
  category: string;
  fitLevel: "极佳" | "良好" | "可尝试";
  reason: string;
}

export interface CaiYunInfo {
  mainSource: string;
  peakPeriod: string;
  advice: string;
}
