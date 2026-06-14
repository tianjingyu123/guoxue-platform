// ── 阳宅三要类型 ──
// 门主灶互生克 + 八宅游年

export interface YangZhaiSanYaoInput {
  /** 大门方位，如 "震"（东） */
  door: string;
  /** 主卧方位，如 "离"（南） */
  master: string;
  /** 厨房方位，如 "坎"（北） */
  kitchen: string;
  /** 宅主命卦(可选)，如 "1-坎" */
  hostMingGua?: string;
  /** 年份(用于三元九运参考) */
  year?: number;
}

export interface YangZhaiSanYaoResult {
  /** 宅型：东四宅/西四宅 */
  zhaiType: "东四宅" | "西四宅";
  zhaiGua: string;
  /** 门主灶各要素 */
  elements: {
    door: YangZhaiElement;
    master: YangZhaiElement;
    kitchen: YangZhaiElement;
  };
  /** 门主关系 */
  doorMaster: YangZhaiRelation;
  /** 门灶关系 */
  doorKitchen: YangZhaiRelation;
  /** 主灶关系 */
  masterKitchen: YangZhaiRelation;
  /** 综合评分 0-100 */
  score: number;
  /** 综合评分明细 */
  scoreDetail?: YangZhaiScoreDetail;
  /** 三元九运参考 */
  periodRef?: string;
  suggestions: string[];
  analysis: string;
}

export interface YangZhaiElement {
  name: string;
  direction: string;
  trigram: string;
  wuXing: string;
  dongXi: "东四" | "西四";
  gongWei: string;
  luoShuNumber: number;
}

export interface YangZhaiRelation {
  pairs: string;
  relation: string;
  /** 八宅游年：生气/天医/延年/伏位/绝命/五鬼/祸害/六煞 */
  youNian: string;
  jiXiong: "吉" | "凶" | "小吉" | "小凶";
  wuXingInteraction: string;
  description: string;
  /** 布局建议 */
  layoutTip?: string;
  /** 化解/优化方法 */
  remedy?: string;
}

export interface YangZhaiScoreDetail {
  doorMaster: number;
  doorKitchen: number;
  masterKitchen: number;
  zhaiMingMatch: number;
  total: number;
}
