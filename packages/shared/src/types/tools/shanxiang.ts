// ── 山向地图（风水地图工具）共享类型 ──

/** 地图标注类型 */
export type MapMarkerType = "building" | "mountain" | "water" | "road" | "bridge" | "temple";

// ── 输入 ──

export interface ShanXiangMapInput {
  /** 中心点经度 */
  longitude: number;
  /** 中心点纬度 */
  latitude: number;
  /** 建筑朝向角度（0-360） */
  direction: number;
  /** 地图缩放级别 */
  zoom?: number;
  /** 是否叠加二十四山 */
  showShanOverlay: boolean;
  /** 是否叠加九宫格 */
  showJiuGong: boolean;
  /** 建造年份（用于飞星叠加） */
  buildYear?: number;
}

// ── 周边环境分析 ──

export interface SurroundingAnalysis {
  /** 方位 */
  direction: string;
  /** 角度范围 */
  degreeRange: string;
  /** 环境要素 */
  elements: {
    type: MapMarkerType;
    name: string;
    distance: number;
    desc: string;
  }[];
  /** 风水影响 */
  fengShuiEffect: string;
  /** 吉凶 */
  jiXiong: "吉" | "凶" | "平";
}

// ── 输出 ──

export interface ShanXiangMapResult {
  input: ShanXiangMapInput;

  /** 坐向分析 */
  shanXiang: {
    zuoShan: string;
    chaoXiang: string;
    degree: number;
    sanYuanLong: string;
  };

  /** 八方环境分析 */
  surroundings: SurroundingAnalysis[];

  /** 形势派分析 */
  xingShi: {
    /** 龙（来龙方位） */
    long: string;
    /** 砂（砂手情况） */
    sha: string;
    /** 水（水法） */
    shui: string;
    /** 穴（穴位评价） */
    xue: string;
    /** 向（朝向评价） */
    xiang: string;
  };

  /** 综合断语 */
  duanYu: string;
}
