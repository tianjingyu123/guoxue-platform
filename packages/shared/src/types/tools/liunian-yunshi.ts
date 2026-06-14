/** 流年运势精批 — 共享类型 */

export interface LiuNianYunShiInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  /** 目标流年年份 */
  targetYear: number;
}

export interface LiuNianYunShiResult {
  /** 流年干支 */
  liuNianPillar: string;
  /** 流年纳音 */
  naYin: string;
  /** 流年十神 */
  shiShen: string;
  /** 流年神煞 */
  shenSha: LiuNianShenSha[];
  /** 各维度评分(0-100) */
  scores: {
    事业: number;
    财运: number;
    感情: number;
    健康: number;
    综合: number;
  };
  /** 逐月运势 */
  monthly: LiuNianMonthly[];
  /** 宜忌 */
  advice: { suitable: string[]; avoid: string[] };
  /** 详细断语 */
  analysis: string;
}

export interface LiuNianShenSha {
  name: string;
  type: "吉" | "凶" | "中性";
  meaning: string;
}

export interface LiuNianMonthly {
  month: number;
  ganZhi: string;
  score: number;
  highlight: string;
}
