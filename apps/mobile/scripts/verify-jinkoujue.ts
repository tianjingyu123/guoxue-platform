/**
 * 金口诀引擎黄金基准验证
 * 基准来源：竞品实测截图 2025-09-29 10:49，地分子（自选），交节换将，甲戊庚牛羊，卯酉区分
 * 预期：四柱 乙巳/乙酉/辛丑/癸巳；月将辰(天罡)；人元戊；贵神戊戌(天空)；
 *       将神己亥(登明) 为用爻；日空辰巳；四大空亡亥子壬癸；妻动+贼动；驿马在将神
 */
import { paiJinKouJue } from "../src/pkg-paipan/lib/jinkoujue-engine.ts"

let pass = 0
let fail = 0
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass++
  else {
    fail++
    console.log(`✗ ${name}: 期望 ${JSON.stringify(expected)}，实得 ${JSON.stringify(actual)}`)
  }
}

const r = paiJinKouJue({
  date: new Date(2025, 8, 29, 10, 49),
  difenMethod: "manual",
  difenZhi: "子",
  jiangMethod: "jie",
  guirenSchool: "A",
  guiType: "auto",
})

eq("年柱", r.pillars.year, "乙巳")
eq("月柱", r.pillars.month, "乙酉")
eq("日柱", r.pillars.day, "辛丑")
eq("时柱", r.pillars.time, "癸巳")
eq("月将", r.yuejiang.zhi, "辰")
eq("月将名", r.yuejiang.name, "天罡")
eq("地分", r.difen.zhi, "子")
eq("人元", r.positions[0].char, "戊")
eq("人元五行", r.positions[0].wuxing, "土")
eq("贵神支", r.positions[1].char, "戌")
eq("贵神遁干", r.positions[1].gan, "戊")
eq("贵神天将", r.positions[1].starName, "天空")
eq("将神支", r.positions[2].char, "亥")
eq("将神遁干", r.positions[2].gan, "己")
eq("将神名", r.positions[2].starName, "登明")
eq("将神旺衰", r.positions[2].wangShuai, "相")
eq("用爻=将神", r.yongRole, "将神")
eq("日空", r.xunKong, ["辰", "巳"])
eq("四大空亡", r.siDaKong, "亥子壬癸")
eq("将神四大空亡", r.positions[2].isSiDaKong, true)
eq("地分四大空亡", r.positions[3].isSiDaKong, true)
eq("含妻动", r.dongYao.some((d) => d.name === "妻动"), true)
eq("含贼动", r.dongYao.some((d) => d.name === "贼动"), true)
eq("将神驿马", r.shenSha["将神"].includes("驿马"), true)
eq("空亡课", r.keTi.some((k) => k.name === "空亡课"), true)

// 加测：夜贵与顺布 —— 甲日夜时（22点=亥时）贵人未(夜贵)，未属逆布
const r2 = paiJinKouJue({
  date: new Date(2025, 8, 29, 22, 0),
  difenMethod: "manual",
  difenZhi: "午",
  jiangMethod: "jie",
  guirenSchool: "A",
  guiType: "auto",
})
eq("夜课有贵神", !!r2.positions[1].starName, true)

// 报数起地分：报 15 → (15-1)%12=2 → 寅
const r3 = paiJinKouJue({
  date: new Date(2025, 8, 29, 10, 49),
  difenMethod: "number",
  difenNumber: 15,
  jiangMethod: "jie",
  guirenSchool: "A",
  guiType: "auto",
})
eq("报数15→寅", r3.difen.zhi, "寅")

// 中气换将：2025-09-29 处于秋分后 → 月将辰
const r4 = paiJinKouJue({
  date: new Date(2025, 8, 29, 10, 49),
  difenMethod: "manual",
  difenZhi: "子",
  jiangMethod: "zhong",
  guirenSchool: "A",
  guiType: "auto",
})
eq("中气法月将（秋分后）", r4.yuejiang.zhi, "辰")

console.log(`\n${pass} 通过 / ${fail} 失败`)
if (fail > 0) process.exit(1)
