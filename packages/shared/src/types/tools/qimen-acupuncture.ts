// ── 奇门针灸共享类型 ──
// 基于阴盘奇门排盘结果，九宫→人体→穴位映射
// 参考：王凤麟道家奇门、奇门遁甲针灸应用

/** 人体部位 */
export type BodyPart =
  | "头部" | "颈部" | "面部" | "眼部" | "耳部" | "鼻部" | "口舌"
  | "咽喉" | "气管" | "肺部" | "心脏" | "乳房" | "肝胆"
  | "脾胃" | "肠道" | "肾脏" | "膀胱" | "生殖" | "子宫"
  | "卵巢" | "脊椎" | "背部" | "腰部" | "肋骨" | "腹部"
  | "手臂" | "手部" | "腿部" | "脚部" | "关节" | "皮肤"
  | "毛发" | "骨骼" | "血液" | "神经" | "血管"
  | "泌尿" | "肌肉" | "女性生殖" | "男性生殖"
  | "肝脏" | "胆囊" | "声带" | "食道" | "骨髓"
  | "大肠" | "小肠" | "牙齿" | "呼吸" | "中枢神经"
  | "左肋" | "右肋" | "右肩" | "右手" | "右腿" | "左腿";

/** 病症类型 */
export type SymptomType = "实症" | "虚症" | "寒症" | "热症" | "气滞" | "血瘀" | "痰湿" | "综合";

/** 针灸穴位 */
export interface AcuPoint {
  /** 穴位名称 */
  name: string;
  /** 所属经络 */
  meridian: string;
  /** 定位描述 */
  location: string;
  /** 针刺方法 */
  method: "毫针直刺" | "毫针斜刺" | "毫针平刺" | "艾灸" | "点刺出血" | "留针" | "温针灸";
  /** 深浅 */
  depth: string;
  /** 留针时间 */
  retention: string;
}

/** 九宫诊断结果 */
export interface GongDiagnosis {
  /** 宫位序号 */
  gongIndex: number;
  /** 宫位名称 */
  gongName: string;
  /** 对应人体部位 */
  bodyParts: BodyPart[];
  /** 主导病症 */
  mainSymptoms: string[];
  /** 严重程度 1-10 */
  severity: number;
  /** 虚实 */
  nature: SymptomType;
  /** 天干病机 */
  ganPathogenesis: string;
  /** 九星影响 */
  starInfluence: string;
  /** 八门影响 */
  menInfluence: string;
  /** 推荐穴位 */
  acuPoints: AcuPoint[];
}

/** 奇门针灸输入 */
export interface QiMenAcupunctureInput {
  /** 排盘日期时间 */
  datetime: string;
  /** 主诉病症（可选） */
  chiefComplaint?: string;
  /** 主诉部位（可选） */
  targetBodyPart?: BodyPart;
}

/** 奇门针灸结果 */
export interface QiMenAcupunctureResult {
  input: QiMenAcupunctureInput;
  /** 排盘信息 */
  panInfo: {
    juNumber: number;
    dunType: "yang" | "yin";
    yongShi: string;
    ziFu: string;
    zhiShiMen: string;
  };
  /** 九宫诊断 */
  diagnoses: GongDiagnosis[];
  /** 主病宫位（最严重/最相关） */
  primaryDiagnosis: GongDiagnosis;
  /** 综合针灸方案 */
  treatmentPlan: {
    /** 主穴 */
    mainPoints: AcuPoint[];
    /** 配穴 */
    auxiliaryPoints: AcuPoint[];
    /** 疗程建议 */
    courseSuggestion: string;
    /** 禁忌 */
    contraindications: string[];
  };
  /** 断语 */
  duanYu: string;
}
