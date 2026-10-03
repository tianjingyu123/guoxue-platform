// 八字合盘引擎回归校验（移植自 V0 scripts/verify-hepan.ts，36 项断言）
// 运行：npx tsx scripts/verify-hepan.ts
// 锚点1：四柱与已验证的 computeBazi 一致（间接锚定 ganzhi 黄金基准）
// 锚点2：干支关系判定（五合/六合/六冲/六害/半合/天乙互见）
import { computeHepan } from '../src/pkg-paipan/lib/hepan-engine'

let pass = 0
let fail = 0
function chk(label: string, got: unknown, exp: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(exp)
  if (ok) pass++
  else {
    fail++
    console.log(`  ✗ ${label}\n    期望 ${JSON.stringify(exp)}\n    实得 ${JSON.stringify(got)}`)
  }
}
function chkTrue(label: string, cond: boolean) {
  if (cond) pass++
  else { fail++; console.log(`  ✗ ${label}`) }
}

// ── 案例1：1992-08-16 10:30 男（壬申 戊申 甲子 己巳）× 1995-03-08 14:20 女（乙亥 己卯 戊戌 己未）
const r1 = computeHepan(
  'marriage',
  { name: '甲', gender: '男', year: 1992, month: 8, day: 16, hour: 10, minute: 30 },
  { name: '乙', gender: '女', year: 1995, month: 3, day: 8, hour: 14, minute: 20 },
)
chk('案例1 甲方四柱', r1.personA.pillars.map((p) => p.gan + p.zhi), ['壬申', '戊申', '甲子', '己巳'])
chk('案例1 乙方四柱', r1.personB.pillars.map((p) => p.gan + p.zhi), ['乙亥', '己卯', '戊戌', '己未'])
chk('案例1 生肖', [r1.personA.zodiac, r1.personB.zodiac], ['猴', '猪'])
chk('案例1 日主', [r1.personA.dayMaster, r1.personB.dayMaster], ['甲木', '戊土'])
chkTrue('案例1 年支申亥相害被识别', r1.pillarLinks.some((l) => l.label.includes('申亥')))
chkTrue('案例1 申亥害有子水通关（申生子、子比亥）', r1.pillarLinks.some((l) => l.label.includes('通关')))
chkTrue('案例1 夫妻星互得（男甲以戊为财、女戊以甲为杀官）', r1.aspects.find((a) => a.key === 'shishen')!.score >= 75)
chkTrue('案例1 总分在合理区间', r1.totalScore >= 70 && r1.totalScore <= 96)

// ── 案例2：六冲对照（巳年 × 亥年）
const r2 = computeHepan(
  'friend',
  { name: '甲', gender: '男', year: 1989, month: 6, day: 6, hour: 12, minute: 0 },
  { name: '乙', gender: '男', year: 1995, month: 11, day: 11, hour: 12, minute: 0 },
)
chk('案例2 年支', [r2.personA.pillars[0].zhi, r2.personB.pillars[0].zhi], ['巳', '亥'])
chkTrue('案例2 巳亥六冲被识别', r2.pillarLinks.some((l) => l.label.includes('巳亥相冲')))

// ── 案例3：六合对照（甲子年 × 乙丑年，子丑合）
const r3 = computeHepan(
  'parent',
  { name: '甲', gender: '女', year: 1984, month: 6, day: 1, hour: 10, minute: 0 },
  { name: '乙', gender: '男', year: 1985, month: 6, day: 1, hour: 10, minute: 0 },
)
chk('案例3 年支', [r3.personA.pillars[0].zhi, r3.personB.pillars[0].zhi], ['子', '丑'])
chkTrue('案例3 子丑六合被识别', r3.pillarLinks.some((l) => l.label.includes('子丑六合')))

// ── 案例4：结构完整性（四场景跑通、字段齐全）
for (const scene of ['marriage', 'business', 'parent', 'friend']) {
  const r = computeHepan(
    scene,
    { name: 'A', gender: '男', year: 1990, month: 5, day: 15, hour: 8, minute: 0 },
    { name: 'B', gender: '女', year: 1992, month: 9, day: 20, hour: 16, minute: 30 },
  )
  chkTrue(`${scene} aspects=5`, r.aspects.length === 5)
  chkTrue(`${scene} advice>=3`, r.advice.length >= 3)
  chkTrue(`${scene} gudianRefs 2-3`, r.gudianRefs.length >= 2 && r.gudianRefs.length <= 3)
  chkTrue(`${scene} highlights/risks 非空`, r.highlights.length > 0 && r.risks.length > 0)
  chkTrue(`${scene} 五行占比合计≈100`, Math.abs(r.personA.wuxing.reduce((a, b) => a + b, 0) - 100) <= 3)
  chkTrue(`${scene} 分数区间`, r.totalScore >= 35 && r.totalScore <= 96 && r.aspects.every((a) => a.score >= 30 && a.score <= 98))
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败（共 ${pass + fail}）`)
process.exit(fail ? 1 : 0)
