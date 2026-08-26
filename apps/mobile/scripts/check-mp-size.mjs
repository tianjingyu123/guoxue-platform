// T1a 防回潮：小程序包体积检查（微信上限 2MB，主包警戒线 1.8MB）
// 用法：build:mp-weixin 后 node scripts/check-mp-size.mjs（超限 exit 1）
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const DIST = join(process.cwd(), 'dist/build/mp-weixin')
const MAIN_LIMIT_MB = 1.8
const SUBPACKAGE_LIMIT_MB = 1.95
// 2026-08-26 微信 CLI 真实 upload 实测：平台的 main package source size 比
// 本地文件求和高约 280 KiB，且 preview 统计仍可能低于 upload 的最终口径。
// 这里按 288 KiB 保守估算，并强制预留 80 KiB；真实上传仍是最终发布门禁。
const UPLOAD_SOURCE_LIMIT_BYTES = 2 * 1024 * 1024
const UPLOAD_SOURCE_PLATFORM_OVERHEAD_BYTES = 288 * 1024
const UPLOAD_SOURCE_RESERVED_BYTES = 80 * 1024
// 微信开发者工具的平台计数会高于本地文件求和。2026-08-26 实测
// pkg-paipan 高约 0.17 MiB，因此对该核心大包保留至少约 0.20 MiB 的平台余量。
const PACKAGE_SPECIFIC_LIMIT_MB = new Map([['pkg-paipan', 1.75]])

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
const estimatedUploadSourceSize = main + UPLOAD_SOURCE_PLATFORM_OVERHEAD_BYTES
console.log(`微信真实上传口径保守估算: ${mb(estimatedUploadSourceSize)} MB（强制余量 ${mb(UPLOAD_SOURCE_RESERVED_BYTES)} MB）`)
console.log(`分包共 ${subs.length} 个，最大: ${subs.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, s]) => `${n}=${mb(s)}MB`).join(' ')}`)
if (main > MAIN_LIMIT_MB * 1024 * 1024) {
  console.error(`❌ 主包超过警戒线 ${MAIN_LIMIT_MB}MB！新增图片>50KB 必须走 COS，本地图必须 WebP（见 docs/knowledge/项目Prompt知识库.md）`)
  process.exit(1)
}
if (estimatedUploadSourceSize > UPLOAD_SOURCE_LIMIT_BYTES - UPLOAD_SOURCE_RESERVED_BYTES) {
  console.error(`❌ 微信真实 upload 主包估算余量不足：本地 ${mb(main)}MB + 平台开销 ${mb(UPLOAD_SOURCE_PLATFORM_OVERHEAD_BYTES)}MB，必须至少保留 ${mb(UPLOAD_SOURCE_RESERVED_BYTES)}MB`)
  process.exit(1)
}
const oversizedSubpackage = subs.find(([name, size]) => {
  const limit = PACKAGE_SPECIFIC_LIMIT_MB.get(name) ?? SUBPACKAGE_LIMIT_MB
  return size > limit * 1024 * 1024
})
if (oversizedSubpackage) {
  const limit = PACKAGE_SPECIFIC_LIMIT_MB.get(oversizedSubpackage[0]) ?? SUBPACKAGE_LIMIT_MB
  console.error(`❌ 分包 ${oversizedSubpackage[0]} 超过警戒线 ${limit}MB（当前 ${mb(oversizedSubpackage[1])}MB）`)
  process.exit(1)
}
console.log('✅ 主包及分包体积达标')
