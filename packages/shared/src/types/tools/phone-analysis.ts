// ── 手机号码分析共享类型 ──
// 数字能量学+五行+八卦+号码磁场

/** 磁场类型 */
export type CiChangType =
  | "天医" | "延年" | "生气" | "伏位"
  | "绝命" | "五鬼" | "六煞" | "祸害";

/** 数字五行 */
export type NumWuXing = "金" | "木" | "水" | "火" | "土";

// ── 输入 ──

export interface PhoneAnalysisInput {
  /** 手机号码 */
  phone: string;
  /** 分析体系 */
  system: "energy" | "wuxing" | "bagua" | "all";
  /** 机主生辰（可选，用于匹配） */
  birthday?: string;
  /** 性别 */
  gender?: "male" | "female";
}

// ── 数字对组合 ──

export interface NumberPair {
  /** 数字对 */
  pair: string;
  /** 磁场类型 */
  ciChang: CiChangType;
  /** 吉凶 */
  jiXiong: "大吉" | "吉" | "平" | "凶" | "大凶";
  /** 含义 */
  meaning: string;
  /** 位置权重 */
  weight: number;
}

// ── 五行分析 ──

export interface PhoneWuXing {
  /** 各数字五行统计 */
  distribution: Record<NumWuXing, number>;
  /** 主导五行 */
  dominant: NumWuXing;
  /** 缺失五行 */
  missing: NumWuXing[];
  /** 与机主八字五行匹配度 */
  matchScore?: number;
  /** 分析 */
  desc: string;
}

// ── 输出 ──

export interface PhoneAnalysisResult {
  input: PhoneAnalysisInput;

  /** 号码拆解 */
  breakdown: {
    /** 运营商段 */
    carrier: string;
    /** 归属地 */
    location: string;
    /** 尾号 */
    tail: string;
  };

  /** 数字对分析 */
  pairs: NumberPair[];

  /** 五行分析 */
  wuXing: PhoneWuXing;

  /** 磁场总评 */
  ciChangSummary: {
    /** 主磁场 */
    main: CiChangType;
    /** 磁场强度分布 */
    distribution: { type: CiChangType; count: number; weight: number }[];
    /** 吉凶比 */
    jiXiongRatio: string;
  };

  /** 号码总评分 */
  totalScore: number;

  /** 各维度评分 */
  scores: {
    /** 事业 */
    career: number;
    /** 财运 */
    wealth: number;
    /** 感情 */
    love: number;
    /** 健康 */
    health: number;
    /** 人际 */
    social: number;
  };

  /** 综合断语 */
  duanYu: string;
}
