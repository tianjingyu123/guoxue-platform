/**
 * 八字交叉验证 — 10组名人命例
 * 对比项目：四柱 / 十神 / 格局 / 大运 / 神煞
 */
import { calcBazi } from "@guoxue/bazi-engine";

// 10组公开名人八字（时辰部分为推断，仅供参考）
const cases: { name: string; datetime: string; gender: "男" | "女" }[] = [
  { name: "毛泽东", datetime: "1893-12-26T07:00:00+08:00", gender: "男" },
  { name: "周恩来", datetime: "1898-03-05T07:00:00+08:00", gender: "男" },
  { name: "邓小平", datetime: "1904-08-22T11:00:00+08:00", gender: "男" },
  { name: "马云",   datetime: "1964-09-10T06:00:00+08:00", gender: "男" },
  { name: "马化腾", datetime: "1971-10-29T17:00:00+08:00", gender: "男" },
  { name: "雷军",   datetime: "1969-12-16T07:00:00+08:00", gender: "男" },
  { name: "刘德华", datetime: "1961-09-27T06:00:00+08:00", gender: "男" },
  { name: "周杰伦", datetime: "1979-01-18T13:00:00+08:00", gender: "男" },
  { name: "林青霞", datetime: "1954-11-03T17:00:00+08:00", gender: "女" },
  { name: "王菲",   datetime: "1969-08-08T11:00:00+08:00", gender: "女" },
];

console.log("═".repeat(75));
console.log("八字引擎交叉验证 — 10组名人命例");
console.log("═".repeat(75));

for (const c of cases) {
  const d = new Date(c.datetime);
  const result = calcBazi({
    name: c.name,
    gender: c.gender,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  });

  const bz = result.siZhu;
  const geju = result.geJu;
  const dayun = result.qiYun;

  console.log(`\n${c.name} (${c.gender === "男" ? "男" : "女"})`);
  console.log(`  公历: ${c.datetime}`);
  console.log(`  四柱: ${bz.nian.gan}${bz.nian.zhi} ${bz.yue.gan}${bz.yue.zhi} ${bz.ri.gan}${bz.ri.zhi} ${bz.shi.gan}${bz.shi.zhi}`);
  console.log(`  日主: ${bz.ri.gan}(${bz.ri.ganShiShen})  纳音: ${bz.nian.nayin} ${bz.yue.nayin} ${bz.ri.nayin} ${bz.shi.nayin}`);
  console.log(`  格局: ${geju?.name ?? "?"}  ${geju?.desc ?? ""}`);
  console.log(`  起运: ${dayun.startAge}岁${dayun.startYear ? " " + dayun.startYear + "年" : ""}  ${dayun.desc}`);
  console.log(`  大运: ${dayun.daYun?.slice(0, 5).map((y: any) => y.ganZhi).join(" → ")}`);

  if (result.shenSha?.length) {
    const shaList = result.shenSha.slice(0, 10).map((s: any) => s.name).join("、");
    console.log(`  神煞: ${shaList}`);
  }
}

console.log("\n" + "═".repeat(75));
console.log("验证完成。对比参考：问真八字/热卜排盘");
console.log("═".repeat(75));
