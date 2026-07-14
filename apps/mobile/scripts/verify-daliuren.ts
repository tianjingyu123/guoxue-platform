// 大六壬黄金测试：竞品截图 2026-07-02 丁丑日两案例逐值验证
// 运行：npx tsx scripts/verify-daliuren.ts
import { computeLiuren } from "../src/pkg-paipan/lib/daliuren-engine.ts"

let pass = 0, fail = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; console.log(`  ✓ ${name}: ${g}`) }
  else { fail++; console.log(`  ❌ ${name}: got=${g} want=${w}`) }
}

// ─── 案例1：2026-07-02 12:58 丙午时（竞品竖版+横版截图）───
console.log("案例1：2026-07-02 12:58（丁丑日丙午时，重审·进茹·流金）")
{
  const r = computeLiuren(new Date(2026, 6, 2, 12, 58), { birthYear: 1990, gender: "男" })
  eq("年柱", r.sizhu.year.gan + r.sizhu.year.zhi, "丙午")
  eq("月柱", r.sizhu.month.gan + r.sizhu.month.zhi, "甲午")
  eq("日柱", r.sizhu.day.gan + r.sizhu.day.zhi, "丁丑")
  eq("时柱", r.sizhu.hour.gan + r.sizhu.hour.zhi, "丙午")
  eq("月将", r.yuejiang.zhi, "未")
  eq("空亡", r.kongwang, ["申", "酉"])
  eq("年命", r.ming?.nianming, "庚午")
  eq("行年", r.ming?.xingnian, "壬寅")
  // 天盘：未加午（地盘午上天盘未）
  eq("天盘午位", r.tianPan["午"], "未")
  eq("天盘戌位", r.tianPan["戌"], "亥")
  // 四课：丁×申 申×酉 丑×寅 寅×卯
  eq("一课", [r.sike[0].xia, r.sike[0].shang], ["丁", "申"])
  eq("二课", [r.sike[1].xia, r.sike[1].shang], ["申", "酉"])
  eq("三课", [r.sike[2].xia, r.sike[2].shang], ["丑", "寅"])
  eq("四课", [r.sike[3].xia, r.sike[3].shang], ["寅", "卯"])
  // 三传：申酉戌 遁○○甲 六亲财财子
  eq("三传", r.sanchuan.map((c) => c.zhi), ["申", "酉", "戌"])
  eq("三传遁干", r.sanchuan.map((c) => c.dun), ["", "", "甲"])
  eq("三传六亲", r.sanchuan.map((c) => c.qin), ["财", "财", "子"])
  eq("三传空亡", r.sanchuan.map((c) => c.kong), [true, true, false])
  // 课体
  eq("课体含重审", r.keti.includes("重审"), true)
  eq("课体含进茹", r.keti.includes("进茹"), true)
  eq("课体含流金", r.keti.includes("流金"), true)
  // 贵人：丁日昼贵亥，落地盘戌 → 逆布
  eq("贵人支", r.guiren.zhi, "亥")
  eq("昼贵", r.guiren.isDay, true)
  eq("逆布", r.guiren.shun, false)
  // 天将盘（竖版截图逐宫，顶行=地盘巳午未申）：巳龙(壬午) 午勾(癸未) 未合(○申) 申朱(○酉) 酉蛇(甲戌) 戌贵(乙亥) 亥后(丙子) 子阴(丁丑) 丑玄(戊寅) 寅常(己卯) 卯虎(庚辰) 辰空(辛巳)
  eq("天将·地盘戌", r.jiangPan["戌"], "贵")
  eq("天将·地盘酉", r.jiangPan["酉"], "蛇")
  eq("天将·地盘申", r.jiangPan["申"], "朱")
  eq("天将·地盘未", r.jiangPan["未"], "合")
  eq("天将·地盘午", r.jiangPan["午"], "勾")
  eq("天将·地盘巳", r.jiangPan["巳"], "龙")
  eq("天将·地盘辰", r.jiangPan["辰"], "空")
  eq("天将·地盘卯", r.jiangPan["卯"], "虎")
  eq("天将·地盘寅", r.jiangPan["寅"], "常")
  eq("天将·地盘丑", r.jiangPan["丑"], "玄")
  eq("天将·地盘子", r.jiangPan["子"], "阴")
  eq("天将·地盘亥", r.jiangPan["亥"], "后")
  // 遁干盘（竖版截图）：地盘巳位天盘午遁壬、午位未遁癸、酉位戌遁甲、戌位亥遁乙、亥位子遁丙、子位丑遁丁、丑位寅遁戊、寅位卯遁己、卯位辰遁庚、辰位巳遁辛
  eq("遁干·地盘巳(午)", r.dunPan["巳"], "壬")
  eq("遁干·地盘午(未)", r.dunPan["午"], "癸")
  eq("遁干·地盘未(申空)", r.dunPan["未"], "")
  eq("遁干·地盘酉(戌)", r.dunPan["酉"], "甲")
  eq("遁干·地盘戌(亥)", r.dunPan["戌"], "乙")
  eq("遁干·地盘子(丑)", r.dunPan["子"], "丁")
}

// ─── 案例2：2026-07-02 14:58 丁未时（伏吟）───
console.log("案例2：2026-07-02 14:58（丁丑日丁未时，伏吟·自信·稼穑·游子·三奇）")
{
  const r = computeLiuren(new Date(2026, 6, 2, 14, 58), { birthYear: 1990, gender: "男" })
  eq("时柱", r.sizhu.hour.gan + r.sizhu.hour.zhi, "丁未")
  // 伏吟：天盘=地盘
  eq("天盘子位", r.tianPan["子"], "子")
  // 三传：丑戌未 遁丁甲癸 六亲子子子
  eq("三传", r.sanchuan.map((c) => c.zhi), ["丑", "戌", "未"])
  eq("三传遁干", r.sanchuan.map((c) => c.dun), ["丁", "甲", "癸"])
  eq("三传六亲", r.sanchuan.map((c) => c.qin), ["子", "子", "子"])
  // 课体
  eq("课体含伏吟自信", r.keti.some((k) => k.includes("自信")), true)
  eq("课体含稼穑", r.keti.includes("稼穑"), true)
  eq("课体含游子", r.keti.includes("游子"), true)
  eq("课体含三奇", r.keti.includes("三奇"), true)
  // 贵人：丁日未时昼贵亥，伏吟亥在亥 → 顺布
  eq("贵人支", r.guiren.zhi, "亥")
  eq("顺布", r.guiren.shun, true)
  // 天将（横版截图三传天将：丑=朱 戌=后 未=常）
  eq("天将·丑", r.jiangPan["丑"], "朱")
  eq("天将·戌", r.jiangPan["戌"], "后")
  eq("天将·未", r.jiangPan["未"], "常")
}

console.log(`\n结果：${pass}/${pass + fail} 通过${fail > 0 ? `，${fail} 失败` : ""}`)
process.exit(fail > 0 ? 1 : 0)
