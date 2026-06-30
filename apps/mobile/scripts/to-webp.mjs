// static PNG → WebP 转换 + 死资源清理
// 原则：先全量备份到 .backup，再转换白名单(有引用、非冻结域)，删除零引用死资源。
// 冻结域 marketing/course.png + luopan.png 不动（live-data 仍引用 .png）。
// 用法：node scripts/to-webp.mjs
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import sharp from 'sharp'

const STATIC = join(process.cwd(), 'src/static')
const BACKUP = join(process.cwd(), '.backup/static-webp-20260630')
const Q = 82

// 有引用、非冻结域 → 转 WebP（改引用后删 png）
const TO_WEBP = [
  'images/banners/banner-1.png', 'images/banners/banner-2.png', 'images/banners/banner-3.png',
  'discover/board-classics.png', 'discover/board-courses.png', 'discover/board-products.png', 'discover/board-circles.png',
  'images/poster-qrcode.png',
]
// 零引用死资源 → 直接删
const DEAD = [
  'badges/badge-1.png', 'badges/badge-2.png', 'badges/badge-3.png', 'badges/badge-4.png',
  'badges/badge-5.png', 'badges/badge-6.png', 'badges/badge-7.png', 'badges/badge-8.png',
  'images/station/share-poster.png',
]

const kb = (n) => (n / 1024).toFixed(0) + 'KB'

// 1) 全量备份所有 png（含冻结域，安全起见）
function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.png$/i.test(p)) files.push(p)
  }
  return files
}
const allPng = walk(STATIC)
mkdirSync(BACKUP, { recursive: true })
for (const f of allPng) {
  const rel = f.replace(STATIC + '\\', '').replace(STATIC + '/', '')
  const dst = join(BACKUP, rel)
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(f, dst)
}
console.log(`已备份 ${allPng.length} 个 png 到 .backup/static-webp-20260630`)

// 2) 转 WebP（生成 .webp，暂保留 png 待改引用后删）
let webpBefore = 0, webpAfter = 0
for (const rel of TO_WEBP) {
  const src = join(STATIC, rel)
  if (!existsSync(src)) { console.error('  缺失: ' + rel); continue }
  const orig = readFileSync(src)
  const out = await sharp(orig, { failOn: 'none' }).webp({ quality: Q, effort: 6 }).toBuffer()
  const dst = src.replace(/\.png$/i, '.webp')
  writeFileSync(dst, out)
  webpBefore += orig.length; webpAfter += out.length
  console.log(`  webp ${kb(orig.length)} -> ${kb(out.length)}  ${rel}`)
}
console.log(`WebP 小计: ${kb(webpBefore)} -> ${kb(webpAfter)} 省 ${kb(webpBefore - webpAfter)}`)

// 3) 删死资源
let deadSize = 0
for (const rel of DEAD) {
  const p = join(STATIC, rel)
  if (existsSync(p)) { deadSize += statSync(p).size; rmSync(p) }
}
console.log(`死资源已删: ${DEAD.length} 个，省 ${kb(deadSize)}`)
console.log(`\n总收益(死资源 + webp净省): ${kb(deadSize + (webpBefore - webpAfter))}`)
console.log('下一步：改引用 .png→.webp，验证后删原 png（备份在 .backup）')
