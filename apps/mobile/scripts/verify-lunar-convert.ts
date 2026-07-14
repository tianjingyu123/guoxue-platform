// 农历→公历转换校验：公开可查的农历/公历对应关系交叉验证
import { toSolar } from '../src/pkg-paipan/lib/date-convert'
import { Solar } from '../src/pkg-paipan/lib/lunar/index.js'

let pass = 0, fail = 0
function chk(label: string, got: unknown, exp: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(exp)
  if (ok) pass++
  else { fail++; console.log(`  ✗ ${label}\n    期望 ${JSON.stringify(exp)}\n    实得 ${JSON.stringify(got)}`) }
}

// 已知锚点（公开日历可查）
// 2024 春节：农历 2024 正月初一 = 公历 2024-02-10
const a = toSolar({ year: 2024, month: 1, day: 1, hour: 8, minute: 0, isLunar: true })
chk('2024 正月初一 → 2024-02-10', [a.year, a.month, a.day], [2024, 2, 10])

// 2025 春节：农历 2025 正月初一 = 公历 2025-01-29
const b = toSolar({ year: 2025, month: 1, day: 1, hour: 8, minute: 0, isLunar: true })
chk('2025 正月初一 → 2025-01-29', [b.year, b.month, b.day], [2025, 1, 29])

// 2026 春节：农历 2026 正月初一 = 公历 2026-02-17
const c = toSolar({ year: 2026, month: 1, day: 1, hour: 8, minute: 0, isLunar: true })
chk('2026 正月初一 → 2026-02-17', [c.year, c.month, c.day], [2026, 2, 17])

// 2024 中秋：农历 2024 八月十五 = 公历 2024-09-17
const d = toSolar({ year: 2024, month: 8, day: 15, hour: 20, minute: 0, isLunar: true })
chk('2024 八月十五 → 2024-09-17', [d.year, d.month, d.day], [2024, 9, 17])

// 2025 端午：农历 2025 五月初五 = 公历 2025-05-31
const e = toSolar({ year: 2025, month: 5, day: 5, hour: 12, minute: 0, isLunar: true })
chk('2025 五月初五 → 2025-05-31', [e.year, e.month, e.day], [2025, 5, 31])

// isLunar=false 必须原样返回（不得误转）
const f = toSolar({ year: 1992, month: 8, day: 16, hour: 10, minute: 30, isLunar: false })
chk('公历原样返回', [f.year, f.month, f.day, f.hour, f.minute], [1992, 8, 16, 10, 30])

// 时分必须透传（农历只转年月日）
const g = toSolar({ year: 2024, month: 1, day: 1, hour: 23, minute: 45, isLunar: true })
chk('时分透传', [g.hour, g.minute], [23, 45])

// 反向自洽：随机 200 个公历日 → 转农历 → 再转回公历，应还原
let rt = 0
for (let i = 0; i < 200; i++) {
  const y = 1950 + Math.floor(i / 4)
  const m = (i % 12) + 1
  const dd = (i % 27) + 1
  const s0 = Solar.fromYmd(y, m, dd)
  const lun = s0.getLunar()
  // 跳过闰月（选择器不支持，转换按非闰月解释）
  if (lun.getMonth() < 0) continue
  const back = toSolar({ year: lun.getYear(), month: lun.getMonth(), day: lun.getDay(), hour: 12, minute: 0, isLunar: true })
  if (back.year === y && back.month === m && back.day === dd) rt++
  else { fail++; console.log(`  ✗ 往返不一致 ${y}-${m}-${dd} → 农历${lun.getYear()}/${lun.getMonth()}/${lun.getDay()} → ${back.year}-${back.month}-${back.day}`) }
}
console.log(`  往返自洽 ${rt} 例通过`)
pass += rt

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
