// 后端 bazi-engine 修复后验证：① 24节气×8年 vs lunar-typescript ② calcBazi 四柱 500例 vs lunar
import { calcAllJieQi } from '../../packages/bazi-engine/src/jieqi'
import { calcBazi } from '../../packages/bazi-engine/src/index'
import { Solar } from './src/pkg-paipan/lib/lunar/index.js'

// ① 节气对拍（分钟容差 ±2）
const YEARS = [1930, 1954, 1984, 1990, 2000, 2024, 2026, 2042]
let jqPass = 0
const jqFails: string[] = []
for (const y of YEARS) {
  const table = Solar.fromYmd(y, 6, 15).getLunar().getJieQiTable() as Record<string, { getYear: () => number; getMonth: () => number; getDay: () => number; getHour: () => number; getMinute: () => number }>
  const be = calcAllJieQi(y)
  for (const [name, t] of be) {
    const ref = table[name]
    if (!ref) continue
    // lunar 的表含跨年项，只比同年同月的
    if (ref.getYear() !== y && !(name === '小寒' || name === '大寒')) continue
    const beMin = t.month * 44640 + t.day * 1440 + t.hour * 60 + t.minute
    const refMin = ref.getMonth() * 44640 + ref.getDay() * 1440 + ref.getHour() * 60 + ref.getMinute()
    if (Math.abs(beMin - refMin) <= 2) jqPass++
    else jqFails.push(`${y}${name} 后端[${t.month}-${t.day} ${t.hour}:${String(t.minute).padStart(2, '0')}] 裁判[${ref.getMonth()}-${ref.getDay()} ${ref.getHour()}:${String(ref.getMinute()).padStart(2, '0')}]`)
  }
}
console.log(`① 节气对拍：${jqPass} 一致 / ${jqFails.length} 不一致`)
for (const f of jqFails.slice(0, 8)) console.log('  ✗ ' + f)

// ② 四柱对拍
let seed = 20260711
function rnd(n: number): number { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n }
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
let szPass = 0
const szFails: string[] = []
for (let i = 0; i < 500; i++) {
  const y = 1930 + rnd(120), m = 1 + rnd(12)
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const d = 1 + rnd(m === 2 && leap ? 29 : DAYS[m - 1])
  const h = rnd(24), mi = rnd(60)
  const r = calcBazi({ name: 'x', gender: '男', year: y, month: m, day: d, hour: h, minute: mi })
  const s = r.siZhu as unknown as Record<string, { gan: string; zhi: string }>
  const be = ['nian', 'yue', 'ri', 'shi'].map((k) => s[k].gan + s[k].zhi).join(' ')
  const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar()
  const ref = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' ')
  if (be === ref) szPass++
  else szFails.push(`${y}-${m}-${d} ${h}:${String(mi).padStart(2, '0')} 后端[${be}] 裁判[${ref}]`)
}
console.log(`② calcBazi 四柱对拍：${szPass} 一致 / ${szFails.length} 不一致`)
for (const f of szFails.slice(0, 10)) console.log('  ✗ ' + f)
