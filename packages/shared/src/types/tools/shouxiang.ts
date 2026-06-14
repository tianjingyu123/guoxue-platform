// ── 手相分析（掌纹诊病·手型论命）共享类型 ──

/** 手型（五行手型分类） */
export type HandType = "金形手" | "木形手" | "水形手" | "火形手" | "土形手";

/** 掌形 */
export type PalmShape = "方形" | "长方形" | "圆形" | "三角形";

/** 手指长度 */
export type FingerLength = "长" | "中等" | "短";

/** 指形 */
export type FingerShape = "尖细" | "粗短" | "匀称";

/** 主线特征 */
export type LineFeature = "深长" | "浅短" | "断续" | "岛纹" | "锁链" | "双线" | "分叉" | "下垂" | "平直" | "弯曲" | "波浪" | "上翘" | "单条清晰" | "多条" | "无";

/** 掌丘饱满度 */
export type HillStatus = "饱满" | "适中" | "平坦";

/** 掌色 */
export type PalmColor = "红润" | "白" | "黄" | "青";

/** 掌质 */
export type PalmTexture = "柔嫩" | "粗糙" | "适中";

export interface ShouXiangInput {
  gender: "男" | "女";
  age?: number;
  handType: HandType;
  palmShape: PalmShape;
  fingerLength: FingerLength;
  fingerShape: FingerShape;
  lifeLine: LineFeature;
  wisdomLine: LineFeature;
  emotionLine: LineFeature;
  fateLine: LineFeature;
  marriageLine: LineFeature;
  jupiterHill: HillStatus;
  saturnHill: HillStatus;
  apolloHill: HillStatus;
  mercuryHill: HillStatus;
  venusHill: HillStatus;
  marsHill: HillStatus;
  moonHill: HillStatus;
  palmColor: PalmColor;
  palmTexture: PalmTexture;
}

export interface ShouXiangDimension {
  score: number;
  level: string;
  traits: string[];
  desc: string;
}

export interface LineDetail {
  name: string;
  feature: string;
  meaning: string;
  fortune: string;
}

export interface HillDetail {
  name: string;
  status: string;
  meaning: string;
  fortune: string;
}

export interface ShouXiangResult {
  input: ShouXiangInput;
  meta: {
    handTypeName: string;
    handTypeElement: string;
    handTypeDesc: string;
    leftRight: string;
  };
  overallScore: number;
  overallLevel: string;
  overview: string;
  personality: ShouXiangDimension;
  health: ShouXiangDimension;
  career: ShouXiangDimension;
  love: ShouXiangDimension;
  wealth: ShouXiangDimension;
  lines: LineDetail[];
  hills: HillDetail[];
  advice: string[];
}
