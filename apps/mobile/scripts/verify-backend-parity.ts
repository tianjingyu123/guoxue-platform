/**
 * 前端引擎 ⇄ 后端 calculator 一致性核对（「去伪存真」的体检表）
 * 运行：npx tsx scripts/verify-backend-parity.ts
 *
 * 为什么需要它：
 *   平台里有两套排盘算法 ——
 *     · C 端（用户看的）：apps/mobile 的前端引擎，已有 14 套黄金测试守着
 *     · admin（管理员看的）：apps/server 的 tool-registry/calculators
 *   admin 的 奇门/六爻/大六壬 三个页面走的是后端那套。同一个盘，
 *   如果两套算出的局数/值符/卦名不一样，就会出现「管理员和用户看到不同的盘」——
 *   对一个自称行业权威的平台，这是不能存在的。
 *
 * 本脚本拿同样的输入喂两边，逐值比对。不一致 = 必须查清哪边错，而不是两边都留着。
 */
import { computeQimen } from '../src/pkg-paipan/lib/qimen-engine'
import { computeLiuren } from '../src/pkg-paipan/lib/daliuren-engine'
import { calculateQimenYang } from '../../server/src/modules/tool-registry/calculators/qimen.calculator'
import { calculateDaLiuRen } from '../../server/src/modules/tool-registry/calculators/daliuren.calculator'
import { computeLiuyao } from '@guoxue/shared/paipan'
import { calculateLiuYao } from '../../server/src/modules/tool-registry/calculators/liuyao.calculator'

interface Case {
  label: string
  y: number
  m: number
  d: number
  hh: number
  mi: number
}

/** 取自奇门黄金测试的锚点时刻（阴阳遁、上中下元、交节前后都覆盖） */
const CASES: Case[] = [
  { label: '2024-02-05 10:30 (立春后·阳遁)', y: 2024, m: 2, d: 5, hh: 10, mi: 30 },
  { label: '2024-06-21 14:00 (夏至后·阴遁)', y: 2024, m: 6, d: 21, hh: 14, mi: 0 },
  { label: '2024-12-21 23:30 (冬至·晚子时)', y: 2024, m: 12, d: 21, hh: 23, mi: 30 },
  { label: '2025-03-15 08:00', y: 2025, m: 3, d: 15, hh: 8, mi: 0 },
  { label: '2025-09-08 16:45', y: 2025, m: 9, d: 8, hh: 16, mi: 45 },
  { label: '2026-07-14 09:00 (今日)', y: 2026, m: 7, d: 14, hh: 9, mi: 0 },
  { label: '1990-01-01 00:30 (早子时)', y: 1990, m: 1, d: 1, hh: 0, mi: 30 },
  { label: '2000-08-08 12:00', y: 2000, m: 8, d: 8, hh: 12, mi: 0 },
]

let pass = 0
let fail = 0
const diffs: string[] = []

function cmp(caseLabel: string, field: string, front: unknown, back: unknown) {
  if (String(front) === String(back)) {
    pass++
    return
  }
  fail++
  diffs.push(`  ✗ ${caseLabel} · ${field}：前端=${front}  后端=${back}`)
}

console.log('奇门遁甲 · 前端引擎 vs 后端 calculator（admin 的奇门盘走后端这套）\n')

for (const c of CASES) {
  const date = new Date(c.y, c.m - 1, c.d, c.hh, c.mi, 0)
  // 两边都用「拆补法 + 转盘」这一组默认参数
  const front = computeQimen(date, { panMethod: 'zhuan', startMethod: 'chaibu' })
  const back = calculateQimenYang({
    datetime: `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}T${String(c.hh).padStart(2, '0')}:${String(c.mi).padStart(2, '0')}:00`,
    qiJuMethod: 'chaibu',
  }) as any

  cmp(c.label, '局数', front.ju.num, back.juNumber)
  cmp(c.label, '阴阳遁', front.ju.isYang ? 'yang' : 'yin', back.dunType)
  cmp(c.label, '值符星', front.zhifu.star, back.zhiFu)
  cmp(c.label, '值使门', front.zhishi.men, back.zhiShiMen)
}

console.log(diffs.length ? diffs.join('\n') : '  （无差异）')

// ── 大六壬（admin 的大六壬盘也走后端这套）
console.log('\n大六壬 · 前端引擎 vs 后端 calculator\n')
const before = diffs.length
for (const c of CASES) {
  const date = new Date(c.y, c.m - 1, c.d, c.hh, c.mi, 0)
  const front = computeLiuren(date)
  const back = calculateDaLiuRen({
    datetime: `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}T${String(c.hh).padStart(2, '0')}:${String(c.mi).padStart(2, '0')}:00`,
  }) as any

  // 字段名以 packages/shared 的 DaLiuRenResult 为准（riGanZhi / yueJiangZhi）
  cmp(c.label, '日柱', `${front.sizhu.day.gan}${front.sizhu.day.zhi}`, back.riGanZhi)
  cmp(c.label, '月将支', front.yuejiang.zhi, back.yueJiangZhi)
  cmp(c.label, '月将名', front.yuejiang.name, back.yueJiang)
}
console.log(diffs.length > before ? diffs.slice(before).join('\n') : '  （无差异）')

// ── 六爻（admin 的六爻盘也走后端这套；两边都用「时间起卦」，同一时刻应得同一卦）
console.log('\n六爻 · 前端引擎 vs 后端 calculator（时间起卦）\n')
const b2 = diffs.length
for (const c of CASES) {
  const front = computeLiuyao({
    year: c.y, month: c.m, day: c.d, hour: c.hh, minute: c.mi, methodKey: 'time',
  })
  const back = calculateLiuYao({
    method: 'time',
    datetime: `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}T${String(c.hh).padStart(2, '0')}:${String(c.mi).padStart(2, '0')}:00`,
  }) as any

  cmp(c.label, '本卦', front.chart.benShort, back.benGua?.name)
  cmp(c.label, '卦宫', front.chart.palace, back.guaGong)
  cmp(c.label, '世爻', front.chart.shiPos, back.shiYao)
}
console.log(diffs.length > b2 ? diffs.slice(b2).join('\n') : '  （无差异）')

console.log(`\n════ 合计：${pass} 一致 / ${fail} 不一致`)

if (fail) {
  console.log(
    '\n🔴 两套算法结果不同 —— 同一个盘，用户端与管理端会显示不同结果。\n' +
      '   必须查清哪边是对的（前端那套有 84 项奇门黄金测试背书），\n' +
      '   然后让另一边要么对齐、要么下线，绝不能两套并存。',
  )
}
process.exit(fail ? 1 : 0)
