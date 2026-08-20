/**
 * 图标提取脚本（构建期工具，不参与运行时）
 *
 * 目的：把原型图标 SVG 1:1 提取为跨端可用注册表，供 AppIcon 经 image+dataURI 渲染。
 *  1) 工具图标(tool)：components/paipan/icons/tool-icons.tsx 的自定义 SVG（48x48，
 *     含 rect/line/circle/path + currentColor + fillOpacity，须完整提取 body 才能高保真）。
 *  2) 通用图标(lucide)：node_modules/lucide-react/dist/esm/icons/<name>.js 的 __iconNode。
 * 产物：apps/mobile/src/lib/icons-registry.ts -> { name: { body, kind?, viewBox? } }
 * 运行：node apps/mobile/scripts/gen-icons.mjs （仓库根执行）
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../../../')
const TOOL_ICONS_SRC = resolve(REPO_ROOT, 'v0-reference/components/paipan/icons/tool-icons.tsx')
const LUCIDE_DIR = resolve(REPO_ROOT, 'node_modules/lucide-react/dist/esm/icons')
const OUT = resolve(REPO_ROOT, 'apps/mobile/src/lib/icons-registry.ts')

const LUCIDE_NAMES = [
  'history', 'chevron-right', 'chevron-down', 'chevron-up', 'sparkles', 'stethoscope',
  'home', 'users', 'shopping-bag', 'user', 'graduation-cap', 'book-open', 'radio',
  'compass', 'layout-grid', 'bot', 'book-heart', 'more-horizontal', 'search', 'bell',
  'info', 'shield-alert', 'heart-pulse', 'map-pin', 'clock', 'folder', 'zap', 'chevron-left', 'check', 'share-2', 'pencil', 'x', 'arrow-left', 'star', 'clock-3',
  'plus', 'trash-2',
  'settings', 'mic', 'mic-off', 'image', 'play', 'pause', 'square', 'calendar',
  'message-square', 'trending-up', 'crown', 'flame', 'award',
  'file-text', 'heart', 'message-circle', 'pin', 'shield', 'bookmark', 'check-circle', 'lock', 'eye',
  'send', 'at-sign', 'volume-2', 'gift', 'camera', 'video', 'globe', 'coins', 'audio-lines',
  'bar-chart-3', 'more-vertical', 'save', 'alert-triangle',
  'trophy', 'medal',
  'log-out', 'trending-down', 'inbox',
  'tag', 'refresh-cw', 'activity', 'dollar-sign',
  'x-circle',
  'copy', 'ban', 'user-plus', 'edit', 'qr-code',
  'percent', 'target', 'link-2', 'toggle-left', 'toggle-right', 'eye',
  'thumbs-up', 'phone', 'phone-incoming', 'phone-outgoing',
  'shield-check',
  'scroll-text',
  'ticket', 'wallet', 'package', 'truck', 'sticky-note', 'clipboard-list', 'help-circle', 'calendar-check',
  'wind', 'badge-check', 'arrow-up',
  'headphones', 'phone-off', 'phone-call', 'volume-2', 'volume-x', 'lightbulb', 'wifi', 'wifi-off', 'loader',
  'shopping-cart', 'minus', 'circle', 'alert-circle', 'filter', 'star-half',
  'layers', 'grid', 'credit-card', 'smartphone', 'edit-2', 'store', 'repeat',
  'arrow-right', 'undo-2', 'building-2', 'mail', 'download',
  'eye-off', 'user-x', 'hard-drive', 'type', 'moon', 'key', 'monitor',
  'arrow-up-right', 'external-link', 'folder-pen',
  'shuffle', 'loader-2',
  'mountain', 'leaf', 'pen-tool', 'book-marked',
  'skip-back', 'skip-forward', 'maximize', 'minimize', 'picture-in-picture-2', 'list',
  'landmark',
  'check-circle-2', 'grip-vertical',
  'image-plus', 'zoom-in',
  'highlighter', 'pen-line',
  'bookmark-check', 'sun',
]

function jsxAttrToHtml(attr) {
  const map = {
    strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin',
    strokeOpacity: 'stroke-opacity', strokeDasharray: 'stroke-dasharray',
    fillOpacity: 'fill-opacity', fillRule: 'fill-rule', clipRule: 'clip-rule',
    clipPath: 'clip-path', strokeMiterlimit: 'stroke-miterlimit',
  }
  return map[attr] || attr
}

function normalizeJsxSvgBody(inner) {
  let s = inner
  s = s.replace(/\s+className=("[^"]*"|\{[^}]*\})/g, '')
  s = s.replace(/\b([a-z]+[A-Z][a-zA-Z]*)=/g, (m, name) => `${jsxAttrToHtml(name)}=`)
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function extractToolIcons() {
  const src = readFileSync(TOOL_ICONS_SRC, 'utf8')
  const result = {}
  const re = /"([a-z0-9-]+)":\s*\(\)\s*=>\s*\(\s*(<svg[\s\S]*?<\/svg>)\s*\)/g
  let m
  while ((m = re.exec(src)) !== null) {
    const id = m[1]
    const svg = m[2]
    const vbMatch = svg.match(/viewBox="([^"]+)"/)
    const viewBox = vbMatch ? vbMatch[1] : '0 0 48 48'
    const innerMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)
    if (!innerMatch) continue
    const body = normalizeJsxSvgBody(innerMatch[1])
    if (!result[id]) {
      const entry = { body, kind: 'tool' }
      if (viewBox !== '0 0 48 48') entry.viewBox = viewBox
      result[id] = entry
    }
  }
  return result
}

function extractLucide(name, _depth = 0) {
  if (_depth > 3) return null
  const file = resolve(LUCIDE_DIR, `${name}.js`)
  if (!existsSync(file)) return null
  const src = readFileSync(file, 'utf8')
  // 跟随 re-export 别名： export { default } from './house.js';
  const reexport = src.match(/export\s*\{\s*default\s*\}\s*from\s*'\.\/([a-zA-Z0-9-]+)\.js'/)
  if (reexport) return extractLucide(reexport[1], _depth + 1)
  const arrMatch = src.match(/__iconNode\s*=\s*(\[[\s\S]*?\]);/)
  if (!arrMatch) return null
  // lucide 属性是 JS 对象字面量（键无引号），非合法 JSON；元组/属性可能跨行，用 [\s\S] 容错
  const tupleRe = /\[\s*"([a-zA-Z]+)"\s*,\s*\{([\s\S]*?)\}\s*\]/g
  const attrRe = /([a-zA-Z0-9_-]+):\s*"([^"]*)"/g
  const parts = []
  let t
  while ((t = tupleRe.exec(arrMatch[1])) !== null) {
    const tag = t[1]
    const attrs = []
    let a
    while ((a = attrRe.exec(t[2])) !== null) {
      if (a[1] === 'key') continue
      attrs.push(`${a[1]}="${a[2]}"`)
    }
    parts.push(`<${tag} ${attrs.join(' ')}/>`)
  }
  if (parts.length === 0) return null
  return { body: parts.join('') }
}

function readExistingRegistry() {
  if (!existsSync(OUT)) return {}
  const source = readFileSync(OUT, 'utf8')
  const declaration = source.indexOf('export const ICON_REGISTRY')
  const jsonStart = source.indexOf('{', declaration)
  if (declaration < 0 || jsonStart < 0) return {}
  return JSON.parse(source.slice(jsonStart).trim())
}

function compactEntry(entry) {
  const kind = entry.kind === 'tool' ? 'tool' : undefined
  const defaultViewBox = kind === 'tool' ? '0 0 48 48' : '0 0 24 24'
  const result = { body: entry.body }
  if (kind) result.kind = kind
  if (entry.viewBox && entry.viewBox !== defaultViewBox) result.viewBox = entry.viewBox
  return result
}

function main() {
  const existing = readExistingRegistry()
  const registry = Object.fromEntries(
    Object.entries(existing).map(([name, entry]) => [name, compactEntry(entry)]),
  )
  const tools = extractToolIcons()
  for (const [name, entry] of Object.entries(tools)) {
    if (registry[name]?.kind === 'tool') registry[name] = compactEntry(entry)
  }
  const toolCount = Object.keys(tools).length
  let lucideOk = 0
  const lucideMiss = []
  for (const name of LUCIDE_NAMES) {
    const r = extractLucide(name)
    if (r) {
      if (registry[name]) registry[name] = compactEntry(r)
      lucideOk++
    } else if (registry[name]) {
      lucideOk++
    } else {
      lucideMiss.push(name)
    }
  }
  const header = `/**
 * 图标注册表（自动生成，请勿手改）
 * 由 apps/mobile/scripts/gen-icons.mjs 从原型 tool-icons.tsx 与 lucide-react 提取。
 * 重新生成：node apps/mobile/scripts/gen-icons.mjs
 * kind='tool'：原型自定义 SVG；缺省 kind 为 lucide。
 * 两类默认画布分别为 48x48 和 24x24，仅非默认画布写入 viewBox，减少小程序主包体积。
 */
export interface IconEntry { body: string; kind?: 'tool'; viewBox?: string }

export const ICON_REGISTRY: Record<string, IconEntry> = `
  writeFileSync(OUT, header + JSON.stringify(registry, null, 2) + '\n', 'utf8')
  console.log('[gen-icons] tool icons: ' + toolCount)
  console.log('[gen-icons] lucide icons: ' + lucideOk + '/' + LUCIDE_NAMES.length + (lucideMiss.length ? ' (miss: ' + lucideMiss.join(', ') + ')' : ''))
  console.log('[gen-icons] total entries: ' + Object.keys(registry).length)
  console.log('[gen-icons] written -> ' + OUT)
}

main()
