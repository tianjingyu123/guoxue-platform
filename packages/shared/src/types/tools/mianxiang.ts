// ── 面相分析（麻衣神相·五官十二宫）共享类型 ──

export type FaceShape = "金形面" | "木形面" | "水形面" | "火形面" | "土形面";
export type ForeheadType = "宽阔" | "狭窄" | "适中";
export type ForeheadLineCount = "无" | "一条" | "两条" | "三条以上";
export type EyeShape = "丹凤眼" | "桃花眼" | "圆眼" | "细长眼" | "三角眼" | "大小眼";
export type EyebrowShape = "剑眉" | "弯眉" | "一字眉" | "八字眉" | "柳叶眉" | "浓眉" | "淡眉";
export type NoseShape = "悬胆鼻" | "鹰钩鼻" | "蒜头鼻" | "狮子鼻" | "露孔鼻" | "直鼻";
export type MouthShape = "四字口" | "仰月口" | "覆船口" | "樱桃口" | "吹火口";
export type EarShape = "贴脑耳" | "兜风耳" | "垂珠耳" | "反骨耳" | "无轮耳";
export type EarPosition = "高" | "中" | "低";
export type BoneType = "高耸" | "适中" | "低平";
export type ChinShape = "圆润" | "尖" | "方" | "短" | "长";
export type MoleLocation = "none" | "额头" | "眉心" | "眼角" | "鼻头" | "脸颊" | "嘴角" | "下巴";
export type SanTingType = "均衡" | "上停长" | "中停长" | "下停长";
export type Complexion = "红润" | "白净" | "黄" | "青" | "黑";

export interface MianXiangInput {
  gender: "男" | "女";
  age?: number;
  faceShape: FaceShape;
  foreheadType: ForeheadType;
  foreheadLines: ForeheadLineCount;
  eyebrowShape: EyebrowShape;
  eyeShape: EyeShape;
  noseShape: NoseShape;
  mouthShape: MouthShape;
  earShape: EarShape;
  earPosition: EarPosition;
  cheekboneType: BoneType;
  chinShape: ChinShape;
  notableMoles: MoleLocation;
  sanTing: SanTingType;
  complexion: Complexion;
}

export interface MianXiangDimension {
  score: number;
  level: string;
  traits: string[];
  desc: string;
}

export interface FeatureDetail {
  name: string;
  category: string;
  value: string;
  meaning: string;
  fortune: string;
}

export interface MianXiangResult {
  input: MianXiangInput;
  meta: {
    faceShapeName: string;
    faceShapeElement: string;
    faceShapeDesc: string;
    sanTingDesc: string;
    ageGroup: string;
  };
  overallScore: number;
  overallLevel: string;
  overview: string;
  personality: MianXiangDimension;
  career: MianXiangDimension;
  wealth: MianXiangDimension;
  love: MianXiangDimension;
  health: MianXiangDimension;
  features: FeatureDetail[];
  twelvePalaces: { name: string; status: string; desc: string }[];
  advice: string[];
}
