/**
 * 排盘工具 — 全局颜色令牌 + 设计约束
 *
 * 所有排盘相关的前端代码，颜色/间距/字号必须从此文件引用。
 * 禁止在任何组件中硬编码色值。
 */

// ============================================================
// 五行色（功能性标注专用，不可用于装饰）
// ============================================================
// 对标问真/热卜行业标准色值
export const WUXING = {
  mu: '#07e930',   // 木 — 亮绿
  huo: '#d30505',  // 火 — 深红
  tu: '#8b6d03',   // 土 — 棕色
  jin: '#ef9104',  // 金 — 金色
  shui: '#2e83f6', // 水 — 蓝
} as const

export const WUXING_LABEL: Record<string, string> = {
  mu: '木',
  huo: '火',
  tu: '土',
  jin: '金',
  shui: '水',
}

// ============================================================
// 吉凶色
// ============================================================
export const JIXIONG = {
  ji: '#2E7D32',
  xiong: '#C62828',
  ping: '#616161',
} as const

// ============================================================
// 天干地支色映射
// ============================================================
export const TIANGAN_COLOR: Record<string, string> = {
  甲: WUXING.mu, 乙: WUXING.mu,
  丙: WUXING.huo, 丁: WUXING.huo,
  戊: WUXING.tu, 己: WUXING.tu,
  庚: WUXING.jin, 辛: WUXING.jin,
  壬: WUXING.shui, 癸: WUXING.shui,
}

export const DIZHI_COLOR: Record<string, string> = {
  寅: WUXING.mu, 卯: WUXING.mu,
  巳: WUXING.huo, 午: WUXING.huo,
  辰: WUXING.tu, 戌: WUXING.tu, 丑: WUXING.tu, 未: WUXING.tu,
  申: WUXING.jin, 酉: WUXING.jin,
  亥: WUXING.shui, 子: WUXING.shui,
}

/** 天干→五行 */
export const TIANGAN_WUXING: Record<string, string> = {
  甲: 'mu', 乙: 'mu',
  丙: 'huo', 丁: 'huo',
  戊: 'tu', 己: 'tu',
  庚: 'jin', 辛: 'jin',
  壬: 'shui', 癸: 'shui',
}

/** 地支→五行 */
export const DIZHI_WUXING: Record<string, string> = {
  寅: 'mu', 卯: 'mu',
  巳: 'huo', 午: 'huo',
  辰: 'tu', 戌: 'tu', 丑: 'tu', 未: 'tu',
  申: 'jin', 酉: 'jin',
  亥: 'shui', 子: 'shui',
}

// ============================================================
// 界面色
// ============================================================
export const UI_COLORS = {
  bg: '#F5F5F5',
  cardBg: '#FFFFFF',
  headerBg: '#FAFAFA',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textHint: '#999999',
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  brand: '#C41E3A',
  brandLight: '#FFF0F0',
  link: '#1890FF',
  warning: '#FAAD14',
} as const

// ============================================================
// 奇门盘面专用色
// ============================================================
export const QIMEN_COLORS = {
  gongBorder: '#333333',
  gongBg: '#FFF8E1',
  starColor: '#C62828',
  menColor: '#1565C0',
  shenColor: '#6A1B9A',
  emptyGong: '#F5F5F5',
  maStar: '#FF6D00',
} as const

// ============================================================
// 图表色
// ============================================================
export const CHART_COLORS = {
  series: [
    '#C41E3A', '#4CAF50', '#FF9800', '#2196F3',
    '#FFC107', '#9C27B0', '#00BCD4', '#795548',
    '#607D8B', '#E91E63',
  ],
  timeline: '#C41E3A',
} as const

// ============================================================
// 设计约束 — 间距（仅允许以下值）
// ============================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const

// ============================================================
// 设计约束 — 圆角
// ============================================================
export const RADIUS = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const

// ============================================================
// 设计约束 — 字号（参考 tailwind）
// ============================================================
export const FONT_SIZE = {
  xs: '12px',
  sm: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
} as const

// ============================================================
// 断点
// ============================================================
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const

// ============================================================
// 动画时长约束
// ============================================================
export const DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const

// ============================================================
// 工具函数
// ============================================================

/** 获取天干对应的五行颜色 */
export function getTianGanColor(gan: string): string {
  return TIANGAN_COLOR[gan] || UI_COLORS.textPrimary
}

/** 获取地支对应的五行颜色 */
export function getDiZhiColor(zhi: string): string {
  return DIZHI_COLOR[zhi] || UI_COLORS.textPrimary
}

/** 获取五行对应的颜色 */
export function getWuXingColor(wx: string): string {
  const key = Object.keys(WUXING_LABEL).find(k => WUXING_LABEL[k] === wx)
  if (key && key in WUXING) return WUXING[key as keyof typeof WUXING]
  return UI_COLORS.textPrimary
}

/** 获取五行对应的中文名 */
export function getWuXingLabel(key: string): string {
  return WUXING_LABEL[key] || key
}

/** 获取吉凶对应的颜色 */
export function getJiXiongColor(type: 'ji' | 'xiong' | 'ping'): string {
  return JIXIONG[type]
}

/** 获取天干对应的五行key */
export function getTianGanWuXing(gan: string): string {
  return TIANGAN_WUXING[gan] || ''
}

/** 获取地支对应的五行key */
export function getDiZhiWuXing(zhi: string): string {
  return DIZHI_WUXING[zhi] || ''
}
