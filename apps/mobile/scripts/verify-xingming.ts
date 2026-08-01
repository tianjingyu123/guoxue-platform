// ─────────────────────────────────────────────────────────────
// 姓名分析回归脚本：康熙笔画 → 五格 → 数理吉凶 → 三才
// 锚点为主流姓名学网站公认的五格标准值（熊崎氏规则）。
// 运行：npx tsx scripts/verify-xingming.ts
// ─────────────────────────────────────────────────────────────

import { computeWuge, splitName, kangxiStroke, analyzeName, shuliWuxing } from "../src/pkg-paipan2/lib/xingming-engine.ts"

let pass = 0
let fail = 0
function check(label: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ ${label} 期望 ${JSON.stringify(exp)} 实得 ${JSON.stringify(got)}`)
  }
}

console.log("== 康熙笔画锚点 ==")
const strokeRef: [string, number][] = [
  ["刘", 15], ["德", 15], ["华", 14], ["李", 7], ["白", 5], ["王", 4],
  ["张", 11], ["陈", 16], ["杨", 13], ["赵", 14], ["黄", 12], ["周", 8],
  ["吴", 7], ["徐", 10], ["孙", 10], ["马", 10], ["朱", 6], ["胡", 11],
  ["郭", 15], ["林", 8], ["泽", 17], ["东", 8], ["伟", 11], ["静", 16],
]
for (const [ch, exp] of strokeRef) check(`${ch} 康熙 ${exp} 画`, kangxiStroke(ch), exp)

console.log("== 复姓拆分 ==")
check("欧阳修 拆分", splitName("欧阳修"), { surname: "欧阳", given: "修" })
check("司马相如 拆分", splitName("司马相如"), { surname: "司马", given: "相如" })
check("王小明 拆分", splitName("王小明"), { surname: "王", given: "小明" })

console.log("== 五格标准值（主流网站公认锚点） ==")
// 刘德华：劉15 德15 華14 → 天16 人30 地29 外15 总44
const ldh = computeWuge("刘", "德华")
check("刘德华 天格", ldh.tian, 16)
check("刘德华 人格", ldh.ren, 30)
check("刘德华 地格", ldh.di, 29)
check("刘德华 外格", ldh.wai, 15)
check("刘德华 总格", ldh.zong, 44)
// 李白：李7 白5 → 天8 人12 地6 外2 总12
const lb = computeWuge("李", "白")
check("李白 天格", lb.tian, 8)
check("李白 人格", lb.ren, 12)
check("李白 地格", lb.di, 6)
check("李白 外格", lb.wai, 2)
check("李白 总格", lb.zong, 12)
// 王安石：王4 安6 石5 → 天5 人10 地11 外6 总15
const was = computeWuge("王", "安石")
check("王安石 天格", was.tian, 5)
check("王安石 人格", was.ren, 10)
check("王安石 地格", was.di, 11)
check("王安石 外格", was.wai, 6)
check("王安石 总格", was.zong, 15)
// 欧阳修：歐15 陽17 修10 → 天32 人27 地11 外16 总42
const oyx = computeWuge("欧阳", "修")
check("欧阳修 天格", oyx.tian, 32)
check("欧阳修 人格", oyx.ren, 27)
check("欧阳修 地格", oyx.di, 11)
check("欧阳修 外格", oyx.wai, 16)
check("欧阳修 总格", oyx.zong, 42)

console.log("== 数理五行 ==")
check("16 → 土", shuliWuxing(16), "土")
check("30 → 水", shuliWuxing(30), "水")
check("29 → 水", shuliWuxing(29), "水")
check("11 → 木", shuliWuxing(11), "木")
check("23 → 火", shuliWuxing(23), "火")
check("7 → 金", shuliWuxing(7), "金")

console.log("== 全量详批结构 ==")
const d = analyzeName({ fullName: "刘德华", gender: "男" })
check("五格值串", [d.sancaiWuge.tianGe.value, d.sancaiWuge.renGe.value, d.sancaiWuge.diGe.value, d.sancaiWuge.waiGe.value, d.sancaiWuge.zongGe.value], [16, 30, 29, 15, 44])
check("三才为 土水水", d.sancaiWuge.sancai, "土水水")
check("逐字数量", d.charExplains.length, 3)
check("音律声调位数", d.yinlv.tonePattern.length, 3)
check("姓名卦有名称", typeof d.mingGua.name === "string" && d.mingGua.name.length >= 1, true)
check("综合分在 35-99", d.candidate.score >= 35 && d.candidate.score <= 99, true)
check("三才运势四段", d.sancaiWuge.sancaiFortunes.length, 4)

console.log(`\n结果：${pass} 通过 / ${fail} 失败（共 ${pass + fail}）`)
if (fail > 0) process.exit(1)
