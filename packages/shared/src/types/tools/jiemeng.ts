// ── 周公解梦 共享类型 ──

export type JieMengCategory =
  | "动物"
  | "人物"
  | "天地"
  | "身体"
  | "器物"
  | "水火"
  | "食物"
  | "建筑"
  | "行为"
  | "鬼神"
  | "丧葬"
  | "植物"
  | "自然";

export type JieMengOmen = "吉" | "凶" | "平";

export interface JieMengEntry {
  keyword: string;
  category: JieMengCategory;
  omen: JieMengOmen;
  meaning: string;
}

export interface JieMengInput {
  dream: string;
}

export interface JieMengMatch {
  keyword: string;
  category: JieMengCategory;
  omen: JieMengOmen;
  meaning: string;
  /** 匹配置信度 0-1 */
  confidence: number;
}

export interface JieMengResult {
  input: JieMengInput;
  matches: JieMengMatch[];
  overall: {
    omen: JieMengOmen;
    summary: string;
    jiCount: number;
    xiongCount: number;
    pingCount: number;
  };
}
