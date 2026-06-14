// ── 六亲详解类型 ──
// 八字六亲（祖上/父母/兄弟/夫妻/子女）十神定位+旺衰分析

export interface LiuQinXiangJieInput {
  gender: "男" | "女";
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface LiuQinRelation {
  /** 六亲名称 */
  name: string;
  /** 十神定位 */
  shiShen: string;
  /** 宫位 */
  gongWei: string;
  /** 对应的四柱 */
  pillar: string;
  /** 干支 */
  ganZhi: string;
  /** 旺衰判断 */
  wangShuai: "旺" | "平" | "衰" | "缺";
  /** 五行关系 */
  wuXingRel: string;
  /** 吉凶简评 */
  jiXiong: "吉" | "平" | "凶";
  /** 详细解读 */
  analysis: string;
}

export interface LiuQinXiangJieResult {
  dayMaster: string;
  gender: "男" | "女";
  /** 六亲列表 */
  relations: LiuQinRelation[];
  /** 十神速查 */
  shiShenMap: Record<string, string>;
  /** 六亲宫位对应 */
  gongWeiMap: Record<string, { qin: string; pillar: string; ganZhi: string }>;
  /** 综合分析 */
  analysis: string;
}
