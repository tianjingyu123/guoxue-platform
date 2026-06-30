// 批量压缩 src/static 下的 PNG/JPG 图片
// 原则：保持文件名与格式不变；只在压缩后更小时才覆盖；备份已在 .backup/static-20260624
// 用法：node scripts/compress-images.mjs [--dry]
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import sharp from 'sharp'

const ROOT = join(process.cwd(), 'src/static')
const DRY = process.argv.includes('--dry')
const Q = 80

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, files)
    else files.push(p)
  }
  return files
}

const kb = (n) => (n / 1024).toFixed(0) + 'KB'
let before = 0, after = 0, changed = 0, skipped = 0, failed = 0
const bigSavings = []

const all = walk(ROOT).filter((f) => /\.(png|jpe?g)$/i.test(f))
console.log('扫描到 ' + all.length + ' 张图片，开始处理' + (DRY ? '（dry-run，不写入）' : '') + '...')

for (const f of all) {
  const ext = extname(f).toLowerCase()
  const orig = readFileSync(f)
  before += orig.length
  try {
    const img = sharp(orig, { failOn: 'none' })
    let out
    if (ext === '.png') {
      out = await img.png({ quality: Q, compressionLevel: 9, effort: 8, palette: true }).toBuffer()
    } else {
      out = await img.jpeg({ quality: Q, mozjpeg: true }).toBuffer()
    }
    if (out.length < orig.length * 0.98) {
      if (!DRY) writeFileSync(f, out)
      after += out.length
      changed++
      const saved = orig.length - out.length
      if (saved > 200 * 1024) bigSavings.push({ f: f.replace(ROOT, ''), from: orig.length, to: out.length })
    } else {
      after += orig.length
      skipped++
    }
  } catch (e) {
    after += orig.length
    failed++
    console.error('  FAIL ' + f.replace(ROOT, '') + ' - ' + e.message)
  }
}

console.log('--- Top 节省 ---')
bigSavings.sort((a, b) => (b.from - b.to) - (a.from - a.to)).slice(0, 12)
  .forEach((x) => console.log('  ' + kb(x.from) + ' -> ' + kb(x.to) + '  ' + x.f))

console.log('===== 汇总 =====')
console.log('处理: ' + changed + ' 压缩 | ' + skipped + ' 跳过 | ' + failed + ' 失败')
console.log('总体积: ' + kb(before) + ' -> ' + kb(after) + '  节省 ' + kb(before - after) + ' (' + ((1 - after / before) * 100).toFixed(1) + '%)')
