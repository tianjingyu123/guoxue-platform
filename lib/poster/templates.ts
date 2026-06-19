// 国风海报模板规格 —— 3 套主题变体，数据驱动渲染引擎。
import type { PosterTheme } from '@/lib/poster/render-engine'

// 典雅红：故宫红横幅 + 宣纸底，最正统、最具仪式感
export const THEME_ELEGANT_RED: PosterTheme = {
  id: 'elegant-red',
  name: '典雅红',
  bg: '#FAF8F5',
  paper: '#FAF8F5',
  ink: '#2B2B2B',
  inkSoft: '#8A8378',
  brand: '#C41E3A',
  gold: '#C9A96E',
  headerStyle: 'solid',
}

// 水墨白：水墨晕染顶饰 + 留白，清雅、文人气
export const THEME_INK_WHITE: PosterTheme = {
  id: 'ink-white',
  name: '水墨白',
  bg: '#F7F5F0',
  paper: '#F7F5F0',
  ink: '#1F1F1F',
  inkSoft: '#9A9488',
  brand: '#C41E3A',
  gold: '#B8995A',
  headerStyle: 'wash',
}

// 鎏金黑：深墨底 + 鎏金线，高端、尊贵，适合会员/名片
export const THEME_GOLD_DARK: PosterTheme = {
  id: 'gold-dark',
  name: '鎏金黑',
  bg: '#161310',
  paper: '#1C1812',
  ink: '#F5F0E8',
  inkSoft: '#A89B82',
  brand: '#C41E3A',
  gold: '#D4B068',
  headerStyle: 'dark',
}

export const POSTER_THEMES: PosterTheme[] = [
  THEME_ELEGANT_RED,
  THEME_INK_WHITE,
  THEME_GOLD_DARK,
]

export function getThemeById(id: string): PosterTheme {
  return POSTER_THEMES.find((t) => t.id === id) || THEME_ELEGANT_RED
}

// 海报标准尺寸（竖版分享卡）
export const POSTER_SIZE = { width: 375, height: 667 }
