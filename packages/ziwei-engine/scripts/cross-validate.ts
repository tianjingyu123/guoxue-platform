/**
 * 紫微斗数交叉验证 — 10组名人命例
 * 对比项目：五行局 / 命宫 / 身宫 / 紫微星 / 四化 / 格局
 */
import { calcZiwei } from "@guoxue/ziwei-engine";
import type { GongWei } from "@guoxue/ziwei-engine";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Solar } = require("lunar-javascript");

// 时辰对应地支
const HOUR_TO_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

interface Case {
  name: string;
  datetime: string;
  gender: "男" | "女";
}

const cases: Case[] = [
  { name: "毛泽东", datetime: "1893-12-26T07:00:00+08:00", gender: "男" },
  { name: "邓小平", datetime: "1904-08-22T11:00:00+08:00", gender: "男" },
  { name: "马云",   datetime: "1964-09-10T06:00:00+08:00", gender: "男" },
  { name: "马化腾", datetime: "1971-10-29T17:00:00+08:00", gender: "男" },
  { name: "雷军",   datetime: "1969-12-16T07:00:00+08:00", gender: "男" },
  { name: "刘德华", datetime: "1961-09-27T06:00:00+08:00", gender: "男" },
  { name: "周杰伦", datetime: "1979-01-18T13:00:00+08:00", gender: "男" },
  { name: "林青霞", datetime: "1954-11-03T17:00:00+08:00", gender: "女" },
  { name: "王菲",   datetime: "1969-08-08T11:00:00+08:00", gender: "女" },
  { name: "刘亦菲", datetime: "1987-08-25T10:00:00+08:00", gender: "女" },
];

console.log("═".repeat(75));
console.log("紫微斗数引擎交叉验证 — 10组名人命例");
console.log("═".repeat(75));

for (const c of cases) {
  const d = new Date(c.datetime);
  const solar = Solar.fromDate(d);

  // 农历信息
  const lunar = solar.getLunar();
  const lunarYear = lunar.getYear();
  const lunarMonth = lunar.getMonth();
  const lunarDay = lunar.getDay();
  const hourIdx = Math.floor(((d.getHours() + 1) % 24) / 2);
  const lunarHourZhi = HOUR_TO_ZHI[hourIdx];

  // 农历年干支（从八字获取）
  const baZi = lunar.getEightChar();
  const yearGan = baZi.getYearGan() as any;
  const yearZhi = baZi.getYearZhi() as any;

  const result = calcZiwei({
    name: c.name,
    gender: c.gender,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    lunarMonth,
    lunarDay,
    lunarHour: lunarHourZhi as any,
    lunarYearGan: yearGan,
    lunarYearZhi: yearZhi,
  });

  const mg = result.mingGong;
  const ziweiGong = result.gongWei.find((g: GongWei) => g.stars.some((s: any) => s.name === "紫微"));

  console.log(`\n${c.name} (${c.gender === "男" ? "男" : "女"})`);
  console.log(`  公历: ${c.datetime}`);
  console.log(`  农历: ${lunarYear}年${lunarMonth}月${lunarDay}日 ${lunarHourZhi}时`);
  console.log(`  年柱: ${yearGan}${yearZhi}`);
  console.log(`  五行局: ${result.wuXingJu}`);
  console.log(`  命宫: ${mg.zhi}(${mg.gan}${mg.zhi})  身宫: ${result.shenGong}`);
  console.log(`  紫微: ${ziweiGong?.name ?? "?"}宫(${ziweiGong?.zhi ?? "?"})`);
  console.log(`  四化: ${result.siHua.huaLu || "?"}化禄 ${result.siHua.huaQuan || "?"}化权 ${result.siHua.huaKe || "?"}化科 ${result.siHua.huaJi || "?"}化忌`);
  console.log(`  格局: ${result.geShi?.join("、") || "?"}`);

  // 大限按年龄排序（顺行时命宫→父母→福德..., 逆行时命宫→兄弟→夫妻...）
  const daXianSorted = [...result.gongWei]
    .sort((a, b) => a.daXianStart - b.daXianStart)
    .slice(0, 6)
    .map((g: GongWei) => `${g.name}(${g.zhi})${g.daXianStart}-${g.daXianEnd}岁`)
    .join(" → ");
  console.log(`  大限: ${daXianSorted}`);
}

console.log("\n" + "═".repeat(75));
console.log("验证完成。对比参考：文墨天机/天机论命");
console.log("═".repeat(75));
