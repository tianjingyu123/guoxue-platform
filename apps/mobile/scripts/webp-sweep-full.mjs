// T1a 主包瘦身：src/static 全量 WebP 化 + 超大图重压 + 全库引用同步改写
// 冻结域：tabbar/（微信 tabbar icon 不支持 webp）
// 用法：node scripts/webp-sweep-full.mjs
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs'
import { join, dirname, extname } from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const STATIC = join(ROOT, 'src/static')
const SRC = join(ROOT, 'src')
const BACKUP = join(ROOT, '.backup/static-t1a-20260705')
const Q = 80
const RECOMPRESS_WEBP_KB = 80 // 已是 webp 但超此值的重压（限宽 750）
const kb = (n) => (n / 1024).toFixed(0) + 'KB'

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else files.push(p)
  }
  return files
}

const all = walk(STATIC).filter((p) => !p.includes(`${'tabbar'}`) || !p.replace(STATIC, '').includes('tabbar'))
const rel = (p) => p.replace(STATIC + '\\', '').replace(STATIC + '/', '').replace(/\\/g, '/')

// 1) 备份
mkdirSync(BACKUP, { recursive: true })
for (const f of walk(STATIC)) {
  const dst = join(BACKUP, rel(f))
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(f, dst)
}
console.log(`已全量备份 src/static 到 .backup/static-t1a-20260705`)

let before = 0, after = 0
const renames = [] // [oldRel, newRel]

for (const f of walk(STATIC)) {
  const r = rel(f)
  if (r.startsWith('tabbar/')) continue
  const ext = extname(f).toLowerCase()
  const size = statSync(f).size
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    const buf = readFileSync(f)
    const out = await sharp(buf, { failOn: 'none' })
      .resize({ width: 750, withoutEnlargement: true })
      .webp({ quality: Q, effort: 6 })
      .toBuffer()
    const dst = f.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    writeFileSync(dst, out)
    rmSync(f)
    before += size; after += out.length
    renames.push([r, rel(dst)])
    console.log(`  ${kb(size)} -> ${kb(out.length)}  ${r}`)
  } else if (ext === '.webp' && size > RECOMPRESS_WEBP_KB * 1024) {
    const buf = readFileSync(f)
    const out = await sharp(buf, { failOn: 'none' })
      .resize({ width: 750, withoutEnlargement: true })
      .webp({ quality: 75, effort: 6 })
      .toBuffer()
    if (out.length < size * 0.85) {
      writeFileSync(f, out)
      before += size; after += out.length
      console.log(`  重压 ${kb(size)} -> ${kb(out.length)}  ${r}`)
    }
  }
}
console.log(`\n图片处理小计: ${kb(before)} -> ${kb(after)}，净省 ${kb(before - after)}`)

// 2) 全库引用改写（.vue/.ts/.scss/.json）：精确按转换清单逐条替换
const codeFiles = walk(SRC).filter((p) => /\.(vue|ts|scss|json)$/.test(p) && !p.includes('node_modules'))
let changedFiles = 0
for (const cf of codeFiles) {
  let text = readFileSync(cf, 'utf8')
  let dirty = false
  for (const [o, n] of renames) {
    if (text.includes('static/' + o)) {
      text = text.split('static/' + o).join('static/' + n)
      dirty = true
    }
  }
  if (dirty) { writeFileSync(cf, text); changedFiles++ }
}
console.log(`引用改写完成：${renames.length} 个文件重命名，${changedFiles} 个代码文件更新`)

// 3) 终态体积
let total = 0
for (const f of walk(STATIC)) total += statSync(f).size
console.log(`src/static 终态总体积: ${(total / 1024 / 1024).toFixed(2)} MB`)
