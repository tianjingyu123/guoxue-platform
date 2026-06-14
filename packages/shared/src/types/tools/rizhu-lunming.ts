// ── 日柱论命类型 ──
// 六十甲子日柱详解：每柱独立性格/事业/婚姻/健康分析

export interface RiZhuLunMingInput {
  /** 日柱干支（如"甲子"） */
  dayPillar: string;
  /** 性别 */
  gender?: "男" | "女";
}

export interface RiZhuDetail {
  /** 日柱干支 */
  ganZhi: string;
  /** 日干 */
  gan: string;
  /** 日支 */
  zhi: string;
  /** 纳音 */
  naYin: string;
  /** 日干五行 */
  ganWuXing: string;
  /** 日支五行 */
  zhiWuXing: string;
  /** 十神（日干坐支） */
  shiShen: string;
  /** 日柱特征标签 */
  tags: string[];
  /** 性格特征 */
  character: string;
  /** 事业财运 */
  career: string;
  /** 婚姻感情 */
  marriage: string;
  /** 健康状况 */
  health: string;
  /** 日柱吉凶 */
  jiXiong: "上等" | "中等" | "下等";
  /** 综合评分(1-100) */
  score: number;
  /** 适合行业 */
  suitableJobs: string[];
  /** 注意事项 */
  cautions: string[];
}

export interface RiZhuLunMingResult {
  /** 当前日柱 */
  current: RiZhuDetail;
  /** 日柱总论 */
  summary: string;
  /** 六十甲子速查表 */
  allPillars: { ganZhi: string; naYin: string; jiXiong: string; score: number }[];
}
