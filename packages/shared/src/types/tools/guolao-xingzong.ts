/** 果老星宗星命 */

export interface GuoLaoXingZongInput {
  year: number;
  month: number;
  day: number;
  gender: "男" | "女";
}

export interface GuoLaoStarPosition {
  star: string;
  xiu: string;
  degree: number;
  meaning: string;
}

export interface GuoLaoXingZongResult {
  /** 太阳宫位 */
  riGong: string;
  /** 月亮宫位 */
  yueGong: string;
  /** 命度主 */
  mingDu: string;
  /** 身度主 */
  shenDu: string;
  /** 二十八宿分布 */
  starPositions: GuoLaoStarPosition[];
  /** 综合解读 */
  analysis: string;
}
