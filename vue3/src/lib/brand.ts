/**
 * 平台品牌常量（单一事实来源，从原型 lib/brand.ts 迁移）
 * 所有品牌露出（海报/分享/证书/页脚/扫码入口）统一引用，确保口径一致。
 */
export const BRAND = {
  name: '热卜国学',
  nameShort: '热卜',
  nameEn: 'REBU',
  slogan: '探寻东方智慧',
  sloganAlt: '观天地 · 明心性',
  tagline: '国学知识平台',
  copyright: '热卜国学 · 让国学回归生活',
  qrGuide: '长按识别 · 开启国学之旅',
} as const
