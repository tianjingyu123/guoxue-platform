/**
 * 万年历中央数据层 — 预计算种子脚本
 *
 * 生成 1900-01-01 ~ 2100-12-31 约 73,000 行数据
 * 天文计算入表（节气/农历/日干支/二十八宿），干支推导留算法
 *
 * 用法:
 *   npx ts-node scripts/seed-wannianli.ts                    # 全量生成
 *   npx ts-node scripts/seed-wannianli.ts --year=2026        # 单年
 *   npx ts-node scripts/seed-wannianli.ts --batch=1000       # 自定义批量
 *
 * 预计耗时: 73,000 行约 3-5 分钟（含天文计算）
 */

import { PrismaClient } from "@prisma/client";
import { calcRiZhu, calcAllJieQi, getNianZhuYear } from "@guoxue/bazi-engine";
import { Solar } from "lunar-javascript";

const prisma = new PrismaClient();

// ═══ 基础常量 ═══
const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SHENG_XIAO = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const JIE_QI_24 = [
  "立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至",
  "小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至","小寒","大寒",
];

// 二十八宿顺序（按星期循环，1900-01-01 星期一 = 角宿日）
const ER_SHI_BA_XIU = [
  "角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁",
  "奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸",
];

// ═══ 农历月 → 地支映射（寅月=正月） ═══
const YUE_ZHI = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];

// ═══ 缓存已计算的节气数据（年→节气表） ═══
const jieQiCache = new Map<number, Map<string, { month: number; day: number; hour: number; minute: number }>>();

function getJieQiForYear(year: number) {
  if (jieQiCache.has(year)) return jieQiCache.get(year)!;
  const jq = calcAllJieQi(year);
  // calcAllJieQi returns a Map of 节气名 → { month, day, hour, minute }
  // Need to handle the case where it might return a different structure
  const jqMap = new Map<string, { month: number; day: number; hour: number; minute: number }>();
  for (const [key, val] of jq.entries()) {
    if (typeof val === 'object' && val !== null) {
      jqMap.set(key, val as any);
    }
  }
  jieQiCache.set(year, jqMap);
  return jqMap;
}

// ═══ 二十八宿值日（1900-01-01 = 角宿日 = 星期一） ═══
let xiuEpochDays = 0;
function initXiuEpoch() {
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const now = new Date();
  xiuEpochDays = Math.floor((now.getTime() - epoch.getTime()) / 86400000);
}

/** 获取某日期的二十八宿 */
function getXiu(year: number, month: number, day: number): string {
  const target = new Date(Date.UTC(year, month - 1, day));
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const diffDays = Math.floor((target.getTime() - epoch.getTime()) / 86400000);
  let idx = diffDays % 28;
  if (idx < 0) idx += 28;
  return ER_SHI_BA_XIU[idx];
}

// ═══ 年柱干支（按立春分界） ═══
function getNianGanZhi(year: number, month: number, day: number): { gan: string; zhi: string } {
  const nianYear = getNianZhuYear(year, month, day);
  const baseYear = 1984; // 甲子年
  const diff = nianYear - baseYear;
  let idx = diff % 60;
  if (idx < 0) idx += 60;
  return {
    gan: TIAN_GAN[idx % 10],
    zhi: DI_ZHI[idx % 12],
  };
}

// ═══ 月柱干支（年上起月，五虎遁） ═══
function getYueGanZhi(year: number, month: number, day: number): { gan: string; zhi: string } {
  const jq = getJieQiForYear(year);
  const prevJq = year > 1900 ? getJieQiForYear(year - 1) : jq;

  const dateValue = month * 100 + day;

  // 12个节：立春,惊蛰,清明,立夏,芒种,小暑,立秋,白露,寒露,立冬,大雪,小寒
  const jieNames = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"];

  // 确定月支索引（寅=0）
  // 立春→寅(0), 惊蛰→卯(1), 清明→辰(2), 立夏→巳(3), 芒种→午(4), 小暑→未(5),
  // 立秋→申(6), 白露→酉(7), 寒露→戌(8), 立冬→亥(9), 大雪→子(10), 小寒→丑(11)
  let yueZhiIdx = 10; // 默认丑月（小寒）
  const thisYearJq = jq;

  for (let i = 0; i < 12; i++) {
    const jieName = jieNames[i];
    const jie = thisYearJq.get(jieName);
    if (!jie) continue;

    const jieVal = jie.month * 100 + jie.day;

    // 找到前一个节
    const prevI = (i + 11) % 12;
    const prevJieName = jieNames[prevI];
    let prevJie = thisYearJq.get(prevJieName);
    if (!prevJie) {
      prevJie = prevJq.get(prevJieName);
    }
    if (!prevJie) continue;

    let prevVal = prevJie.month * 100 + prevJie.day;
    if (prevJie.month > jie.month) prevVal -= 1200;

    if (dateValue >= prevVal && dateValue < jieVal) {
      yueZhiIdx = prevI;
      break;
    }
  }

  // 五虎遁：根据年干定寅月天干
  const { gan: nianGan } = getNianGanZhi(year, month, day);
  const nianGanIdx = TIAN_GAN.indexOf(nianGan);
  // 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
  const yinGanIdx = [2, 4, 6, 8, 0][Math.floor(nianGanIdx % 5)];
  const yueGanIdx = (yinGanIdx + yueZhiIdx) % 10;

  return {
    gan: TIAN_GAN[yueGanIdx],
    zhi: YUE_ZHI[yueZhiIdx],
  };
}

// ═══ 当日节气检测 ═══
function getJieQiOnDate(year: number, month: number, day: number): string | null {
  const jq = getJieQiForYear(year);
  for (const [name, data] of jq.entries()) {
    if (data.month === month && data.day === day) return name;
  }
  return null;
}

// ═══ 行数据构建 ═══
interface WanNianLiRow {
  solarDate: Date;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  nianGan: string;
  nianZhi: string;
  yueGan: string;
  yueZhi: string;
  riGan: string;
  riZhi: string;
  lunarYearGZ: string;
  lunarMonthGZ: string;
  lunarDayGZ: string;
  jieQi: string | null;
  erShiBaXiu: string;
  shengXiao: string;
  weekDay: number;
}

function buildRow(year: number, month: number, day: number): WanNianLiRow {
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  // 农历
  const lunarYearVal = Math.abs(lunar.getYear());
  const lunarMonthVal = Math.abs(lunar.getMonth());
  const lunarDayVal = lunar.getDay();
  const isLeapVal = lunar.getMonth() < 0;

  // 干支
  const { gan: nianGanVal, zhi: nianZhiVal } = getNianGanZhi(year, month, day);
  const { gan: yueGanVal, zhi: yueZhiVal } = getYueGanZhi(year, month, day);

  const riZhu = calcRiZhu(year, month, day);
  const riGanVal = riZhu.gan;
  const riZhiVal = riZhu.zhi;

  // 农历干支名
  const lunarYearGZVal = nianGanVal + nianZhiVal;
  const lunarMonthGZVal = yueGanVal + yueZhiVal;
  const lunarDayGZVal = riGanVal + riZhiVal;

  // 生肖
  const nianZhiIdx = DI_ZHI.indexOf(nianZhiVal);
  const shengXiaoVal = SHENG_XIAO[nianZhiIdx];

  // 节气
  const jieQiVal = getJieQiOnDate(year, month, day);

  // 二十八宿
  const xiuVal = getXiu(year, month, day);

  // 星期
  const weekDayVal = new Date(year, month - 1, day).getDay();

  return {
    solarDate: new Date(Date.UTC(year, month - 1, day)),
    lunarYear: lunarYearVal,
    lunarMonth: lunarMonthVal,
    lunarDay: lunarDayVal,
    isLeap: isLeapVal,
    nianGan: nianGanVal,
    nianZhi: nianZhiVal,
    yueGan: yueGanVal,
    yueZhi: yueZhiVal,
    riGan: riGanVal,
    riZhi: riZhiVal,
    lunarYearGZ: lunarYearGZVal,
    lunarMonthGZ: lunarMonthGZVal,
    lunarDayGZ: lunarDayGZVal,
    jieQi: jieQiVal,
    erShiBaXiu: xiuVal,
    shengXiao: shengXiaoVal,
    weekDay: weekDayVal,
  };
}

// ═══ 生成日期序列 ═══
function* dateGenerator(startYear: number, endYear: number) {
  for (let y = startYear; y <= endYear; y++) {
    const maxMonth = 12;
    for (let m = 1; m <= maxMonth; m++) {
      const daysInMonth = new Date(y, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        yield { year: y, month: m, day: d };
      }
    }
  }
}

// ═══ 主函数 ═══
async function main() {
  const args = process.argv.slice(2);
  const argMap = new Map(args.map(a => {
    const [k, v] = a.replace("--", "").split("=");
    return [k, v];
  }));

  const targetYear = argMap.get("year") ? parseInt(argMap.get("year")!) : null;
  const batchSize = argMap.get("batch") ? parseInt(argMap.get("batch")!) : 500;

  const startYear = targetYear ?? 1900;
  const endYear = targetYear ?? 2100;

  console.log(`═══ 万年历中央数据层预计算 ═══`);
  console.log(`年份范围: ${startYear} ~ ${endYear}`);
  console.log(`批量大小: ${batchSize}/批`);
  console.log(`预计行数: ~${Math.round((endYear - startYear + 1) * 365.25)} 行\n`);

  // 先清空已存在的目标年份数据（幂等）
  if (targetYear) {
    const startDate = new Date(Date.UTC(targetYear, 0, 1));
    const endDate = new Date(Date.UTC(targetYear + 1, 0, 1));
    const deleted = await prisma.wanNianLiDay.deleteMany({
      where: {
        solarDate: { gte: startDate, lt: endDate },
      },
    });
    if (deleted.count > 0) {
      console.log(`已清除 ${targetYear} 年现有数据 ${deleted.count} 行`);
    }
  } else {
    console.log(`全量模式：将先清空全表，再重新生成...`);
    await prisma.wanNianLiDay.deleteMany({});
  }

  // 生成
  let batch: WanNianLiRow[] = [];
  let totalInserted = 0;
  const startTime = Date.now();

  for (const { year, month, day } of dateGenerator(startYear, endYear)) {
    try {
      const row = buildRow(year, month, day);
      batch.push(row);
    } catch (err) {
      console.error(`生成 ${year}-${month}-${day} 失败:`, err);
      continue;
    }

    if (batch.length >= batchSize) {
      const count = await insertBatch(batch);
      totalInserted += count;
      batch = [];

      const elapsed = (Date.now() - startTime) / 1000;
      const rate = totalInserted / elapsed;
      const lastRow = batch.length > 0 ? `${batch[batch.length - 1].solarDate}` : `${year}-${month}-${day}`;
      const progress = totalInserted / 73050 * 100;
      process.stdout.write(`\r已插入 ${totalInserted.toLocaleString()} 行 (${rate.toFixed(1)} 行/秒) — ${lastRow} — ${progress.toFixed(1)}%`);
    }
  }

  // 剩余批次
  if (batch.length > 0) {
    const count = await insertBatch(batch);
    totalInserted += count;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ 完成！共 ${totalInserted.toLocaleString()} 行，耗时 ${totalTime}s`);

  await prisma.$disconnect();
}

async function insertBatch(rows: WanNianLiRow[]): Promise<number> {
  try {
    const result = await prisma.wanNianLiDay.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return result.count;
  } catch (err) {
    console.error("\n批量插入失败，重试逐行插入...");
    let count = 0;
    for (const row of rows) {
      try {
        await prisma.wanNianLiDay.upsert({
          where: { solarDate: row.solarDate },
          create: row,
          update: row,
        });
        count++;
      } catch (e) {
        console.error(`  插入 ${row.solarDate.toISOString().slice(0, 10)} 失败:`, e);
      }
    }
    return count;
  }
}

main().catch((err) => {
  console.error("预计算失败:", err);
  process.exit(1);
});
