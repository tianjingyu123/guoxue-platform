// ─── 万年历黄历引擎回归测试 ───
// 运行：npx tsx scripts/verify-wannianli.ts
// 校验：1) 引擎四柱与项目自有 ganzhi 引擎一致  2) 结构完整性  3) 已知锚点
import { buildAlmanac } from "../src/pkg-paipan/lib/wannianli-engine.ts"
import { fourPillars } from "../src/lib/paipan/ganzhi.ts"

let pass = 0
let fail = 0
function check(name: string, actual: unknown, expect: unknown) {
  if (actual === expect) {
    pass++
    console.log(`  ✅ ${name}: ${actual}`)
  } else {
    fail++
    console.log(`  ❌ ${name}: 实际 ${actual} ≠ 期望 ${expect}`)
  }
}
function ok(name: string, cond: boolean, info = "") {
  if (cond) { pass++; console.log(`  ✅ ${name} ${info}`) }
  else { fail++; console.log(`  ❌ ${name} ${info}`) }
}

console.log("═══ 万年历黄历引擎回归 ═══")

// 1) 四柱与项目自有引擎交叉一致（多锚点，含时柱；均取非 23 点边界避免子时换日歧义）
for (const [y, m, d, h, mi] of [[2026, 7, 2, 12, 30], [2026, 5, 17, 13, 59], [2025, 7, 25, 8, 0], [2020, 7, 15, 10, 30]] as const) {
  const b = buildAlmanac(new Date(y, m - 1, d, h, mi))
  const fp = fourPillars(y, m, d, h, mi)
  const engineGZ = b.day.pillars.map((p) => `${p.gan}${p.zhi}`).join(" ")
  const nativeGZ = `${fp.year.gan}${fp.year.zhi} ${fp.month.gan}${fp.month.zhi} ${fp.day.gan}${fp.day.zhi} ${fp.hour.gan}${fp.hour.zhi}`
  check(`${y}-${m}-${d} ${h}:${mi} 四柱=自有引擎`, engineGZ, nativeGZ)
}

// 1b) 子时换日约定：黄历按民用日显示日柱，23:00 后不提前进位（与八字引擎有意区分）
const zishi = buildAlmanac(new Date(2020, 6, 15, 23, 30))
ok("23:30 黄历日柱保持民用日(不进位)", zishi.day.pillars[2].gan + zishi.day.pillars[2].zhi === "己未",
  `→ ${zishi.day.pillars[2].gan}${zishi.day.pillars[2].zhi}`)

// 2) 已知锚点：2026-05-17 = 辛卯日（竞品黄金）
const g = buildAlmanac(new Date(2026, 4, 17, 13, 59))
ok("2026-05-17 日柱=辛卯", g.day.pillars[2].gan + g.day.pillars[2].zhi === "辛卯", `→ ${g.day.pillars[2].gan}${g.day.pillars[2].zhi}`)
check("2026-05-17 生肖", g.day.lunarYear.includes("属马"), true)

// 3) 结构完整性（2026-07-02）
const b = buildAlmanac(new Date(2026, 6, 2, 12, 30))
ok("宜非空", b.day.yi.length > 0, `宜${b.day.yi.length}项`)
ok("忌非空", b.day.ji.length > 0, `忌${b.day.ji.length}项`)
ok("四柱4根", b.day.pillars.length === 4)
ok("五行5类", b.day.wuxing.length === 5)
ok("五行合计=8", b.day.wuxing.reduce((s, w) => s + w.value, 0) === 8, `→ ${b.day.wuxing.map((w) => w.label).join(",")}`)
ok("时辰12个", b.day.hours.length === 12)
ok("方位8个", b.day.directions.length === 8)
ok("九宫飞星4盘", b.flyingStarCharts.length === 4)
ok("每盘9宫", b.flyingStarCharts.every((c) => c.stars.length === 9))
ok("五方吉神5个", b.auspiciousGods.length === 5)
ok("五行穿衣5档", b.wuxingDress.length === 5)
ok("节气倒计时>0", b.solarTermCountdowns.length > 0, `→ ${b.solarTermCountdowns.map((c) => c.name).join(",")}`)
ok("节日倒计时>0", b.holidayCountdowns.length > 0, `→ ${b.holidayCountdowns.map((c) => `${c.name}(${c.deltaDays}天)`).join(",")}`)
ok("节日按天数升序", b.holidayCountdowns.every((c, i, a) => i === 0 || a[i - 1].deltaDays <= c.deltaDays))
ok("彭祖百忌非空", b.day.pengZu.length > 0, `→ ${b.day.pengZu.join(" / ")}`)
ok("胎神非空", b.day.taiShen.length > 0, `→ ${b.day.taiShen}`)
ok("建除非空", b.day.jianChu.length > 0, `→ ${b.day.jianChu}`)
ok("28宿非空", b.day.ershiba.length > 0, `→ ${b.day.ershiba}`)
ok("空亡格式", /空亡$/.test(b.day.kongWang), `→ ${b.day.kongWang}`)
ok("冲煞格式", /^冲.+煞.$/.test(b.day.chongSha), `→ ${b.day.chongSha}`)
ok("值神含黄/黑道", /(黄道|黑道)日/.test(b.day.zhiShen), `→ ${b.day.zhiShen}`)
ok("物候有名有释", b.currentPhenology.name.length > 0 && b.currentPhenology.desc.length > 0, `→ ${b.currentPhenology.term}${b.currentPhenology.phase} ${b.currentPhenology.name}`)
ok("白话宜忌>0", b.vernacularYiJi.length > 0, `→ ${b.vernacularYiJi.length}条`)
ok("黄帝纪元", b.huangdiEra === "黄帝纪元 四七二三年", `→ ${b.huangdiEra}`)
ok("公历年中文", b.day.solarYearLabel === "二〇二六", `→ ${b.day.solarYearLabel}`)
ok("星期正确(2026-07-02=周四)", b.day.weekday === "星期四", `→ ${b.day.weekday}`)

// 4) 节气锚点：夏至后应能正确定位物候到「夏至」区间
ok("2026-07-02 处夏至物候区间", b.currentPhenology.term === "夏至", `→ ${b.currentPhenology.term}`)

console.log(`\n═══════ 结果: ${pass} 通过 / ${fail} 失败 ═══════`)
process.exit(fail > 0 ? 1 : 0)
