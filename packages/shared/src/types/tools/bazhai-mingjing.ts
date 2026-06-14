// ── 八宅明镜进阶共享类型 ──

export interface BaZhaiMingJingInput {
  mingGua?: string;
  zuoXiang?: string;
  menWei?: string;
  chuangWei?: string;
  zaoWei?: string;
}

export interface BaZhaiMingJingResult {
  mingGua: DongXiMingGuaInfo;
  zhainanAnalysis: ZhaiNanDetail[];
  neiBuJu: NeiBuJuGuide;
  summary: string;
}

export interface DongXiMingGuaInfo {
  gua: string;
  group: "东四命" | "西四命";
  wuXing: string;
  luckyDirections: string[];
  unluckyDirections: string[];
  description: string;
}

export interface ZhaiNanDetail {
  type: string;
  name: string;
  youXiang: string;
  suitable: string;
  taboos: string[];
  cure: string;
}

export interface NeiBuJuGuide {
  men: string;
  zhu: string;
  zao: string;
  chuang: string;
  principles: string[];
}
