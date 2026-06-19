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

/** 生成 svg data URI。color 默认故宫红，lucide 描边宽度默认 2。
 *  filled=true 时 lucide 图标用 color 填充（如点赞/收藏的实心态，对应原型 fill-[color]）。 */
export function iconDataUri(name: string, color = '#c41e3a', strokeWidth = 2, filled = false): string {
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
