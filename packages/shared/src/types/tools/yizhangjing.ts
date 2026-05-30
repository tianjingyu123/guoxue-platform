// ── 达摩一掌经 共享类型 ──

export type LiuDao = "佛道" | "仙道" | "人道" | "阿修罗道" | "鬼道" | "畜生道";

export interface YiZhangJingInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: "男" | "女";
}

export interface DaoDetail {
  name: LiuDao;
  gongName?: string;
  element: string;
  nature: string;
  desc: string;
}

export interface YiZhangJingResult {
  input: YiZhangJingInput;
  lunarInfo: { year: string; month: number; day: number; shiChen: string };
  yearDao: DaoDetail;
  monthDao: DaoDetail;
  dayDao: DaoDetail;
  hourDao: DaoDetail;
  finalDao: DaoDetail;
  combination: string;
  fortune: {
    career: string;
    wealth: string;
    love: string;
    health: string;
    personality: string;
  };
  pastLife: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  summary: string;
}
