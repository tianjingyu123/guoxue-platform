// 六爻装卦引擎黄金回归测试
// 锚点1：水泽节之震为雷（2026-07-02 12:43 丁丑日丙午时）——纳甲/六亲/六神/世应/动爻/神煞/空亡
// 锚点2：八宫结构抽查（乾宫游魂火地晋/归魂火天大有、坎宫一世节）
// 运行：npx tsx scripts/verify-liuyao.ts

import { assembleChart, palaceOf, hexName, guanameGua, coinsToLines, computeLiuyao, GUA_CI } from '../src/pkg-paipan2/lib/liuyao-engine'
import { fourPillars } from '../src/lib/paipan/ganzhi'

let pass = 0
let fail = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
  } else {
    fail++
    console.log(`✗ ${name}\n  期望: ${e}\n  实际: ${a}`)
  }
}

// ─── 锚点0：四柱（2026-07-02 12:43 → 丙午年 甲午月 丁丑日 丙午时）───
const fp = fourPillars(2026, 7, 2, 12, 43)
check("四柱-年", `${fp.year.gan}${fp.year.zhi}`, "丙午")
check("四柱-月", `${fp.month.gan}${fp.month.zhi}`, "甲午")
check("四柱-日", `${fp.day.gan}${fp.day.zhi}`, "丁丑")
check("四柱-时", `${fp.hour.gan}${fp.hour.zhi}`, "丙午")

// ─── 锚点1：水泽节之震为雷（丁丑日）───
// 节 = 兑下坎上：自下而上 阳阳阴阴阳阴；动爻2、4、5 变为震为雷
const jieBits = [1, 1, 0, 0, 1, 0]
const chart = assembleChart(jieBits, [2, 4, 5], "丁", "丑")

check("本卦名", chart.benName, "水泽节(坎)")
check("变卦名", chart.bianName, "震为雷(震)")
check("本卦标签", chart.benTag, "六合卦")
check("变卦标签", chart.bianTag, "六冲卦")
check("世应位", [chart.shiPos, chart.yingPos], [1, 4])
check("卦身", chart.guashen, "子")
check("神煞", chart.shensha, ["卦身--子", "驿马--亥", "桃花--午", "日禄--午", "贵人--亥酉"])

// 六爻自上而下（position 6→1）：六神/本卦六亲/纳甲干/世应/动爻标记
const expectLines = [
  { position: 6, liushen: "龙", benLiuqin: "兄 子水", benGan: "戊", shiying: undefined, movingMark: undefined, bianLiuqin: "官 戌土", bianGan: "庚" },
  { position: 5, liushen: "玄", benLiuqin: "官 戌土", benGan: "戊", shiying: undefined, movingMark: "O", bianLiuqin: "父 申金", bianGan: "庚" },
  { position: 4, liushen: "虎", benLiuqin: "父 申金", benGan: "戊", shiying: "应", movingMark: "X", bianLiuqin: "财 午火", bianGan: "庚" },
  { position: 3, liushen: "蛇", benLiuqin: "官 丑土", benGan: "丁", shiying: undefined, movingMark: undefined, bianLiuqin: "官 辰土", bianGan: "庚" },
  { position: 2, liushen: "勾", benLiuqin: "孙 卯木", benGan: "丁", shiying: undefined, movingMark: "O", bianLiuqin: "孙 寅木", bianGan: "庚" },
  { position: 1, liushen: "雀", benLiuqin: "财 巳火", benGan: "丁", shiying: "世", movingMark: undefined, bianLiuqin: "兄 子水", bianGan: "庚" },
]
for (let i = 0; i < 6; i++) {
  const l = chart.lines[i]
  const e = expectLines[i]
  check(`爻${e.position}-六神`, l.liushen, e.liushen)
  check(`爻${e.position}-本卦`, l.benLiuqin, e.benLiuqin)
  check(`爻${e.position}-纳甲干`, l.benGan, e.benGan)
  check(`爻${e.position}-世应`, l.shiying, e.shiying)
  check(`爻${e.position}-动爻`, l.movingMark, e.movingMark)
  check(`爻${e.position}-变卦`, l.bianLiuqin, e.bianLiuqin)
  check(`爻${e.position}-变卦干`, l.bianGan, e.bianGan)
}
// 节卦五类六亲齐全 → 无伏神
check("无伏神", chart.lines.every((l) => !l.fushen), true)
// 卦身子水在上爻（兄子水）
check("卦身标注", chart.lines[0].guashenNote, "卦身为子")

// ─── 锚点2：八宫结构抽查 ───
// 乾宫游魂 = 火地晋（世4），归魂 = 火天大有（世3）
const jinBits = [0, 0, 0, 1, 0, 1] // 坤下离上
check("晋-卦名", hexName(jinBits), "火地晋")
const jinPal = palaceOf(jinBits)
check("晋-宫", jinPal.palace, "乾")
check("晋-游魂世4", [jinPal.seq, jinPal.shiPos], [6, 4])
const dayouBits = [1, 1, 1, 1, 0, 1] // 乾下离上
check("大有-卦名", hexName(dayouBits), "火天大有")
const dayouPal = palaceOf(dayouBits)
check("大有-归魂世3", [dayouPal.palace, dayouPal.seq, dayouPal.shiPos], ["乾", 7, 3])
// 坎宫一世 = 水泽节（世1）
const jiePal = palaceOf(jieBits)
check("节-坎宫一世", [jiePal.palace, jiePal.seq, jiePal.shiPos], ["坎", 1, 1])
// 天风姤 = 乾宫一世
const gouBits = [0, 1, 1, 1, 1, 1]
check("姤-卦名", hexName(gouBits), "天风姤")
check("姤-乾宫一世", [palaceOf(gouBits).palace, palaceOf(gouBits).shiPos], ["乾", 1])

// ─── 锚点3：伏神（天风姤缺妻财，伏乾卦二爻寅木财）───
const gouChart = assembleChart(gouBits, [], "丁", "丑")
check("姤-伏神财寅木", gouChart.lines.find((l) => l.position === 2)?.fushen, "伏神: 财 寅木")

// ─── 锚点4：起卦方式 ───
// 铜钱：9=老阳动 6=老阴动
const coinCast = coinsToLines([7, 9, 8, 6, 7, 8])
check("铜钱-爻象", coinCast.bits, [1, 1, 0, 0, 1, 0])
check("铜钱-动爻", coinCast.moving, [2, 4])
// 卦名起卦：本卦坎上兑下(节) → 变卦震上震下(震)，动爻=差异
const gnCast = guanameGua("坎", "兑", "震", "震")
check("卦名-本卦", hexName(gnCast.bits), "水泽节")
check("卦名-动爻", gnCast.moving, [2, 4, 5])

// ─── 锚点5：一站式 computeLiuyao（卦名起卦全链路）───
const full = computeLiuyao({
  year: 2026, month: 7, day: 2, hour: 12, minute: 43,
  methodKey: "guaname",
  guaPick: { benUp: "坎卦 ☵", benDown: "兑卦 ☱", bianUp: "震卦 ☳", bianDown: "震卦 ☳" },
})
check("全链路-本卦", full.chart.benName, "水泽节(坎)")
check("全链路-干支", full.ganzhi, { year: "丙午年", month: "甲午月", day: "丁丑日", hour: "丙午时" })
check("全链路-空亡", full.kongwang, { year: "寅卯", month: "辰巳", day: "申酉", hour: "寅卯" })
check("全链路-卦辞", full.guaci[0].text[0], "节：亨。苦节不可贞。")

// ─── 锚点6：64卦辞完备性 ───
check("卦辞64条", Object.keys(GUA_CI).length, 64)

console.log(`\n六爻黄金回归：${pass}/${pass + fail} 通过${fail ? "，存在失败！" : ""}`)
if (fail) process.exit(1)
