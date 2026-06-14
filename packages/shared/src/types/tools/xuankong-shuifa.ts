// ── 玄空水法类型 ──
// 玄空城门诀 + 零正催照水法 + 三阳五会

export interface XuanKongShuiFaInput {
  /** 坐山（如"子"） */
  zuoShan: string;
  /** 朝向（如"午"） */
  chaoXiang: string;
  /** 地运年份 */
  year?: number;
}

export interface XuanKongShuiFaResult {
  zuoShan: string;
  chaoXiang: string;
  /** 当前地运 */
  diYun: number;
  /** 零正神方位 */
  lingShen: { direction: string; zhi: string; gongWei: string; description: string };
  zhengShen: { direction: string; zhi: string; gongWei: string; description: string };
  zhaoShen: { direction: string; zhi: string; gongWei: string; description: string };
  cuiShen: { direction: string; zhi: string; gongWei: string; description: string };
  /** 城门诀 */
  chengMenJue: {
    zhengChengMen: { direction: string; zhi: string; gongWei: string; condition: string };
    fuChengMen: { direction: string; zhi: string; gongWei: string; condition: string };
    description: string;
  };
  /** 三阳五会 */
  sanYangWuHui: {
    sanYang: { direction: string; zhi: string; description: string }[];
    wuHui: { direction: string; zhi: string; description: string }[];
  };
  /** 水法吉凶断 */
  shuiFaJiXiong: { direction: string; zhi: string; jiXiong: "吉" | "凶" | "平"; description: string }[];
  suggestions: string[];
  analysis: string;
}
