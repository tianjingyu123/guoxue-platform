/**
 * 起名引擎回归脚本（黄金基准）
 * 校验：喜用神提取、候选名五行匹配、三才五格过滤、固定字/屏蔽字、音形义李评分边界。
 * 运行：npx tsx scripts/verify-qiming.ts
 */
import { generateNames } from "../src/pkg-paipan2/lib/qiming-engine.ts"
import { kangxiStroke, charWuxingOf, computeWuge, shuliLuckOf } from "../src/pkg-paipan2/lib/xingming-engine.ts"

let pass = 0
let fail = 0
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

// 案例1：男 双字 经典风 1992-08-16 10:30（壬申年 日主甲木）
const r1 = generateNames({
  surname: "孙", gender: "男", nameType: "double", style: "classic",
  year: 1992, month: 8, day: 16, hour: 10, minute: 30, city: "北京",
})
ok("案例1 生肖=猴", r1.profile.shengxiao === "猴", `→ ${r1.profile.shengxiao}`)
ok("案例1 星座=狮子座", r1.profile.xingzuo === "狮子座", `→ ${r1.profile.xingzuo}`)
ok("案例1 喜用神非空", r1.profile.xiyong.length > 0, `→ ${r1.profile.xiyong.join()}`)
ok("案例1 返回≥6个候选", r1.candidates.length >= 6, `→ ${r1.candidates.length}`)
// chars[0] 为姓氏，名字部分从下标 1 开始
ok("案例1 候选均为双字（姓+2字）", r1.candidates.every((c) => c.chars.length === 3))
ok(
  "案例1 名字用字五行均在喜用内",
  r1.candidates.every((c) => c.chars.slice(1).every((x) => r1.profile.xiyong.includes(x.wuxing as never))),
  `→ ${r1.candidates.slice(0, 4).map((c) => c.chars.slice(1).map((x) => x.wuxing).join()).join(" | ")}`,
)
ok("案例1 综合分降序", r1.candidates.every((c, i, a) => i === 0 || a[i - 1].score >= c.score))
ok("案例1 分数在55-99", r1.candidates.every((c) => c.score >= 55 && c.score <= 99))

// 三才五格底线：所有候选的人格/总格数理不应为"凶"占多数
for (const c of r1.candidates.slice(0, 3)) {
  const given = c.chars.slice(1).map((x) => x.char).join("")
  const wuge = computeWuge("孙", given)
  const lucks = [wuge.ren, wuge.zong].map(shuliLuckOf)
  ok(`案例1 「孙${given}」人/总格无双凶`, lucks.filter((l) => l === "凶").length < 2, `→ ${lucks.join()}`)
}

// 案例2：女 单字 清新风
const r2 = generateNames({
  surname: "李", gender: "女", nameType: "single", style: "fresh",
  year: 2024, month: 3, day: 12, hour: 9, minute: 0,
})
ok("案例2 候选均为单字（姓+1字）", r2.candidates.every((c) => c.chars.length === 2), `→ ${r2.candidates.map((c) => c.chars.length).join()}`)
ok("案例2 生肖=龙", r2.profile.shengxiao === "龙", `→ ${r2.profile.shengxiao}`)
ok("案例2 返回≥4个候选", r2.candidates.length >= 4, `→ ${r2.candidates.length}`)

// 案例3：固定字（中间位）+ 屏蔽字
const r3 = generateNames({
  surname: "王", gender: "男", nameType: "double", style: "classic",
  year: 2000, month: 6, day: 15, hour: 14, minute: 0,
  fixChar: "泽", fixPosition: "middle", blockChars: "强刚",
})
ok("案例3 固定字「泽」在中间位", r3.candidates.every((c) => c.chars[1].char === "泽"), `→ ${r3.candidates.slice(0, 5).map((c) => c.chars.map((x) => x.char).join("")).join()}`)
ok("案例3 屏蔽字未出现", r3.candidates.every((c) => !c.chars.some((x) => x.char === "强" || x.char === "刚")))

// 案例4：康熙笔画与五行标注一致性（抽查候选第一名）
const top = r1.candidates[0]
for (const ch of top.chars) {
  ok(`案例4 「${ch.char}」笔画=字典值`, ch.strokes === kangxiStroke(ch.char), `→ ${ch.strokes} vs ${kangxiStroke(ch.char)}`)
  ok(`案例4 「${ch.char}」五行=字典值`, ch.wuxing === charWuxingOf(ch.char), `→ ${ch.wuxing}`)
}

// 案例5：拼音与声调非空
ok("案例5 候选拼音齐全", r1.candidates.every((c) => c.chars.every((x) => x.pinyin && x.tone >= 1 && x.tone <= 4)))

// 案例6：生肖姓名学
import { assessCharForZodiac, SHENGXIAO_RULES } from "../src/pkg-paipan2/lib/shengxiao-naming.ts"
ok("案例6 十二生肖规则齐全", Object.keys(SHENGXIAO_RULES).length === 12, `→ ${Object.keys(SHENGXIAO_RULES).join()}`)
// 字根匹配抽样（喜/忌/无关各若干）
const sxCases: [string, string, "fav" | "bad" | "none"][] = [
  ["宇", "鼠", "fav"], ["明", "鼠", "bad"], ["骏", "鼠", "bad"],
  ["芷", "牛", "fav"], ["悦", "牛", "bad"],
  ["峻", "虎", "fav"], ["仁", "虎", "bad"],
  ["泽", "龙", "fav"], ["安", "龙", "bad"],
  ["铭", "兔", "bad"], ["涵", "马", "bad"], ["家", "猪", "fav"],
]
for (const [ch, zx, exp] of sxCases) {
  const a = assessCharForZodiac(ch, zx)
  const got = a.score > 0 ? "fav" : a.score < 0 ? "bad" : "none"
  ok(`案例6 「${ch}」对生肖${zx}判定=${exp}`, got === exp, `→ ${got} (${a.score})`)
}
// 集成校验：猴年候选（案例1）——凡候选用字命中生肖喜根者简评应注明
const briefHasSx = r1.candidates.some((c) => c.brief.includes("生肖猴"))
ok("案例6 猴年候选简评含生肖喜忌说明", briefHasSx, `→ ${r1.candidates[0]?.brief}`)
// 集成校验：档案说明包含生肖喜忌总说
ok("案例6 档案注记含生肖总说", r1.profile.xiyongNote.includes("生肖猴"), `→ ${r1.profile.xiyongNote.slice(-50)}`)
// 集成校验：命中两个忌根的字被淘汰（马年忌氵与子鼠根，如「涵」命中氵——单忌降分不淘汰；此处验证降分生效）
const rMa = generateNames({
  surname: "陈", gender: "男", nameType: "double", style: "steady",
  year: 2014, month: 7, day: 10, hour: 11, minute: 0,
})
ok("案例6 马年生肖=马", rMa.profile.shengxiao === "马", `→ ${rMa.profile.shengxiao}`)
const maBadChars = rMa.candidates.flatMap((c) => c.chars.slice(1)).filter((x) => {
  const a = assessCharForZodiac(x.char, "马")
  return a.badHits.length >= 2
})
ok("案例6 马年候选无双忌根用字", maBadChars.length === 0, `→ ${maBadChars.map((x) => x.char).join()}`)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
if (fail > 0) process.exit(1)
