/**
 * 八字四柱·三方交叉对拍（2026-07-14）
 *
 * 背景：C 端存在两套八字实现——
 *   A 前端 pkg-paipan/lib/bazi-engine.ts（computeBazi）：姓名解析 / 阴盘命理奇门 / 合盘在用
 *   B 后端 packages/bazi-engine（calcSiZhu）：八字排盘页经 /paipan/bazi/calculate 在用
 * 二者日柱基准、真太阳时公式、节气算法均为独立实现，此前从无双向对拍。
 * 本脚本以 lunar-typescript 为第三方裁判，三方逐柱对拍，重点打易错边界。
 *
 * 运行：npx tsx scripts/verify-bazi-cross.ts
 */
import { computeBazi } from '../src/pkg-paipan/lib/bazi-engine'
import { calcSiZhu } from '../../../packages/bazi-engine/src/index'
import { Solar } from '../src/pkg-paipan/lib/lunar/index.js'

interface Case { y: number; m: number; d: number; h: number; mi: number; note: string }

/** 前端引擎四柱 */
function frontPillars(c: Case): string[] {
  const b = computeBazi({
    name: 'T', gender: '男',
    year: c.y, month: c.m, day: c.d, hour: c.h, minute: c.mi,
    useTrueSolar: false,
  })
  return [
    b.siZhu.year.gan + b.siZhu.year.zhi,
    b.siZhu.month.gan + b.siZhu.month.zhi,
    b.siZhu.day.gan + b.siZhu.day.zhi,
    b.siZhu.hour.gan + b.siZhu.hour.zhi,
  ]
}

/** 后端引擎四柱 */
function backPillars(c: Case): string[] {
  const s = calcSiZhu({
    name: 'T', gender: '男' as never,
    year: c.y, month: c.m, day: c.d, hour: c.h, minute: c.mi,
    useTrueSolarTime: false,
  })
  return [
    s.nian.gan + s.nian.zhi,
    s.yue.gan + s.yue.zhi,
    s.ri.gan + s.ri.zhi,
    s.shi.gan + s.shi.zhi,
  ]
}

/**
 * lunar-typescript 裁判：一律用 Exact 系列（精确到节气交接的「时刻」）。
 * 注意别用 getYearInGanZhiByLiChun()——那个按立春「当日」分界，不看具体时刻，
 * 会在立春当天出现整日的年柱偏差（本脚本初版即因此误报 17 处）。
 */
function refPillars(c: Case): string[] {
  const lunar = Solar.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0).getLunar()
  return [
    lunar.getYearInGanZhiExact(),
    lunar.getMonthInGanZhiExact(),
    lunar.getDayInGanZhiExact(),
    lunar.getTimeInGanZhi(),
  ]
}

const NAMES = ['年柱', '月柱', '日柱', '时柱']

const cases: Case[] = []

// ① 常规随机样本（1930-2025，覆盖各月各时辰）
let seed = 20260714
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
for (let i = 0; i < 400; i++) {
  const y = 1930 + Math.floor(rnd() * 96)
  const m = 1 + Math.floor(rnd() * 12)
  const d = 1 + Math.floor(rnd() * 28)
  const h = Math.floor(rnd() * 24)
  const mi = Math.floor(rnd() * 60)
  cases.push({ y, m, d, h, mi, note: '随机' })
}

// ② 立春分界（换年的关键边界）：每年立春前后各取几个时刻
for (const y of [1950, 1984, 2000, 2024, 2025, 2026]) {
  for (const d of [3, 4, 5]) {
    for (const h of [0, 5, 12, 23]) {
      cases.push({ y, m: 2, d, h, mi: 30, note: '立春分界' })
    }
  }
}

// ③ 晚子时（23:00-23:59，日柱是否换日的两派分歧点）
for (const y of [1960, 1990, 2010, 2024]) {
  for (const m of [1, 6, 12]) {
    cases.push({ y, m, d: 15, h: 23, mi: 30, note: '晚子时' })
    cases.push({ y, m, d: 15, h: 0, mi: 15, note: '早子时' })
  }
}

// ④ 节气换月分界（每月交节日附近）
for (const y of [1985, 2005, 2025]) {
  for (let m = 1; m <= 12; m++) {
    for (const d of [5, 6, 7, 20, 21, 22]) {
      cases.push({ y, m, d, h: 12, mi: 0, note: '交节分界' })
    }
  }
}

let ab = 0, ar = 0, br = 0
const abFails: string[] = []
const arFails: string[] = []
const brFails: string[] = []

for (const c of cases) {
  const tag = `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')} ${String(c.h).padStart(2, '0')}:${String(c.mi).padStart(2, '0')} [${c.note}]`
  let F: string[], B: string[], R: string[]
  try {
    F = frontPillars(c); B = backPillars(c); R = refPillars(c)
  } catch (e) {
    abFails.push(`${tag} 计算异常: ${(e as Error).message}`)
    continue
  }
  for (let i = 0; i < 4; i++) {
    if (F[i] !== B[i]) abFails.push(`${tag} ${NAMES[i]}: 前端=${F[i]} 后端=${B[i]}`)
    else ab++
    if (F[i] !== R[i]) arFails.push(`${tag} ${NAMES[i]}: 前端=${F[i]} lunar=${R[i]}`)
    else ar++
    if (B[i] !== R[i]) brFails.push(`${tag} ${NAMES[i]}: 后端=${B[i]} lunar=${R[i]}`)
    else br++
  }
}

const total = cases.length * 4
const show = (list: string[], n = 8) => list.slice(0, n).map((s) => '    ' + s).join('\n')

console.log(`样本 ${cases.length} 例 × 4 柱 = ${total} 项\n`)
console.log(`前端 vs 后端  : ${ab}/${total} 一致，${abFails.length} 处不一致`)
if (abFails.length) console.log(show(abFails) + (abFails.length > 8 ? `\n    …共 ${abFails.length} 处` : ''))
console.log(`前端 vs lunar : ${ar}/${total} 一致，${arFails.length} 处不一致`)
if (arFails.length) console.log(show(arFails) + (arFails.length > 8 ? `\n    …共 ${arFails.length} 处` : ''))
console.log(`后端 vs lunar : ${br}/${total} 一致，${brFails.length} 处不一致`)
if (brFails.length) console.log(show(brFails) + (brFails.length > 8 ? `\n    …共 ${brFails.length} 处` : ''))

const bad = abFails.length + arFails.length + brFails.length
console.log(bad === 0 ? '\n✅ 三方完全一致' : `\n⚠️ 合计 ${bad} 处分歧`)
process.exit(0)
