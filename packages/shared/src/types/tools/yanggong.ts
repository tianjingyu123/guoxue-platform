// ── 杨公风水共享类型 ──

export interface YangGongInput {
  sitting: string;
  period?: number;
}

export interface MountainInfo {
  name: string;
  degree: string;
  sector: string;
  element: string;
  dragon: string;
  isZhengShen: boolean;
  isLingShen: boolean;
}

export interface YangGongResult {
  sitting: string;
  facing: string;
  period: number;
  periodDesc: string;
  sittingSector: string;
  facingSector: string;
  sittingDragon: string;
  facingDragon: string;
  mountains: MountainInfo[];
  zhengShen: { direction: string; sector: string; advice: string };
  lingShen: { direction: string; sector: string; advice: string };
  chengMen: string[];
  wangShan: string[];
  wangXiang: string[];
  shuaiShan: string[];
  fortune: {
    overall: string;
    wealth: string;
    health: string;
    career: string;
    advice: string;
  };
  summary: string;
}
