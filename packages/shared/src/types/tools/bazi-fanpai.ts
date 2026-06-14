// ── 八字反推出生时辰共享类型 ──

export interface BaziFanPaiInput {
  year: number;
  month: number;
  day: number;
  knownPillars?: string[];
  lifeEvents?: LifeEventItem[];
  gender?: "男" | "女";
}

export interface BaziFanPaiResult {
  targetDate: string;
  candidates: ShiChenCandidate[];
  bestMatch: ShiChenCandidate | null;
  summary: string;
}

export interface LifeEventItem {
  year: number;
  event: string;
  category: string;
}

export interface ShiChenCandidate {
  shiChen: string;
  timeRange: string;
  hourPillar: string;
  fullBazi: string;
  score: number;
  reasoning: string;
}
