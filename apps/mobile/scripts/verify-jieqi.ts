// 二十四节气引擎黄金回归测试
//
// 交节时刻是节气页的命门（三候进度 / 倒计时 / 数九三伏 / 当前节气全依赖它），且节气还是
// 八字月柱的分界线——错一分钟，跨界那一刻的盘就全错。
//
// 验法：不写"我记得是几点几分"的锚点（凭记忆的锚点本身就不可信），改用**两套独立算法对撞**：
//   A. lunar-typescript（寿星天文历法，页面在用的引擎）
//   B. astronomy-engine（VSOP87 行星理论，本项目七政四余在用，与 A 完全独立）
// 节气 = 太阳视黄经每 15° 一个点（立春 315°、春分 0°、夏至 90°…）。用 B 求出黄经达标的瞬时，
// 与 A 给出的交节瞬时比对，两者独立实现却应吻合到分钟级。
//
// 运行：npx tsx scripts/verify-jieqi.ts

import { jieqiTableOfYear, currentJieqi, countdownText, beijingParts } from '../src/pkg-paipan/lib/jieqi-engine'
import { JIEQI_LIST, SEASON_META, jieqiInfoOf } from '../src/pkg-paipan/lib/jieqi-data'
import { jieqiCultureOf } from '../src/pkg-paipan/lib/jieqi-culture'
import { SEASON_EXERCISE, SEASON_EMOTION, SEASON_GOODS, SEASON_COURSES, marketingCopy, posterCopy } from '../src/pkg-paipan/lib/jieqi-recommend'
import * as Astronomy from '../src/pkg-paipan/lib/astronomy/index.js'

let pass = 0
let fail = 0
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++
  else {
    fail++
    console.log(`✗ ${name} ${detail}`)
  }
}
function eq(name: string, a: unknown, b: unknown) {
  ok(name, JSON.stringify(a) === JSON.stringify(b), `期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`)
}

/** 北京时间读数（跨时区安全，不受运行机器时区影响） */
function bjText(d: Date): string {
  const p = beijingParts(d)
  const z = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${z(p.m)}-${z(p.d)} ${z(p.hh)}:${z(p.mm)}`
}

/* ══════════ VSOP87 独立求解：太阳视黄经达到 lon° 的瞬时 ══════════ */
function sunApparentLon(t: Date): number {
  const sun = Astronomy.GeoVector(Astronomy.Body.Sun, t, true) // true = 修正光行差
  const ecl = Astronomy.Ecliptic(sun)
  return ((ecl.elon % 360) + 360) % 360
}
/** 二分法求太阳黄经首次达到 target 的瞬时（起止区间内单调） */
function solveSunLon(target: number, from: Date, to: Date): Date {
  const norm = (x: number) => ((x - target) % 360 + 540) % 360 - 180 // 与目标的带符号差，落在 (-180,180]
  let lo = from.getTime()
  let hi = to.getTime()
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (norm(sunApparentLon(new Date(mid))) < 0) lo = mid
    else hi = mid
  }
  return new Date((lo + hi) / 2)
}

console.log('═══ 一、交叉验证：lunar-typescript vs astronomy-engine(VSOP87) ═══')
console.log('   （两套独立天文算法，节气=太阳视黄经每 15°，容差 ±2 分钟）')
{
  const LON_OF: Record<string, number> = {}
  for (const j of JIEQI_LIST) LON_OF[j.name] = j.lon

  let worst = 0
  let worstName = ''
  let checked = 0
  for (const year of [1950, 1984, 2000, 2024, 2025, 2026, 2050, 2088]) {
    for (const t of jieqiTableOfYear(year)) {
      const target = LON_OF[t.name]
      // 在引擎给出的交节瞬时前后各 3 天内求解（区间内黄经单调递增约 6°）
      const from = new Date(t.date.getTime() - 3 * 86400000)
      const to = new Date(t.date.getTime() + 3 * 86400000)
      const vsop = solveSunLon(target, from, to)
      const diffMin = Math.abs(vsop.getTime() - t.date.getTime()) / 60000
      checked++
      if (diffMin > worst) {
        worst = diffMin
        worstName = `${year} ${t.name}`
      }
      if (diffMin > 2) {
        fail++
        console.log(`✗ ${year} ${t.name}：lunar=${bjText(t.date)} vs VSOP87=${bjText(vsop)}（差 ${diffMin.toFixed(2)} 分钟）`)
      } else {
        pass++
      }
    }
  }
  console.log(`   ${checked} 个交节点全部对撞完毕，最大偏差 ${worst.toFixed(2)} 分钟（${worstName}）`)
}

console.log('\n═══ 二、跨时区正确性（🔴 曾经的真 bug：交节被当成本机本地时间）═══')
{
  // 同一个绝对瞬时，在任何时区下算出的"当前节气"必须一致。
  // 修复前：引擎用 new Date(y,m-1,d,...) 按本机时区解释北京读数，本机 America/Los_Angeles 下整体偏 16 小时。
  const t = jieqiTableOfYear(2026).find((x) => x.name === '立春')!
  eq('2026 立春（北京时间读数）', bjText(t.date), '2026-02-04 04:02')

  // 交节前一分钟仍属大寒，后一分钟已属立春（绝对瞬时判定，与设备时区无关）
  const before = new Date(t.date.getTime() - 60000)
  const after = new Date(t.date.getTime() + 60000)
  eq('交节前 1 分钟仍属大寒', currentJieqi(before).current.name, '大寒')
  eq('交节后 1 分钟已属立春', currentJieqi(after).current.name, '立春')

  // 星期必须按北京日期算（不是设备本地日期）
  eq('2026 立春是周三', t.weekText, '周三')
}

console.log('\n═══ 三、年表完整性 ═══')
for (const y of [1900, 1949, 2000, 2026, 2050, 2099]) {
  const t = jieqiTableOfYear(y)
  ok(`${y} 年 24 个节气齐`, t.length === 24, `实际 ${t.length} 个`)
  let mono = true
  for (let i = 1; i < t.length; i++) {
    if (t[i].date.getTime() <= t[i - 1].date.getTime()) mono = false
  }
  ok(`${y} 年交节时刻严格递增`, mono) // 乱序会让「当前节气」判错
  ok(`${y} 年每节气都有资料`, t.every((x) => !!jieqiInfoOf(x.name)))
  ok(`${y} 年北京年份字段正确`, t.every((x) => x.year === y))
}

console.log('\n═══ 四、当前节气 / 候进度 ═══')
{
  const c = currentJieqi(new Date('2026-02-04T12:00:00+08:00'))
  eq('2026-02-04 12:00 当前节气', c.current.name, '立春')
  eq('下一节气', c.next.name, '雨水')
  ok('第几天在 1..dayTotal 内', c.dayIn >= 1 && c.dayIn <= c.dayTotal, `${c.dayIn}/${c.dayTotal}`)
  ok('候序在 1..3', c.houIndex >= 1 && c.houIndex <= 3, `${c.houIndex}`)
  ok('候名与候序对得上', c.houName === c.current.info.sanhou[c.houIndex - 1].name)
  ok('距下一节气为正', c.msToNext > 0)
  ok('进度在 0..1', c.progress >= 0 && c.progress <= 1)
}
{
  // 跨年：元旦处在上一年冬至的节气区间内
  const c = currentJieqi(new Date('2026-01-01T10:00:00+08:00'))
  eq('2026-01-01 当前节气', c.current.name, '冬至')
  eq('2026-01-01 下一节气', c.next.name, '小寒')
}

console.log('\n═══ 五、数九三伏 ═══')
{
  ok('隆冬有数九标注', !!currentJieqi(new Date('2026-01-05T10:00:00+08:00')).shujiu)
  ok('盛夏有三伏标注', !!currentJieqi(new Date('2026-07-25T10:00:00+08:00')).sanfu)
  const spring = currentJieqi(new Date('2026-04-10T10:00:00+08:00'))
  ok('清明既无数九也无三伏', !spring.shujiu && !spring.sanfu, `${spring.shujiu} / ${spring.sanfu}`)
  // 冬至当天必是「一九第1天」
  const dz = jieqiTableOfYear(2025).find((x) => x.name === '冬至')!
  const noon = new Date(Date.UTC(dz.year, dz.month - 1, dz.day, 12 - 8, 0, 0))
  eq('冬至当天 = 一九第1天', currentJieqi(noon).shujiu, '一九第1天')
}

console.log('\n═══ 六、倒计时文案 ═══')
eq('3天4时0分', countdownText(3 * 86400000 + 4 * 3600000), '3天4时0分')
eq('0天5时30分', countdownText(5 * 3600000 + 30 * 60000), '0天5时30分')

console.log('\n═══ 七、静态资料完整性（页面每个字段都要有东西可显示）═══')
ok('JIEQI_LIST 恰 24 个', JIEQI_LIST.length === 24, `${JIEQI_LIST.length}`)
for (const j of JIEQI_LIST) {
  ok(`${j.name} 三候齐 3 条`, j.sanhou.length === 3)
  ok(`${j.name} 有诗词`, !!j.poem.title && j.poem.lines.length > 0)
  ok(`${j.name} 有养生宜忌`, !!j.dietYi && !!j.dietJi && !!j.healthDaily)
  ok(`${j.name} 有应季食材`, j.foods.length > 0)
  ok(`${j.name} 有习俗`, j.customs.length > 0)
  ok(`${j.name} 季节有配色`, !!SEASON_META[j.season])
  const cul = jieqiCultureOf(j.name)
  ok(`${j.name} 有文化语料（字源/农谚/典故）`, !!cul && cul.charOrigins.length > 0 && cul.proverbs.length > 0)
}

console.log('\n═══ 八、推荐/海报语料（四季 + 24 节气全覆盖）═══')
for (const s of ['春', '夏', '秋', '冬'] as const) {
  ok(`${s} 有运动导引`, SEASON_EXERCISE[s].items.length > 0)
  ok(`${s} 有情志调节`, SEASON_EMOTION[s].items.length > 0)
  ok(`${s} 有应季好物`, SEASON_GOODS[s].length > 0)
  ok(`${s} 有相关课程`, SEASON_COURSES[s].length > 0)
}
for (const j of JIEQI_LIST) {
  const c = marketingCopy(j.name)
  ok(`${j.name} 营销素材齐`, c.hooks.length > 0 && !!c.longCopy && c.tags.length > 0)
  const p1 = posterCopy(j.name, 'personal')
  const p2 = posterCopy(j.name, 'lecturer')
  ok(`${j.name} 海报文案齐（专属版+讲师版）`, !!p1.headline && !!p1.footer && !!p2.headline && !!p2.footer)
}

console.log(`\n${'═'.repeat(40)}\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
