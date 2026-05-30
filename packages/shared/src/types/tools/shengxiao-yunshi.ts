// ── 生肖运势 共享类型 ──

export type ShengXiao = "鼠" | "牛" | "虎" | "兔" | "龙" | "蛇" | "马" | "羊" | "猴" | "鸡" | "狗" | "猪";

export interface ShengXiaoYunshiInput {
  shengXiao?: ShengXiao;
  birthYear?: number;
  date?: string;
}

export interface YunshiScores {
  total: number;
  career: number;
  wealth: number;
  love: number;
  health: number;
}

export interface ShengXiaoYunshiResult {
  input: ShengXiaoYunshiInput;
  shengXiao: ShengXiao;
  date: string;
  yearZhi: string;
  taiSuiRelation: string;
  scores: YunshiScores;
  lucky: {
    color: string;
    number: number;
    direction: string;
    partner: ShengXiao;
  };
  yiJi: { yi: string[]; ji: string[] };
  summary: string;
}
