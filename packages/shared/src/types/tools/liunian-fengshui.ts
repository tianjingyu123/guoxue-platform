// ── 流年风水方位共享类型 ──

export interface LiuNianFengShuiInput {
  year?: number;
  zuoXiang?: string;
  mingGua?: string;
}

export interface LiuNianFengShuiResult {
  year: number;
  yearGanZhi: string;
  feiXing: LiuNianFeiXing[];
  jiXiongFangWei: JiXiongFangWei[];
  summary: string;
}

export interface LiuNianFeiXing {
  star: number;
  name: string;
  wuXing: string;
  gongWei: string;
  direction: string;
  level: "吉" | "平" | "凶";
  effect: string;
  advice: string;
}

export interface JiXiongFangWei {
  name: string;
  direction: string;
  type: "财位" | "桃花位" | "文昌位" | "病符位" | "是非位" | "五黄煞";
  level: string;
  activation: string;
  taboos: string[];
}
