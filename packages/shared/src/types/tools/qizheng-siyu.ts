/** 七政四余星盘 */

export interface QiZhengSiYuInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  gender?: "男" | "女";
}

export interface PlanetPosition {
  planet: string;
  xiu: string;
  degree: number;
  house: string;
  meaning: string;
}

export interface QiZhengSiYuResult {
  /** 命宫 */
  mingGong: string;
  /** 命度 */
  mingDu: string;
  /** 七政位置（日月水金火木土） */
  sevenStars: PlanetPosition[];
  /** 四余位置（紫气/月孛/罗睺/计都） */
  fourRemainders: PlanetPosition[];
  /** 十二宫分布 */
  houses: string[];
  /** 综合解读 */
  analysis: string;
}
