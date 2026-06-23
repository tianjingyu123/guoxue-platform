#!/usr/bin/env node
// 原型链接可达性排查：从真实底部 tab 入口 BFS 遍历 app/** 所有页面跳转，
// 找出"不可达孤儿页"(废弃候选) 与"新旧两套疑似重复"。
// 用法: node compare/audit-reachability.mjs   (在 vue3 目录下运行)
import fs from 'node:fs'
import path from 'node:path'

const APP = path.resolve(process.cwd(), '../app')

// 真实入口：底部 5 tab + 未登录入口 + 全局头部常驻入口
const ENTRIES = ['/', '/circles', '/paipan', '/discover', '/profile', '/login', '/register', '/forgot-password', '/search', '/messages', '/notifications']

// ---- 1. 收集所有页面路由 ----
const pages = [] // { route, file, normRoute }
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    const st = fs.statSync(fp)
    if (st.isDirectory()) walk(fp)
    else if (name === 'page.tsx') {
      let route = '/' + path.relative(APP, dir).split(path.sep).join('/')
      if (route === '/.') route = '/'
      pages.push({ route, file: fp })
    }
  }
}
walk(APP)

// 归一化动态段: [id] -> *, 纯数字段 -> *
const norm = (r) => r.replace(/\[[^\]]+\]/g, '*').replace(/\/\d+(?=\/|$)/g, '/*')
for (const p of pages) p.normRoute = norm(p.route)

// alias 页(仅 re-export)视为转发，不算独立内容
const isAlias = (txt) => /export\s*\{\s*default\s*\}\s*from/.test(txt) && txt.split('\n').length <= 6

// ---- 2. 提取每个页面的出链 ----
// 覆盖: JSX href=/to= 、对象属性 href:/path:/route:/url:/to:/link:/pathname: 、JS 赋值 href = 、push/replace/navigate/redirect()
const KEYS = '(?:href|to|path|route|url|link|pathname)'
const strRe = new RegExp(`\\b${KEYS}\\s*[:=]\\s*\\{?\\s*["']([^"'$]+)["']`, 'g')
const tplKeyRe = new RegExp(`\\b${KEYS}\\s*[:=]\\s*\\{?\\s*\`(\\/[^\`]*)\``, 'g')
const navRe = /(?:push|replace|navigate|redirect|prefetch)\(\s*["']([^"'$]+)["']/g
const navTplRe = /(?:push|replace|navigate|redirect)\(\s*`(\/[^`]*)`/g
const fileCache = {}
function readFile(f) { return fileCache[f] ??= fs.readFileSync(f, 'utf8') }
function outLinks(file) {
  const txt = readFile(file)
  const out = new Set()
  let m
  const add = (url) => { if (url && url.startsWith('/')) out.add(norm(url.split('?')[0].split('#')[0])) }
  while ((m = strRe.exec(txt))) add(m[1])
  while ((m = navRe.exec(txt))) add(m[1])
  while ((m = tplKeyRe.exec(txt))) add(m[1].replace(/\$\{[^}]+\}/g, '*').split('?')[0])
  while ((m = navTplRe.exec(txt))) add(m[1].replace(/\$\{[^}]+\}/g, '*').split('?')[0])
  return out
}

// route 索引(归一化)
const byNorm = new Map()
for (const p of pages) {
  if (!byNorm.has(p.normRoute)) byNorm.set(p.normRoute, [])
  byNorm.get(p.normRoute).push(p)
}
const matchPage = (link) => byNorm.get(link) || byNorm.get(link.replace(/\/$/, '')) || null

// ---- 3. BFS 可达性 ----
const reachable = new Set()
const queue = []
for (const e of ENTRIES) {
  const pg = matchPage(norm(e))
  if (pg) for (const x of pg) { reachable.add(x.route); queue.push(x) }
}
// 全局组件(components/**)链接到的页面视作可达(组件可能在任意页渲染), 大幅降低假阴性
const COMP = path.resolve(process.cwd(), '../components')
function walkComp(dir) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walkComp(fp)
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      for (const link of outLinks(fp)) {
        const targets = matchPage(link)
        if (targets) for (const t of targets) if (!reachable.has(t.route)) { reachable.add(t.route); queue.push(t) }
      }
    }
  }
}
walkComp(COMP)
while (queue.length) {
  const cur = queue.shift()
  for (const link of outLinks(cur.file)) {
    const targets = matchPage(link)
    if (targets) for (const t of targets) {
      if (!reachable.has(t.route)) { reachable.add(t.route); queue.push(t) }
    }
  }
}

// ---- 4. 输出 ----
const reach = pages.filter(p => reachable.has(p.route))
const orphans = pages.filter(p => !reachable.has(p.route))
const orphanReal = orphans.filter(p => !isAlias(readFile(p.file)))
const orphanAlias = orphans.filter(p => isAlias(readFile(p.file)))

console.log(`\n总页面: ${pages.length}  |  可达(活): ${reach.length}  |  不可达孤儿: ${orphans.length} (真实 ${orphanReal.length} / alias ${orphanAlias.length})`)

// 按一级目录分组孤儿
const group = {}
for (const p of orphanReal) {
  const top = p.route.split('/')[1] || '(root)'
  ;(group[top] ??= []).push(p.route)
}
console.log('\n===== 不可达孤儿页(真实内容, 废弃候选) 按一级目录 =====')
for (const [k, v] of Object.entries(group).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${k}] ${v.length}页`)
  for (const r of v.sort()) console.log('  ', r)
}

// 写 JSON 供后续脚本消费
fs.writeFileSync('compare/_audit-orphans.json', JSON.stringify({
  entries: ENTRIES, total: pages.length, reachable: reach.map(p => p.route).sort(),
  orphansReal: orphanReal.map(p => p.route).sort(), orphansAlias: orphanAlias.map(p => p.route).sort(),
}, null, 2))
console.log('\n(详单已写 compare/_audit-orphans.json)')
