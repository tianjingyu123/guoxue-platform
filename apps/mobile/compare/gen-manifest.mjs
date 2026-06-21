#!/usr/bin/env node
/**
 * 迁移真源清单生成 / 校验脚本
 * ------------------------------------------------------------------
 * 目的：彻底杜绝跨窗口的"迁移统计漂移"。
 *   - 任何窗口都【只读 migration-manifest.json】判断迁移进度，
 *     不再各自裸扫文件系统、各自推导清单（那是历史误判的根源）。
 *   - 本脚本是唯一允许重新推导清单的地方，规则固定、可复现。
 *
 * 真源判定规则（与团队约定一致）：
 *   1. 扫描原型 app/**\/page.tsx 得到所有路由。
 *   2. 自动识别并排除"旧版桩"：文件内容含 `redirect(` 或
 *      `export { default }`（re-export 转发）。这类页是历史遗留的
 *      运行时跳转壳，不是业务页，永不计入待迁。
 *   3. 其余为"规范业务页"。与 route-map.json 已登记的 proto 归一化
 *      比对：命中=done(已迁)，未命中=pending(待迁)。
 *   4. 动态段（[id] / :id / 纯数字）统一归一化为 :p 再比对，
 *      避免 `/circles/1/booking` 与 `/circles/[id]/booking` 误判。
 *
 * 用法：
 *   node vue3/compare/gen-manifest.mjs            # 生成/更新 manifest
 *   node vue3/compare/gen-manifest.mjs --check    # 仅校验，过期则非零退出(CI用)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..') // vue3/compare -> repo root
const APP_DIR = join(REPO_ROOT, 'app')
const ROUTE_MAP = join(__dirname, 'route-map.json')
const MANIFEST = join(__dirname, 'migration-manifest.json')
const SKIP_LIST = join(__dirname, 'skip-routes.json')

const checkOnly = process.argv.includes('--check')

/** 把路由归一化：动态段统一成 :p，便于两侧比对 */
function normalize(route) {
  return route
    .split('/')
    .map((seg) => {
      if (!seg) return seg
      if (seg.startsWith('[') || seg.startsWith(':')) return ':p'
      if (/^\d+$/.test(seg)) return ':p'
      return seg
    })
    .join('/')
}

/** 递归收集 app 下所有 page.tsx，返回 {route, file} 列表 */
function collectPages(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collectPages(full))
    } else if (name === 'page.tsx') {
      let route = '/' + relative(APP_DIR, dir).split('\\').join('/')
      if (route === '/.') route = '/'
      out.push({ route, file: full })
    }
  }
  return out
}

/** 判断是否旧版桩：含 redirect( 或 re-export 转发 */
function isLegacyStub(file) {
  const src = readFileSync(file, 'utf8')
  if (/export\s*\{\s*default\s*\}/.test(src)) return 'reexport'
  if (/\bredirect\s*\(/.test(src)) return 'redirect'
  return null
}

function build() {
  if (!existsSync(APP_DIR)) {
    console.error('[manifest] 找不到 app 目录:', APP_DIR)
    process.exit(2)
  }

  // 1. 原型路由
  const pages = collectPages(APP_DIR)

  // 1b. 人工策展跳过清单（整页形式、脚本无法自动判定的非业务/冗余页）
  const skipMap = new Map() // normalized -> reason
  if (existsSync(SKIP_LIST)) {
    const skipJson = JSON.parse(readFileSync(SKIP_LIST, 'utf8'))
    for (const s of skipJson.skip || []) {
      if (s && s.route) skipMap.set(normalize(s.route), s.reason || '人工策展跳过')
    }
  }

  // 2. route-map 已登记 proto（归一化集合）
  const routeMap = JSON.parse(readFileSync(ROUTE_MAP, 'utf8'))
  const entries = Array.isArray(routeMap) ? routeMap : routeMap.routes || routeMap.pairs || []
  const migratedSet = new Set()
  const vueByProto = new Map()
  for (const e of entries) {
    if (!e || !e.proto) continue
    const n = normalize(e.proto)
    migratedSet.add(n)
    if (e.vue) vueByProto.set(n, e.vue)
  }

  // 3. 分类
  const routes = []
  const skipped = []
  for (const { route, file } of pages) {
    const stub = isLegacyStub(file)
    const rel = relative(REPO_ROOT, file).split('\\').join('/')
    if (stub) {
      skipped.push({ proto: route, reason: stub === 'reexport' ? 're-export 转发桩(旧版)' : 'redirect 重定向桩(旧版)', file: rel })
      continue
    }
    const n = normalize(route)
    if (skipMap.has(n)) {
      skipped.push({ proto: route, reason: skipMap.get(n), file: rel })
      continue
    }
    const done = migratedSet.has(n)
    routes.push({ proto: route, normalized: n, status: done ? 'done' : 'pending', vue: vueByProto.get(n) || null })
  }

  routes.sort((a, b) => a.proto.localeCompare(b.proto))
  skipped.sort((a, b) => a.proto.localeCompare(b.proto))

  const done = routes.filter((r) => r.status === 'done').length
  const pending = routes.length - done

  const manifest = {
    $note: '迁移真源清单（机器生成，勿手改）。重新生成: node vue3/compare/gen-manifest.mjs',
    generatedAt: new Date().toISOString(),
    rules: {
      source: 'app/**/page.tsx',
      skipRule: '①内容含 redirect( 或 export { default } 的旧版桩自动排除；②skip-routes.json 人工策展的非业务/冗余整页排除',
      matchAgainst: 'vue3/compare/route-map.json 的 proto 字段(动态段归一化为 :p)',
    },
    summary: {
      totalCanonical: routes.length,
      done,
      pending,
      skippedLegacy: skipped.length,
    },
    pending: routes.filter((r) => r.status === 'pending').map((r) => r.proto),
    routes,
    skipped,
  }

  return manifest
}

const fresh = build()
const freshStr = JSON.stringify(fresh, null, 2) + '\n'

if (checkOnly) {
  if (!existsSync(MANIFEST)) {
    console.error('[manifest] --check 失败：manifest 不存在，请先生成。')
    process.exit(1)
  }
  const cur = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  // 忽略 generatedAt 比较其余内容
  const stripTime = (m) => JSON.stringify({ ...m, generatedAt: null })
  if (stripTime(cur) !== stripTime(fresh)) {
    console.error('[manifest] ✗ 过期：文件系统/route-map 已变化，请运行 node vue3/compare/gen-manifest.mjs 重新生成。')
    console.error(`  当前: done=${cur.summary?.done} pending=${cur.summary?.pending} skipped=${cur.summary?.skippedLegacy}`)
    console.error(`  最新: done=${fresh.summary.done} pending=${fresh.summary.pending} skipped=${fresh.summary.skippedLegacy}`)
    process.exit(1)
  }
  console.log('[manifest] ✓ 最新。', `done=${fresh.summary.done} pending=${fresh.summary.pending} skipped=${fresh.summary.skippedLegacy}`)
  process.exit(0)
}

writeFileSync(MANIFEST, freshStr)
console.log('[manifest] 已生成 migration-manifest.json')
console.log(`  规范业务页: ${fresh.summary.totalCanonical}`)
console.log(`  已迁(done): ${fresh.summary.done}`)
console.log(`  待迁(pending): ${fresh.summary.pending}`)
console.log(`  旧版桩(skipped): ${fresh.summary.skippedLegacy}`)
