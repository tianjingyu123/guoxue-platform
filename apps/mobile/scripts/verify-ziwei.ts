/**
 * 紫微斗数黄金测试（基准 = 竞品「吉真紫微」截图 2026-07-03，docs/ziwei-baseline/）
 * 案例1 男主测试：1977-12-01 05:04 北京（真太阳时同值）
 * 案例2 女主测试：2009-12-11 12:09 乌鲁木齐（真太阳时 10:06）
 * 运行：npx tsx scripts/verify-ziwei.ts
 */
import { computeZiwei, ZW_ZHI, type ZiweiResult } from '../src/pkg-paipan/lib/ziwei-engine'

let pass = 0
let fail = 0
const ok = (cond: boolean, label: string, got?: unknown, want?: unknown) => {
  if (cond) {
    pass++
  } else {
    fail++
    console.log(`  ✗ ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)
  }
}

const palaceByZhi = (r: ZiweiResult, zhi: number) => r.palaces.find((p) => p.zhi === zhi)!
const majorsStr = (r: ZiweiResult, zhi: number) =>
  palaceByZhi(r, zhi).majors.map((s) => s.name + s.bright + (s.hua ? `化${s.hua}` : "")).join(",")
const minorNames = (r: ZiweiResult, zhi: number) => palaceByZhi(r, zhi).minors.map((s) => s.name + s.bright).join(",")

// ═══ 案例1：男主测试 1977-12-01 05:04（卯时）阴男 ═══
console.log("── 案例1 男主测试 1977-12-01 05:04 北京 ──")
const m = computeZiwei({ year: 1977, month: 12, day: 1, hour: 5, minute: 4, gender: "男" })

ok(m.lunar.text === "丁巳年十月廿一", "农历", m.lunar.text, "丁巳年十月廿一")
ok(m.hourZhi === "卯", "时辰", m.hourZhi, "卯")
ok(`${m.sizhu.year} ${m.sizhu.month} ${m.sizhu.day} ${m.sizhu.hour}` === "丁巳 辛亥 壬辰 癸卯", "四柱",
  `${m.sizhu.year} ${m.sizhu.month} ${m.sizhu.day} ${m.sizhu.hour}`, "丁巳 辛亥 壬辰 癸卯")
ok(m.yinYang === "阴", "阴阳", m.yinYang, "阴")
ok(m.wuxingJu === "土五局", "五行局", m.wuxingJu, "土五局")
ok(ZW_ZHI[m.mingIdx] === "申", "命宫支", ZW_ZHI[m.mingIdx], "申")
ok(palaceByZhi(m, 8).ganzhi === "戊申", "命宫干支", palaceByZhi(m, 8).ganzhi, "戊申")
ok(ZW_ZHI[m.shenIdx] === "寅", "身宫支", ZW_ZHI[m.shenIdx], "寅")
ok(palaceByZhi(m, 2).name === "迁移", "身宫=迁移", palaceByZhi(m, 2).name, "迁移")
ok(m.mingzhu === "廉贞", "命主", m.mingzhu, "廉贞")
ok(m.shenzhu === "天机", "身主", m.shenzhu, "天机")
ok(m.zidou === "午", "子斗", m.zidou, "午")
ok(m.sihua.map((s) => s.star).join(",") === "太阴,天同,天机,巨门", "丁年四化",
  m.sihua.map((s) => s.star).join(","), "太阴,天同,天机,巨门")

// 十四主星逐宫（星名+亮度+四化）
const M_MAJORS: Record<number, string> = {
  5: "天同庙化权", 6: "武曲旺,天府旺", 7: "太阳得,太阴不化禄", 8: "贪狼平",
  9: "天机旺化科,巨门庙化忌", 10: "紫微得,天相得", 11: "天梁陷", 0: "七杀旺",
  1: "", 2: "廉贞庙", 3: "", 4: "破军旺",
}
for (const [zhi, want] of Object.entries(M_MAJORS)) ok(majorsStr(m, +zhi) === want, `主星@${ZW_ZHI[+zhi]}`, majorsStr(m, +zhi), want)

// 六吉六煞禄马
const M_MINORS: Record<number, string> = {
  5: "陀罗陷", 6: "禄存庙,火星庙", 7: "文昌利,文曲旺,擎羊庙", 8: "地空庙",
  9: "天钺庙", 10: "", 11: "天魁旺,天马平", 0: "", 1: "左辅庙,右弼庙,铃星得", 2: "地劫平", 3: "", 4: "",
}
for (const [zhi, want] of Object.entries(M_MINORS)) {
  const got = minorNames(m, +zhi).split(",").sort().join(",")
  const w = want ? want.split(",").sort().join(",") : ""
  ok(got === w, `吉煞@${ZW_ZHI[+zhi]}`, got, w)
}

// 长生十二神（阴男逆行，土五局长生申）+ 博士（禄存午起逆）
const M_CS: Record<number, string> = { 8: "长生", 7: "沐浴", 6: "冠带", 5: "临官", 4: "帝旺", 3: "衰", 2: "病", 1: "死", 0: "墓", 11: "绝", 10: "胎", 9: "养" }
for (const [zhi, want] of Object.entries(M_CS)) ok(palaceByZhi(m, +zhi).changsheng === want, `长生@${ZW_ZHI[+zhi]}`, palaceByZhi(m, +zhi).changsheng, want)
ok(palaceByZhi(m, 6).boshi === "博士", "博士@午", palaceByZhi(m, 6).boshi, "博士")
ok(palaceByZhi(m, 5).boshi === "力士", "力士@巳", palaceByZhi(m, 5).boshi, "力士")

// 大限（阴男逆行，起5）
const M_DX: Record<number, string> = { 8: "5-14", 7: "15-24", 6: "25-34", 5: "35-44", 4: "45-54", 3: "55-64", 2: "65-74", 1: "75-84", 0: "85-94" }
for (const [zhi, want] of Object.entries(M_DX)) ok(palaceByZhi(m, +zhi).daxian === want, `大限@${ZW_ZHI[+zhi]}`, palaceByZhi(m, +zhi).daxian, want)

// 将前/岁前（巳年：将星酉、岁建巳）
ok(palaceByZhi(m, 9).jiangqian === "将星", "将星@酉", palaceByZhi(m, 9).jiangqian, "将星")
ok(palaceByZhi(m, 5).suiqian === "岁建", "岁建@巳", palaceByZhi(m, 5).suiqian, "岁建")

// ═══ 案例2：女主测试 2009-12-11 12:09 乌鲁木齐（东经87.6，真太阳时10:06 巳时）阴女 ═══
console.log("── 案例2 女主测试 2009-12-11 12:09 乌鲁木齐 ──")
const f = computeZiwei({ year: 2009, month: 12, day: 11, hour: 12, minute: 9, gender: "女", useTrueSolar: true, lng: 87.6 })

// 竞品显示10:06，我方EoT模型得10:05:03（差约1分钟，属均时差模型舍入差异；时辰同为巳，全盘一致）
ok(
  f.adjusted.getHours() === 10 && [5, 6].includes(f.adjusted.getMinutes()),
  "真太阳时(±1分钟)", `${f.adjusted.getHours()}:${f.adjusted.getMinutes()}`, "10:05~10:06",
)
ok(f.lunar.text === "己丑年十月廿五", "农历", f.lunar.text, "己丑年十月廿五")
ok(f.hourZhi === "巳", "时辰", f.hourZhi, "巳")
ok(`${f.sizhu.year} ${f.sizhu.month} ${f.sizhu.day} ${f.sizhu.hour}` === "己丑 丙子 庚寅 辛巳", "四柱",
  `${f.sizhu.year} ${f.sizhu.month} ${f.sizhu.day} ${f.sizhu.hour}`, "己丑 丙子 庚寅 辛巳")
ok(f.wuxingJu === "土五局", "五行局", f.wuxingJu, "土五局")
ok(palaceByZhi(f, 6).ganzhi === "庚午" && palaceByZhi(f, 6).isMing, "命宫庚午", palaceByZhi(f, 6).ganzhi, "庚午")
ok(palaceByZhi(f, 4).name === "夫妻" && palaceByZhi(f, 4).isShen, "身宫=夫妻辰", palaceByZhi(f, 4).name, "夫妻")
ok(f.mingzhu === "破军", "命主", f.mingzhu, "破军")
ok(f.shenzhu === "天相", "身主", f.shenzhu, "天相")
ok(f.zidou === "申", "子斗", f.zidou, "申")
ok(f.sihua.map((s) => s.star).join(",") === "武曲,贪狼,天梁,文曲", "己年四化",
  f.sihua.map((s) => s.star).join(","), "武曲,贪狼,天梁,文曲")

const F_MAJORS: Record<number, string> = {
  5: "天机平", 6: "紫微庙", 7: "", 8: "破军得", 9: "", 10: "廉贞利,天府庙", 11: "太阴庙",
  0: "贪狼旺化权", 1: "天同不,巨门不", 2: "武曲得化禄,天相庙", 3: "太阳庙,天梁庙化科", 4: "七杀庙",
}
for (const [zhi, want] of Object.entries(F_MAJORS)) ok(majorsStr(f, +zhi) === want, `主星@${ZW_ZHI[+zhi]}`, majorsStr(f, +zhi), want)

const F_MINORS: Record<number, string> = {
  5: "文昌庙,陀罗陷", 6: "禄存庙,地空庙", 7: "擎羊庙", 8: "天钺庙,火星陷",
  9: "文曲庙化忌", 10: "", 11: "天马平", 0: "天魁旺", 1: "左辅庙,右弼庙", 2: "", 3: "铃星利", 4: "地劫陷",
}
for (const [zhi, want] of Object.entries(F_MINORS)) {
  const gotWithHua = palaceByZhi(f, +zhi).minors.map((s) => s.name + s.bright + (s.hua ? `化${s.hua}` : "")).sort().join(",")
  const w = want ? want.split(",").sort().join(",") : ""
  ok(gotWithHua === w, `吉煞@${ZW_ZHI[+zhi]}`, gotWithHua, w)
}

// 长生（阴女顺行，长生申）+ 博士（禄存午起顺）
const F_CS: Record<number, string> = { 8: "长生", 9: "沐浴", 10: "冠带", 11: "临官", 0: "帝旺", 1: "衰", 2: "病", 3: "死", 4: "墓", 5: "绝", 6: "胎", 7: "养" }
for (const [zhi, want] of Object.entries(F_CS)) ok(palaceByZhi(f, +zhi).changsheng === want, `长生@${ZW_ZHI[+zhi]}`, palaceByZhi(f, +zhi).changsheng, want)
ok(palaceByZhi(f, 6).boshi === "博士", "博士@午", palaceByZhi(f, 6).boshi, "博士")

// 大限（阴女顺行）
const F_DX: Record<number, string> = { 6: "5-14", 7: "15-24", 8: "25-34", 9: "35-44", 10: "45-54", 11: "55-64", 0: "65-74", 1: "75-84", 2: "85-94" }
for (const [zhi, want] of Object.entries(F_DX)) ok(palaceByZhi(f, +zhi).daxian === want, `大限@${ZW_ZHI[+zhi]}`, palaceByZhi(f, +zhi).daxian, want)

// 将前/岁前（丑年：将星酉、岁建丑）+ 小限（丑年起未女逆:未宫1岁）
ok(palaceByZhi(f, 9).jiangqian === "将星", "将星@酉", palaceByZhi(f, 9).jiangqian, "将星")
ok(palaceByZhi(f, 1).suiqian === "岁建", "岁建@丑", palaceByZhi(f, 1).suiqian, "岁建")
ok(palaceByZhi(f, 7).xiaoxian.includes("1,13,25"), "小限@未", palaceByZhi(f, 7).xiaoxian, "1,13,25...")
ok(palaceByZhi(f, 5).liunianAges.includes("5,17,29"), "流年@巳", palaceByZhi(f, 5).liunianAges, "5,17,29...")

console.log(`\n结果：${pass}/${pass + fail} 通过${fail ? `，${fail} 失败` : ""}`)
process.exit(fail ? 1 : 0)
