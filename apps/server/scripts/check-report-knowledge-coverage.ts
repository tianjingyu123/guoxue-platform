/**
 * 报告知识库的检索覆盖率体检（只读，可反复跑）。
 *
 * 为什么需要它：排盘报告的「依据」全部来自 `tags hasSome signals.value` 的**精确命中**。
 * 一条 tag 与引擎实际吐出的值差一个字，条目就永远检索不到；而单元测试抓不到这类错——
 * 测试里的 signals 是自己造的，tag 怎么写都能对上。六壬就这么错过一次：
 * 引擎吐「涉害」，条目写的是「涉害课」，整组条目成了死条目，单测全绿。
 *
 * 这个脚本撒一批跨年份、跨节气、跨时辰的盘，走与线上同一套引擎与 signals，
 * 统计每个盘能命中多少条知识，把「薄盘」列出来。薄盘意味着那类盘的报告没有依据可引，
 * 只能靠模型自说自话——正是我们要跟普通 AI 拉开距离的地方。
 *
 * 跑法（前台 tsx，连本地 5433 的隔离库）：
 *   cd apps/server && npx tsx scripts/check-report-knowledge-coverage.ts
 * 加 tag 或加条目之后跑一遍；命中数明显下降，说明新 tag 没对上引擎输出。
 */
import { PrismaClient } from "@prisma/client";
import { Solar } from "lunar-javascript";
import { calcZiwei } from "@guoxue/ziwei-engine";
import { computeLiuyao, computeMeihua } from "@guoxue/shared/paipan";
import { extractLiuyaoFacts, liuyaoSignals } from "../src/modules/paipan/liuyao-report";
import { extractMeihuaFacts, meihuaSignals } from "../src/modules/paipan/meihua-report";
import { extractQimenFacts, qimenSignals } from "../src/modules/paipan/qimen-report";
import { extractDaliurenFacts, daliurenSignals } from "../src/modules/paipan/daliuren-report";
import { extractZiweiFacts, ziweiSignals } from "../src/modules/paipan/ziwei-report";
import { calculateQimenYang } from "../src/modules/tool-registry/calculators/qimen.calculator";
import { calculateDaLiuRen } from "../src/modules/tool-registry/calculators/daliuren.calculator";

/** 低于这个条数就算「薄盘」：报告里几乎没有可引的依据 */
const THIN = 8;

/** 撒点：跨年份、跨节气（含阴阳遁分界前后）、跨时辰 */
const YEARS = [1972, 1985, 1990, 1996, 2003, 2011, 2018, 2024];
const DAYS: [number, number][] = [[2, 10], [5, 21], [8, 7], [11, 18]];

const prisma = new PrismaClient();

async function hitCount(paipanType: string, values: string[]): Promise<number> {
  if (!values.length) return 0;
  const rows = await prisma.paipanReportKnowledge.findMany({
    where: { paipanType, status: "APPROVED", tags: { hasSome: values } },
    select: { id: true },
  });
  return rows.length;
}

function ziweiInput(year: number, month: number, day: number, hour: number, gender: "男" | "女") {
  // ZiweiInput 要的是农历字段（线上由前端算好传来，服务端不转），这里自行补齐
  const lunar = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar();
  return {
    name: "", gender, year, month, day, hour,
    lunarMonth: Math.abs(lunar.getMonth()),
    lunarDay: lunar.getDay(),
    lunarHour: lunar.getTimeZhi() as any,
    lunarYearGan: lunar.getYearGan() as any,
    lunarYearZhi: lunar.getYearZhi() as any,
  };
}

async function main() {
  const counts: Record<string, number[]> = {};
  const thin: string[] = [];
  const dead: string[] = [];

  for (const year of YEARS) {
    for (const [month, day] of DAYS) {
      const hour = (year + month) % 24;
      const at = `${year}-${month}-${day} ${hour}时`;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`;
      const jobs: [string, { value: string }[]][] = [];

      const safe = (type: string, fn: () => { value: string }[]) => {
        try { jobs.push([type, fn()]); } catch (e: any) { dead.push(`${type} ${at}：排盘/取信号失败 ${e?.message}`); }
      };

      safe("liuyao", () => liuyaoSignals(extractLiuyaoFacts(computeLiuyao({ year, month, day, hour, minute: 0 }) as any)));
      safe("meihua", () => meihuaSignals(extractMeihuaFacts(computeMeihua({ year, month, day, hour, minute: 0 }) as any)));
      safe("qimen", () => qimenSignals(extractQimenFacts(calculateQimenYang({ year, month, day, hour, minute: 0 }) as any)));
      safe("ziwei", () => ziweiSignals(extractZiweiFacts(calcZiwei(ziweiInput(year, month, day, hour, "男")) as any)));
      try {
        const liuren = await calculateDaLiuRen({ datetime: iso, method: "chushi" } as any);
        jobs.push(["daliuren", daliurenSignals(extractDaliurenFacts(liuren as any))]);
      } catch (e: any) {
        dead.push(`daliuren ${at}：起课失败 ${e?.message}`);
      }

      for (const [type, signals] of jobs) {
        const values = signals.map((s) => s.value);
        const n = await hitCount(type, values);
        (counts[type] ||= []).push(n);
        if (n < THIN) thin.push(`${type} ${at}：仅 ${n} 条（信号：${values.join("、")}）`);
      }
    }
  }

  console.log(`撒点 ${YEARS.length * DAYS.length} 个时刻\n`);
  for (const [type, arr] of Object.entries(counts)) {
    const s = [...arr].sort((a, b) => a - b);
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    console.log(`${type.padEnd(9)} 最少 ${s[0]}　中位 ${s[Math.floor(s.length / 2)]}　最多 ${s[s.length - 1]}　平均 ${avg}`);
  }

  console.log(`\n薄盘（命中 < ${THIN} 条）${thin.length} 例`);
  thin.slice(0, 20).forEach((x) => console.log("  " + x));
  if (dead.length) {
    console.log(`\n取信号失败 ${dead.length} 例（多半是引擎入参变了，先修这个）`);
    dead.slice(0, 10).forEach((x) => console.log("  " + x));
  }
  // 八字不在此列：它的 facts 抽取在 PaipanReportService 内部，需要整个 Nest 容器才能跑；
  // 且八字条目最多（130+），薄盘风险最低。要测它请走 pw/debate-check 那样的真实报告链路。

  await prisma.$disconnect();
  if (thin.length || dead.length) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
