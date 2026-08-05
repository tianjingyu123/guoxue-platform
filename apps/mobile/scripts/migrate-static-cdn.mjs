// T1a：五大图片目录引用改自有静态托管 URL + 清理本地已迁文件（poster-qrcode 留本地供 canvas 兜底）
import { readdirSync, statSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

const PUBLIC_ASSET_ORIGIN = String(process.env.PUBLIC_ASSET_ORIGIN || '').trim().replace(/\/+$/, '')
if (!PUBLIC_ASSET_ORIGIN) {
  throw new Error('请先设置 PUBLIC_ASSET_ORIGIN，再执行静态资源迁移')
}
const CDN = `${PUBLIC_ASSET_ORIGIN}/assets`
const DIRS = ['images', 'live', 'experts', 'marketing', 'discover']

function walk(d, out = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) { if (!p.includes('node_modules')) walk(p, out) }
    else if (/\.(vue|ts|scss)$/.test(n)) out.push(p)
  }
  return out
}

let changed = 0
for (const f of walk('src')) {
  let t = readFileSync(f, 'utf8')
  const b = t
  for (const dir of DIRS) t = t.split('/static/' + dir + '/').join(CDN + '/' + dir + '/')
  t = t.split(CDN + '/images/poster-qrcode.webp').join('/static/images/poster-qrcode.webp')
  if (t !== b) { writeFileSync(f, t); changed++ }
}
console.log('引用替换完成 ' + changed + ' 个文件')

function rmDir(d) {
  if (!existsSync(d)) return
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) rmDir(p)
    else if (!p.includes('poster-qrcode')) rmSync(p)
  }
}
for (const dir of DIRS) rmDir(join('src/static', dir))

let total = 0
function sz(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) sz(p); else total += statSync(p).size } }
sz('src/static')
console.log('本地 static 终态: ' + (total / 1024).toFixed(0) + ' KB')
