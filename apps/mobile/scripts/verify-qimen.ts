// 奇门遁甲引擎自验脚本（黄金测试第一层：经典结构性不变量 + 已知案例）
// 运行: pnpm exec tsx scripts/verify-qimen.ts
import { computeQimen, computeQimenWithJu, GRID_PALACES, PALACE_NAMES } from '../src/pkg-paipan/lib/qimen-engine'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${detail}`)
  }
}

function printPan(r: ReturnType<typeof computeQimen>) {
  console.log(`  四柱: ${r.sizhu.year.gan}${r.sizhu.year.zhi} ${r.sizhu.month.gan}${r.sizhu.month.zhi} ${r.sizhu.day.gan}${r.sizhu.day.zhi} ${r.sizhu.hour.gan}${r.sizhu.hour.zhi}`)
  console.log(`  ${r.ju.label}(${r.ju.yuan}) 旬首${r.xunshou.name} 值符${r.zhifu.star}落${PALACE_NAMES[r.zhifu.palace]} 值使${r.zhishi.men}落${PALACE_NAMES[r.zhishi.palace]} 马星${r.maXing}`)
  for (let row = 0; row < 3; row++) {
    const cells = GRID_PALACES.slice(row * 3, row * 3 + 3).map((p) => {
      const pl = r.palaces[p]
      return `${pl.shen || "－"}|${pl.star || "－"}${pl.star2 ? "禽" : ""}|${pl.men || "－"}|天${pl.tianGan || "－"}地${pl.diGan || "－"}`
    })
    console.log("  " + cells.join("  ‖  "))
  }
}

// ═══ 案例1: 阳遁1局 甲子时（结构基准：一切归位不动）═══
// 阳遁1局地盘: 戊1 己2 庚3 辛4 壬5 癸6 丁7 丙8 乙9
// 甲子时旬首甲子遁戊,戊在坎1 → 值符天蓬,值使休门,时干甲用戊落坎1
// 甲子时为旬首第0时 → 值符天蓬在坎1,值使休门在坎1,天地盘完全重合
{
  console.log("\n═══ 案例1: 阳遁1局 甲子日甲子时(自选局,结构基准) ═══")
  // 2024-01-01 为甲子日(已用 dayGanzhi 核实),00:30 子时 → 甲子时
  const r = computeQimenWithJu(new Date(2024, 0, 1, 0, 30), true, 1)
  printPan(r)
  check("日柱=甲子", r.sizhu.day.gan === "甲" && r.sizhu.day.zhi === "子", `实际${r.sizhu.day.gan}${r.sizhu.day.zhi}`)
  check("时柱=甲子", r.sizhu.hour.gan === "甲" && r.sizhu.hour.zhi === "子", `实际${r.sizhu.hour.gan}${r.sizhu.hour.zhi}`)
  check("旬首=甲子戊", r.xunshou.name === "甲子戊")
  check("地盘戊在坎1", r.palaces[1].diGan === "戊")
  check("地盘乙在离9", r.palaces[9].diGan === "乙")
  check("地盘丙在艮8", r.palaces[8].diGan === "丙")
  check("值符=天蓬", r.zhifu.star === "天蓬")
  check("值使=休门", r.zhishi.men === "休门")
  check("值符落坎1", r.zhifu.palace === 1)
  check("值使落坎1", r.zhishi.palace === 1)
  // 归位盘:天地盘干重合
  let overlap = true
  for (let p = 1; p <= 9; p++) {
    if (p === 5) continue
    if (r.palaces[p].tianGan !== r.palaces[p].diGan && !(p === 2 && r.palaces[p].tianGan2)) overlap = false
  }
  check("甲子时天地盘重合(归位)", overlap)
  check("八神值符在坎1", r.palaces[1].shen === "值符")
  check("甲子旬空亡=戌亥", r.xunshou.kong === "戌亥")
  check("坎1宫无空亡标记(子不空)", !r.palaces[1].kongWang)
  check("乾6宫空亡标记(戌亥空)", r.palaces[6].kongWang)
  check("马星=寅(申子辰马在寅)", r.maXing === "寅")
  check("艮8宫马星标记(寅在艮)", r.palaces[8].maXing)
}

// ═══ 案例2: 阳遁1局 丙寅时(甲子旬第2位) 转盘飞转验证 ═══
// 甲子日丙寅时: 时干丙,地盘丙在艮8 → 值符天蓬转到艮8
// 值使休门从坎1顺飞2步(子丑寅)→ 坎1→坤2→震3,值使休门落震3
{
  console.log("\n═══ 案例2: 阳遁1局 甲子日丙寅时(转盘飞转) ═══")
  const r = computeQimenWithJu(new Date(2024, 0, 1, 4, 30), true, 1)
  printPan(r)
  check("时柱=丙寅", r.sizhu.hour.gan === "丙" && r.sizhu.hour.zhi === "寅", `实际${r.sizhu.hour.gan}${r.sizhu.hour.zhi}`)
  check("值符天蓬落艮8(时干丙宫)", r.zhifu.palace === 8, `实际${r.zhifu.palace}`)
  check("艮8天盘干=戊(值符带旬首仪)", r.palaces[8].tianGan === "戊", `实际${r.palaces[8].tianGan}`)
  check("值使休门落震3(顺飞2步)", r.zhishi.palace === 3, `实际${r.zhishi.palace}`)
  check("震3门=休门", r.palaces[3].men === "休门")
  // 转盘星序: 蓬任冲辅英芮柱心 从艮8起环形: 艮8蓬→震3任→巽4冲→离9辅→坤2英→兑7芮→乾6柱→坎1心
  check("震3星=天任", r.palaces[3].star === "天任", `实际${r.palaces[3].star}`)
  check("巽4星=天冲", r.palaces[4].star === "天冲", `实际${r.palaces[4].star}`)
  check("离9星=天辅", r.palaces[9].star === "天辅", `实际${r.palaces[9].star}`)
  check("坤2星=天英", r.palaces[2].star === "天英", `实际${r.palaces[2].star}`)
  check("兑7星=天芮(禽随)", r.palaces[7].star === "天芮" && r.palaces[7].star2 === "天禽")
  check("乾6星=天柱", r.palaces[6].star === "天柱")
  check("坎1星=天心", r.palaces[1].star === "天心")
  // 八神阳遁顺布: 值符艮8→腾蛇震3→太阴巽4→六合离9→白虎坤2→玄武兑7→九地乾6→九天坎1
  check("八神值符在艮8", r.palaces[8].shen === "值符")
  check("腾蛇在震3", r.palaces[3].shen === "腾蛇")
  check("九天在坎1", r.palaces[1].shen === "九天")
  // 门迫: 休门(水)落震3(木)为门生宫非迫 → 不迫
  check("震3休门非门迫(水生木)", !r.palaces[3].menPo)
}

// ═══ 案例3: 阴遁9局 结构验证(地盘逆布) ═══
// 阴遁9局: 戊9 己8 庚7 辛6 壬5 癸4 丁3 丙2 乙1
{
  console.log("\n═══ 案例3: 阴遁9局 地盘逆布 ═══")
  const r = computeQimenWithJu(new Date(2024, 0, 1, 0, 30), false, 9)
  printPan(r)
  check("地盘戊在离9", r.palaces[9].diGan === "戊")
  check("地盘己在艮8", r.palaces[8].diGan === "己")
  check("地盘庚在兑7", r.palaces[7].diGan === "庚")
  check("地盘癸在巽4", r.palaces[4].diGan === "癸")
  check("地盘乙在坎1", r.palaces[1].diGan === "乙")
  check("值符=天英(戊在离9)", r.zhifu.star === "天英", `实际${r.zhifu.star}`)
  check("值使=景门", r.zhishi.men === "景门", `实际${r.zhishi.men}`)
  // 八神阴遁逆布验证: 值符落宫后逆时针
  const zf = r.zhifu.palace
  check(`值符神与值符星同宫(${zf})`, r.palaces[zf].shen === "值符")
}

// ═══ 案例4: 拆补法定局正确性(冬至前后) ═══
// 2023-12-22 11:27 冬至。12月23日为冬至后,当为阳遁(冬至1-7-4)
{
  console.log("\n═══ 案例4: 拆补法定局(2023冬至后) ═══")
  const r = computeQimen(new Date(2023, 11, 25, 10, 30), { startMethod: "chaibu" })
  printPan(r)
  check("冬至后为阳遁", r.ju.isYang, `实际${r.ju.label}`)
  check("局数∈{1,7,4}", [1, 7, 4].includes(r.ju.num), `实际${r.ju.num}`)
}

// ═══ 案例5: 夏至后为阴遁 ═══
{
  console.log("\n═══ 案例5: 拆补法定局(2024夏至后) ═══")
  const r = computeQimen(new Date(2024, 5, 25, 10, 30), { startMethod: "chaibu" })
  printPan(r)
  check("夏至后为阴遁", !r.ju.isYang, `实际${r.ju.label}`)
  check("局数∈{9,3,6}", [9, 3, 6].includes(r.ju.num), `实际${r.ju.num}`)
}

// ═══ 案例6: 全宫完整性(任意时刻不缺项) ═══
{
  console.log("\n═══ 案例6: 结构完整性抽查(随机100时刻) ═══")
  let ok = true
  const issues: string[] = []
  for (let i = 0; i < 100; i++) {
    const t = new Date(2020 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28), Math.floor(Math.random() * 24), 30)
    for (const method of ["zhuan", "fei"] as const) {
      const r = computeQimen(t, { panMethod: method })
      // 8门8星8神齐全(转盘)/9齐全(飞盘)
      const stars = new Set<string>()
      const mens = new Set<string>()
      const shens = new Set<string>()
      for (let p = 1; p <= 9; p++) {
        if (r.palaces[p].star) stars.add(r.palaces[p].star)
        if (r.palaces[p].men) mens.add(r.palaces[p].men)
        if (r.palaces[p].shen) shens.add(r.palaces[p].shen)
      }
      const wantStars = method === "zhuan" ? 8 : 9
      const wantShens = method === "zhuan" ? 8 : 9
      const wantMens = method === "zhuan" ? 8 : 9
      if (stars.size !== wantStars || mens.size !== wantMens || shens.size !== wantShens) {
        ok = false
        issues.push(`${t.toISOString()} ${method}: 星${stars.size} 门${mens.size} 神${shens.size}`)
      }
    }
  }
  check("100随机时刻×转/飞盘 星门神齐全", ok, issues.slice(0, 3).join("; "))
}

// ═══ 案例7: 竞品黄金测试(2026-05-17 13:59 飞盘-阴阳皆顺-置闰-门地盘起) ═══
// 来源: 用户提供的竞品 App 截图,九宫逐值比对
// 期望: 四柱丙午/癸巳/辛卯/乙未,置闰阳7局,旬首甲午辛,值符天蓬落乾6,值使休门落坤2,马星巳
{
  console.log("\n═══ 案例7: 竞品黄金测试(飞盘置闰阳7) ═══")
  const r = computeQimen(new Date(2026, 4, 17, 13, 59), {
    panMethod: "fei",
    flyMethod: "yinyang",
    startMethod: "zhirun",
    anganMethod: "dipan",
  })
  printPan(r)
  check("年柱=丙午", r.sizhu.year.gan === "丙" && r.sizhu.year.zhi === "午", `实际${r.sizhu.year.gan}${r.sizhu.year.zhi}`)
  check("月柱=癸巳", r.sizhu.month.gan === "癸" && r.sizhu.month.zhi === "巳", `实际${r.sizhu.month.gan}${r.sizhu.month.zhi}`)
  check("日柱=辛卯", r.sizhu.day.gan === "辛" && r.sizhu.day.zhi === "卯", `实际${r.sizhu.day.gan}${r.sizhu.day.zhi}`)
  check("时柱=乙未", r.sizhu.hour.gan === "乙" && r.sizhu.hour.zhi === "未", `实际${r.sizhu.hour.gan}${r.sizhu.hour.zhi}`)
  check("空亡年寅卯", r.kongwang[0].zhi === "寅卯", `实际${r.kongwang[0].zhi}`)
  check("空亡月午未", r.kongwang[1].zhi === "午未", `实际${r.kongwang[1].zhi}`)
  check("空亡日午未", r.kongwang[2].zhi === "午未", `实际${r.kongwang[2].zhi}`)
  check("空亡时辰巳", r.kongwang[3].zhi === "辰巳", `实际${r.kongwang[3].zhi}`)
  check("置闰=阳遁7局", r.ju.isYang && r.ju.num === 7, `实际${r.ju.label}(${r.ju.yuan})`)
  check("旬首=甲午辛", r.xunshou.name === "甲午辛", `实际${r.xunshou.name}`)
  check("值符=天蓬", r.zhifu.star === "天蓬", `实际${r.zhifu.star}`)
  check("值使=休门", r.zhishi.men === "休门", `实际${r.zhishi.men}`)
  check("值符落乾6", r.zhifu.palace === 6, `实际${r.zhifu.palace}`)
  check("值使落坤2", r.zhishi.palace === 2, `实际${r.zhishi.palace}`)
  check("马星=巳", r.maXing === "巳", `实际${r.maXing}`)
  check("巽4马星标记(巳在巽)", r.palaces[4].maXing)
  check("巽4时空标记(辰巳空)", r.palaces[4].kongWang)

  // 九宫逐值: [宫, 神, 星, 门, 天盘干, 暗干, 地盘干]
  const golden: [number, string, string, string, string, string, string][] = [
    [4, "九地", "天任", "伤门", "己", "癸", "丁"],
    [9, "六合", "天辅", "生门", "丁", "己", "庚"],
    [2, "太常", "天心", "休门", "乙", "辛", "壬"],
    [3, "朱雀", "天柱", "死门", "戊", "壬", "癸"],
    [5, "九天", "天英", "杜门", "庚", "丁", "丙"],
    [7, "螣蛇", "天芮", "开门", "壬", "乙", "戊"],
    [8, "太阴", "天冲", "惊门", "癸", "戊", "己"],
    [1, "勾陈", "天禽", "景门", "丙", "庚", "辛"],
    [6, "值符", "天蓬", "中门", "辛", "丙", "乙"],
  ]
  for (const [p, shen, star, men, tg, ag, dg] of golden) {
    const pl = r.palaces[p]
    check(
      `${PALACE_NAMES[p]}: ${shen}/${star}/${men}/天${tg}暗${ag}地${dg}`,
      pl.shen === shen && pl.star === star && pl.men === men && pl.tianGan === tg && pl.anGan === ag && pl.diGan === dg,
      `实际 ${pl.shen}/${pl.star}/${pl.men}/天${pl.tianGan}暗${pl.anGan}地${pl.diGan}`,
    )
  }
  // 地盘九神(固定序,竞品截图): 1符 2蛇 3阴 4六合 5勾陈 6太常 7朱雀 8九地 9九天
  const goldenDiShen: [number, string][] = [
    [1, "值符"], [2, "螣蛇"], [3, "太阴"], [4, "六合"], [5, "勾陈"],
    [6, "太常"], [7, "朱雀"], [8, "九地"], [9, "九天"],
  ]
  for (const [p, shen] of goldenDiShen) {
    check(`地盘九神${PALACE_NAMES[p]}=${shen}`, r.palaces[p].diShen === shen, `实际${r.palaces[p].diShen}`)
  }
  // 标注: 入墓(艮8地盘己? 竞品橙标: 艮8惊门旁己、乾6中门旁乙)、击刑(震3天盘戊紫标)、门迫(中5杜门红标)
  check("震3天盘戊击刑", r.palaces[3].jiXing.includes("戊") || r.palaces[3].xingMu.includes("戊"), `实际刑${r.palaces[3].jiXing}墓${r.palaces[3].ruMu}`)
  check("中5杜门门迫", r.palaces[5].menPo === true)
  check("坤2休门非门迫", r.palaces[2].menPo === false)
}

console.log(`\n═══════ 结果: ${pass} 通过 / ${fail} 失败 ═══════`)
process.exit(fail > 0 ? 1 : 0)
