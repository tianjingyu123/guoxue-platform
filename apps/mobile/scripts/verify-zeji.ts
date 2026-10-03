/**
 * 择吉引擎黄金回归（第 16 套防线）
 *
 * 择吉是「拿黄历筛日子」，所以正确性的判据只有一条：
 *   推荐出来的每一天，点进黄历必须真的宜此事、且不忌此事。
 * 一旦有人改坏打分或筛选逻辑，最坏的后果是推荐一个黄历白纸黑字写着「忌嫁娶」的日子
 * 去办喜事 —— 对自称行业权威的平台，这种错误不能有。
 *
 * 这里把择吉结果与黄历（buildAlmanac，日视图同一份数据源）逐条对撞。
 */
import { ZEJI_CATEGORIES, pickAuspiciousDays, findEventByTerm } from '../src/pkg-paipan/lib/zeji-engine'
import { buildAlmanac } from '../src/pkg-paipan/lib/wannianli-engine'

let pass = 0
let fail = 0
const errs: string[] = []

function check(cond: boolean, msg: string) {
  if (cond) pass++
  else {
    fail++
    errs.push(msg)
  }
}

// ── 1. 每个事项的推荐日，必须与黄历宜忌逐字一致 ──
for (const cat of ZEJI_CATEGORIES) {
  for (const ev of cat.events) {
    const days = pickAuspiciousDays({ terms: ev.terms, days: 180, limit: 30 })
    for (const d of days) {
      const a = buildAlmanac(d.date)
      const yi = a.day.yi.map((x) => x.text)
      const ji = a.day.ji.map((x) => x.text)

      check(
        ev.terms.some((t) => yi.includes(t)),
        `${ev.label} 推荐 ${d.solarText}，但黄历「宜」里没有 ${ev.terms.join('/')}（宜：${yi.join(' ')}）`,
      )
      check(
        !ev.terms.some((t) => ji.includes(t)),
        `🔴 ${ev.label} 推荐了 ${d.solarText}，但黄历「忌」里写着 ${ev.terms.join('/')}！（忌：${ji.join(' ')}）`,
      )
    }
  }
}

// ── 2. 白话别名必须映射得到（开业/搬家/签约 在黄历里没有这三个词） ──
for (const [label, expect] of [
  ['开业', '开市'],
  ['搬家', '移徙'],
  ['签约', '立券'],
] as const) {
  const e = findEventByTerm(label)
  check(!!e && e.terms.includes(expect), `白话「${label}」应映射到黄历用语「${expect}」，实际：${e?.terms.join('/') ?? '未找到'}`)
  const days = pickAuspiciousDays({ terms: e?.terms ?? [], days: 180, limit: 5 })
  check(days.length > 0, `「${label}」半年内应能找到吉日，实际 0 个（别名映射失效会导致一条都命中不了）`)
}

// ── 3. 黄历宜忌点击联动：黄历里的词要能找回择吉事项 ──
for (const term of ['嫁娶', '开市', '祭祀', '动土', '入宅', '出行']) {
  check(!!findEventByTerm(term), `黄历用语「${term}」应能映射回择吉事项（否则点宜忌跳择日会没反应）`)
}

// ── 4. 排序：吉度必须降序；首选分数不低于末位 ──
for (const ev of [ZEJI_CATEGORIES[0].events[0], ZEJI_CATEGORIES[1].events[2]]) {
  const days = pickAuspiciousDays({ terms: ev.terms, days: 180, limit: 20 })
  for (let i = 1; i < days.length; i++) {
    check(days[i - 1].score >= days[i].score, `${ev.label} 结果未按吉度降序：第${i}名 ${days[i - 1].score} < 第${i + 1}名 ${days[i].score}`)
  }
  for (const d of days) {
    check(d.score >= 1 && d.score <= 100, `${ev.label} ${d.solarText} 吉度 ${d.score} 越界（应在 1–100）`)
    check(d.reasons.length > 0, `${ev.label} ${d.solarText} 没有给出推荐理由（择吉不做黑箱评分）`)
  }
}

console.log(`择吉黄金回归：${pass} 通过 / ${fail} 失败`)
if (errs.length) {
  console.log('\n失败明细（最多 10 条）：')
  errs.slice(0, 10).forEach((e) => console.log('  ' + e))
  process.exit(1)
}
