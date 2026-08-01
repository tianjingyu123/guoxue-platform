/**
 * 图标渲染（运行时）
 *
 * 数据来自 icons-registry.ts（由 scripts/gen-icons.mjs 从原型 1:1 提取）。
 * 小程序 wxml 不支持内联 <svg>，故统一渲染为 svg data URI，经 <image> 跨端显示。
 *
 * - kind='tool'  : 原型自定义 SVG，内部用 currentColor；把 currentColor 替换为目标色即 1:1 还原。
 *                  （保留 fill-opacity 等，视觉与原型一致）
 * - kind='lucide': 描边图标，外层 <svg> 注入 stroke / stroke-width / 线帽线接。
 */
import { ICON_REGISTRY, type IconEntry } from './icons-registry'

export type { IconEntry }

export function hasIcon(name: string): boolean {
  return !!ICON_REGISTRY[name]
}

/**
 * 把 CSS 变量色（如 var(--text-soft)）解析成十六进制。
 * 图标经 SVG data URI 渲染，SVG 内无法解析页面 CSS 变量 → 传 var() 会导致描边失效、图标隐形。
 * 故在此把常用主题变量映射为实际色值（取浅色模式基准）。未知 var 兜底中性灰。
 */
const CSS_VAR_HEX: Record<string, string> = {
  '--brand': '#c41e3a', '--gugong-red': '#c41e3a',
  '--gold': '#c9a96e', '--jewel-gold': '#c9a96e',
  '--text-strong': '#2c2c2c', '--text-ink': '#2c2c2c', '--ink': '#2c2c2c',
  '--text-secondary': '#666666', '--ink-2': '#666666',
  '--text-soft': '#999999', '--ink-3': '#999999',
  '--text-placeholder': '#cccccc',
  '--surface': '#ffffff', '--pure-white': '#ffffff',
}
function resolveColor(color: string): string {
  if (!color || color.indexOf('var(') < 0) return color
  const m = /var\(\s*(--[a-zA-Z0-9-]+)/.exec(color)
  return (m && CSS_VAR_HEX[m[1]]) || '#666666'
}

/** 生成 svg data URI。color 默认故宫红，lucide 描边宽度默认 2。
 *  filled=true 时 lucide 图标用 color 填充（如点赞/收藏的实心态，对应原型 fill-[color]）。 */
export function iconDataUri(name: string, color = '#c41e3a', strokeWidth = 2, filled = false): string {
  color = resolveColor(color) // var(--x) → hex，避免 SVG data URI 内 CSS 变量失效导致图标隐形
  const entry = ICON_REGISTRY[name]
  if (!entry) {
    // 缺失兜底：八卦默认图标（与原型 getToolIcon fallback 一致）
    const fb = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="1.5"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="4" fill="${color}"/></svg>`
    return `data:image/svg+xml,${encodeURIComponent(fb)}`
  }
  let svg: string
  if (entry.kind === 'tool') {
    // currentColor -> 目标色
    const body = entry.body.split('currentColor').join(color)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}" fill="none">${body}</svg>`
  } else {
    const fill = filled ? color : 'none'
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${entry.body}</svg>`
  }
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
