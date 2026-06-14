/* eslint-disable no-console */
/**
 * 万年历交叉验证脚本
 *
 * 验证项：
 *   1. bazi-engine 节气 vs 数据库节气日期
 *   2. bazi-engine 日干支 vs 数据库日干支
 *   3. 数据完整性（无断天、无重复）
 *
 * 用法: npx ts-node --compiler-options '{"module":"CommonJS"}' ../../scripts/validate-wannianli.ts
 */

import { PrismaClient } from "@prisma/client";
import { calcAllJieQi, calcRiZhu } from "@guoxue/bazi-engine";

const prisma = new PrismaClient();

interface ValidationResult {
  jieQiMatch: number;
  jieQiMismatch: { date: string; db: string; calc: string }[];
  riZhuMatch: number;
  riZhuMismatch: { date: string; db: string; calc: string }[];
  gaps: string[];
  duplicates: string[];
}

async function main() {
  console.log("万年历交叉验证");
  console.log("=".repeat(50));

  const result: ValidationResult = {
    jieQiMatch: 0,
    jieQiMismatch: [],
    riZhuMatch: 0,
    riZhuMismatch: [],
    gaps: [],
    duplicates: [],
  };

  // 1. 节气验证 — bazi-engine vs DB
  console.log("\n1. 节气验证 (1900-2100)...");
  const totalYears = 2100 - 1900 + 1;
  let yearCount = 0;

  for (let year = 1900; year <= 2100; year++) {
    // bazi-engine 节气
    const allJq = calcAllJieQi(year);

    // DB 中该年的节气
    const dbJieQis = await prisma.wanNianLiDay.findMany({
      where: {
        jieQi: { not: null },
        solarDate: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { solarDate: true, jieQi: true },
      orderBy: { solarDate: "asc" },
    });

    const dbJqByDate = new Map<string, string>();
    for (const row of dbJieQis) {
      const dStr = row.solarDate.toISOString().slice(0, 10);
      dbJqByDate.set(dStr, row.jieQi!);
    }

    // 对比每个节气
    for (const [jqName, info] of allJq) {
      const dateStr = `${year}-${String(info.month).padStart(2, "0")}-${String(info.day).padStart(2, "0")}`;
      const dbJqName = dbJqByDate.get(dateStr);

      if (dbJqName === jqName) {
        result.jieQiMatch++;
      } else {
        result.jieQiMismatch.push({
          date: dateStr,
          db: dbJqName ?? "(缺失)",
          calc: jqName,
        });
      }
    }

    yearCount++;
    if (yearCount % 50 === 0) {
      process.stdout.write(`\r  进度: ${yearCount}/${totalYears} 年`);
    }
  }
  console.log(`\r  节气匹配: ${result.jieQiMatch}, 不匹配: ${result.jieQiMismatch.length}`);

  // 2. 日干支验证（抽样：每月1日和15日）
  console.log("\n2. 日干支验证（每月1日+15日抽样）...");

  for (let year = 1900; year <= 2100; year++) {
    for (let month = 1; month <= 12; month++) {
      for (const day of [1, 15]) {
        const date = new Date(Date.UTC(year, month - 1, day));
        const dbRow = await prisma.wanNianLiDay.findUnique({
          where: { solarDate: date },
          select: { riGan: true, riZhi: true },
        });
        if (!dbRow) continue;

        // bazi-engine 日干支
        const calcGzObj = calcRiZhu(year, month, day);
        const calcGz = calcGzObj.ganZhi;
        const dbGz = dbRow.riGan + dbRow.riZhi;

        if (calcGz === dbGz) {
          result.riZhuMatch++;
        } else {
          result.riZhuMismatch.push({
            date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            db: dbGz,
            calc: calcGz,
          });
        }
      }
    }
    if (year % 50 === 0) {
      process.stdout.write(`\r  进度: ${year}/2100`);
    }
  }
  console.log(`\r  日干支匹配: ${result.riZhuMatch}, 不匹配: ${result.riZhuMismatch.length}`);

  // 3. 数据完整性检查
  console.log("\n3. 数据完整性检查...");

  const allRecords = await prisma.wanNianLiDay.findMany({
    select: { solarDate: true },
    orderBy: { solarDate: "asc" },
  });

  // 检查首尾
  const first = allRecords[0]?.solarDate;
  const last = allRecords[allRecords.length - 1]?.solarDate;
  console.log(`  记录数: ${allRecords.length}, 范围: ${first?.toISOString().slice(0, 10)} ~ ${last?.toISOString().slice(0, 10)}`);

  // 检查断天
  const expectedDays = Math.ceil((last!.getTime() - first!.getTime()) / 86400000) + 1;
  console.log(`  预期天数: ${expectedDays}, 实际记录: ${allRecords.length}`);

  if (expectedDays !== allRecords.length) {
    // 找断天
    const dateSet = new Set(allRecords.map((r: any) => r.solarDate.toISOString().slice(0, 10)));
    let current = new Date(first!);
    let gapCount = 0;
    while (current <= last!) {
      const dStr = current.toISOString().slice(0, 10);
      if (!dateSet.has(dStr)) {
        result.gaps.push(dStr);
        gapCount++;
        if (gapCount <= 10) console.log(`  缺口: ${dStr}`);
      }
      current = new Date(current.getTime() + 86400000);
    }
    if (gapCount > 10) console.log(`  ... 共 ${gapCount} 个缺口`);
  }

  // 4. 汇总
  console.log("\n" + "=".repeat(50));
  console.log("验证汇总");
  console.log("=".repeat(50));
  console.log(`  节气匹配:     ${result.jieQiMatch}/${result.jieQiMatch + result.jieQiMismatch.length} (${(result.jieQiMatch / (result.jieQiMatch + result.jieQiMismatch.length) * 100).toFixed(2)}%)`);
  console.log(`  日干支匹配:   ${result.riZhuMatch}/${result.riZhuMatch + result.riZhuMismatch.length} (${(result.riZhuMatch / (result.riZhuMatch + result.riZhuMismatch.length) * 100).toFixed(2)}%)`);
  console.log(`  数据缺口:     ${result.gaps.length}`);
  console.log(`  重复记录:     ${result.duplicates.length}`);

  if (result.jieQiMismatch.length > 0) {
    console.log(`\n节气不匹配详情（前10条）:`);
    for (const m of result.jieQiMismatch.slice(0, 10)) {
      console.log(`  ${m.date}: DB=${m.db}, bazi-engine=${m.calc}`);
    }
  }

  if (result.riZhuMismatch.length > 0) {
    console.log(`\n日干支不匹配详情（前10条）:`);
    for (const m of result.riZhuMismatch.slice(0, 10)) {
      console.log(`  ${m.date}: DB=${m.db}, bazi-engine=${m.calc}`);
    }
  }

  const allPassed = result.jieQiMismatch.length === 0 && result.riZhuMismatch.length === 0;
  console.log(`\n${allPassed ? "全部验证通过！" : "存在不匹配项，需人工排查。"}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
