/* eslint-disable no-console */
/**
 * 万年历数据预计算种子脚本
 *
 * 生成 1900-2100 年全量万年历日数据并写入 WanNianLiDay 表。
 * lunar-javascript 提供农历/干支/二十八宿/生肖，bazi-engine 提供精确节气时刻。
 *
 * 用法: cd apps/server && npx ts-node --compiler-options '{"module":"CommonJS"}' ../../scripts/seed-wannianli.ts
 */

import { PrismaClient } from "@prisma/client";
import { Solar } from "lunar-javascript";
import { calcAllJieQi } from "@guoxue/bazi-engine";

const prisma = new PrismaClient();

const START_YEAR = 1900;
const END_YEAR = 2100;
const BATCH_SIZE = 2000;

/** 解析 "甲子年"/"丙寅月" 为干支字符串 */
function parseGZ(text: string): string {
  if (!text) return "甲子";
  const m = text.match(/^([一-鿿]{2})/);
  return m ? m[1] : text.slice(0, 2);
}

function splitGZ(gz: string): [string, string] {
  return [gz[0] || "甲", gz[1] || "子"];
}

async function main() {
  console.log(`万年历数据生成: ${START_YEAR}-${END_YEAR}`);
  console.log("=".repeat(50));

  const existingCount = await prisma.wanNianLiDay.count();
  if (existingCount > 0) {
    console.log(`数据库已有 ${existingCount} 条记录，清空中...`);
    await prisma.wanNianLiDay.deleteMany();
    console.log("已清空");
  }

  // 预计算每年节气
  console.log("预计算节气数据...");
  const jieQiCache = new Map<number, Map<string, string>>();
  for (let y = START_YEAR; y <= END_YEAR; y++) {
    const allJq = calcAllJieQi(y);
    const dateMap = new Map<string, string>();
    for (const [name, info] of allJq) {
      dateMap.set(
        `${y}-${String(info.month).padStart(2, "0")}-${String(info.day).padStart(2, "0")}`,
        name,
      );
    }
    jieQiCache.set(y, dateMap);
  }

  const startTime = Date.now();
  let batch: any[] = [];
  let totalInserted = 0;

  // 逐日迭代
  const endDate = new Date(Date.UTC(END_YEAR + 1, 0, 1));
  let currentDate = new Date(Date.UTC(START_YEAR, 0, 1));

  while (currentDate < endDate) {
    const y = currentDate.getUTCFullYear();
    const m = currentDate.getUTCMonth() + 1;
    const d = currentDate.getUTCDate();

    const solar = Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();

    const lunarMonthAbs = Math.abs(lunar.getMonth());
    const isLeap = lunar.getMonth() < 0;

    const yGz = parseGZ(lunar.getYearInGanZhi());
    const mGz = parseGZ(lunar.getMonthInGanZhi());
    const dGz = parseGZ(lunar.getDayInGanZhi());
    const [nianGan, nianZhi] = splitGZ(yGz);
    const [yueGan, yueZhi] = splitGZ(mGz);
    const [riGan, riZhi] = splitGZ(dGz);

    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const jieQi = jieQiCache.get(y)?.get(dateKey) ?? null;

    let xiu = "";
    try { xiu = lunar.getXiu() || ""; } catch { /* noop */ }

    let shengXiao = "";
    try { shengXiao = lunar.getYearShengXiao() || ""; } catch { /* noop */ }

    batch.push({
      solarDate: currentDate,
      lunarYear: lunar.getYear(),
      lunarMonth: lunarMonthAbs,
      lunarDay: lunar.getDay(),
      isLeap,
      nianGan,
      nianZhi,
      yueGan,
      yueZhi,
      riGan,
      riZhi,
      lunarYearGZ: yGz,
      lunarMonthGZ: mGz,
      lunarDayGZ: dGz,
      jieQi,
      erShiBaXiu: xiu,
      shengXiao,
      weekDay: currentDate.getUTCDay(),
    });

    // 推进到下一日（UTC 无 DST 问题）
    currentDate = new Date(currentDate.getTime() + 86400000);

    if (batch.length >= BATCH_SIZE) {
      try {
        await prisma.wanNianLiDay.createMany({ data: batch, skipDuplicates: true });
        totalInserted += batch.length;
      } catch (err: any) {
        console.error(`\n批量插入失败 y=${y}: ${err.message}`);
      }
      batch = [];
      const el = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (totalInserted / ((Date.now() - startTime) / 1000)).toFixed(0);
      process.stdout.write(`\r  ${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")} | ${totalInserted} 条 | ${el}s | ~${rate}/s`);
    }
  }

  // 最后一批
  if (batch.length > 0) {
    await prisma.wanNianLiDay.createMany({ data: batch, skipDuplicates: true });
    totalInserted += batch.length;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n完成: ${totalInserted} 条记录，耗时 ${elapsed}s`);

  const min = await prisma.wanNianLiDay.findFirst({ orderBy: { solarDate: "asc" } });
  const max = await prisma.wanNianLiDay.findFirst({ orderBy: { solarDate: "desc" } });
  console.log(`范围: ${min?.solarDate?.toISOString().slice(0,10)} ~ ${max?.solarDate?.toISOString().slice(0,10)}`);
}


main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
