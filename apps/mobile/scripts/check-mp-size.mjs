// T1a 防回潮：小程序包体积检查（微信上限 2MB，主包警戒线 1.8MB）
// 用法：build:mp-weixin 后 node scripts/check-mp-size.mjs（超限 exit 1）
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const DIST = join(process.cwd(), 'dist/build/mp-weixin')
const MAIN_LIMIT_MB = 1.8
const SUBPACKAGE_LIMIT_MB = 1.95

function sizeOf(dir) {
  let total = 0
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) total += sizeOf(p)
    else total += statSync(p).size
  }
  return total
}

let main = 0
const subs = []
for (const name of readdirSync(DIST)) {
  const p = join(DIST, name)
  const isDir = statSync(p).isDirectory()
  if (isDir && name.startsWith('pkg-')) {
    subs.push([name, sizeOf(p)])
  } else {
    main += isDir ? sizeOf(p) : statSync(p).size
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(2)
console.log(`主包: ${mb(main)} MB（上限 2MB·警戒 ${MAIN_LIMIT_MB}MB）`)
console.log(`分包共 ${subs.length} 个，最大: ${subs.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, s]) => `${n}=${mb(s)}MB`).join(' ')}`)
if (main > MAIN_LIMIT_MB * 1024 * 1024) {
  console.error(`❌ 主包超过警戒线 ${MAIN_LIMIT_MB}MB！新增图片>50KB 必须走 COS，本地图必须 WebP（见 docs/knowledge/项目Prompt知识库.md）`)
  process.exit(1)
}
const oversizedSubpackage = subs.find(([, size]) => size > SUBPACKAGE_LIMIT_MB * 1024 * 1024)
if (oversizedSubpackage) {
  console.error(`❌ 分包 ${oversizedSubpackage[0]} 超过警戒线 ${SUBPACKAGE_LIMIT_MB}MB（当前 ${mb(oversizedSubpackage[1])}MB）`)
  process.exit(1)
}
console.log('✅ 主包及分包体积达标')
