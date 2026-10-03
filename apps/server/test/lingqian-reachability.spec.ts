import { calculateGuanYinLingQian } from "../src/modules/tool-registry/calculators/guanyin-lingqian.calculator";
import { calculateLingQian } from "../src/modules/tool-registry/calculators/lingqian.calculator";
import { calculateLingQiJing } from "../src/modules/tool-registry/calculators/lingqi-jing.calculator";
import { dayGanzhi } from "@guoxue/shared/paipan";

/**
 * 签类工具：全表可达性 + 日干支纪元（2026-09-20，接续文档 §2.110）
 *
 * ══ 为什么这条必须有 ══
 *
 * 「兜底起签」这一行在本项目已经错了**三次**，错法一模一样：
 * 用一个**取值数少于表长**的量去取模。
 *
 * | 工具 | 熵源取值数 | 表长 | 可达 |
 * |---|---|---|---|
 * | 诸葛神数（已修） | 三字笔画和 ≤ 90 | 384 | 24% |
 * | 蠢子数（已删） | 日干支序 60 | 96 | 62% |
 * | 观音灵签 / 灵签 | 日干支序 60 | 100 | **60%** |
 * | 灵棋经 | 日干支序 60 | 125 | **48%** |
 *
 * 后果是结构性的：**一半的签文写了也没人看得到**，
 * 而输出永远是一条格式完整、内容合理的签——**没有任何异常可看**。
 * 只有把全部输入跑一遍、数覆盖率，才能发现。
 *
 * ══ 两条断言分别守什么 ══
 *
 * ① **可达性**：足够多的连续日期必须覆盖整张表。
 *    这条直接盯着上面那张表里的失败模式。
 * ② **纪元**：日干支必须与 `@guoxue/shared` 真源一致。
 *    这三个文件原先各自带一份 `GANZHI_EPOCH_UTC = Date.UTC(1984,1,2) // 甲子日`，
 *    而 1984-02-02 是**丙寅**日（甲子日为 1984-01-31），**恒差两天**。
 *    `bazi-engine.calcRiZhu` 与 `shared.dayGanzhi` 两个独立实现互证，
 *    本地那份 78/78 全不符。现已全部改走 shared。
 */

const day = (i: number) => {
  const t = Date.UTC(2020, 0, 1) + i * 86400000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

describe("签类工具：兜底起签必须覆盖全表", () => {
  it("观音灵签（guanyin-lingqian）100 签全可达", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const r = calculateGuanYinLingQian({ date: day(i) }) as unknown as { qian: { number: number } };
      seen.add(r.qian.number);
    }
    // 修复前此处为 60。缺号一并报出，便于一眼看出是不是又回到「% 60」那条路
    const missing = [...Array(100)].map((_, i) => i + 1).filter((n) => !seen.has(n));
    expect(`可达=${seen.size}/100 缺=${missing.slice(0, 10).join(",") || "无"}`).toBe("可达=100/100 缺=无");
  });

  it("灵签（lingqian，与上者同为观音100签，实现重复待合并）100 签全可达", () => {
    const seen = new Set<unknown>();
    for (let i = 0; i < 400; i++) {
      const r = calculateLingQian({ date: day(i) }) as unknown as { sign: { number: number } };
      seen.add(r.sign.number);
    }
    expect(`可达=${seen.size}/100`).toBe("可达=100/100");
  });

  it("灵棋经 125 卦全可达", () => {
    const seen = new Set<unknown>();
    for (let i = 0; i < 500; i++) {
      const r = calculateLingQiJing({ date: day(i) } as never) as unknown as { gua: { index: number } };
      seen.add(r.gua.index);
    }
    expect(`可达=${seen.size}/125`).toBe("可达=125/125");
  });

  it("反证：报签号路径本来就全可达（故上面三条测的确实是兜底路径）", () => {
    const seen = new Set<number>();
    for (let n = 1; n <= 100; n++) {
      const r = calculateGuanYinLingQian({ qianNumber: n }) as unknown as { qian: { number: number } };
      seen.add(r.qian.number);
    }
    expect(seen.size).toBe(100);
  });
});

describe("签类工具：日干支走 shared 真源，不再自备纪元", () => {
  it("起签说明里报出的日干支序与 shared.dayGanzhi 一致", () => {
    const bad: string[] = [];
    for (const [y, m, d] of [[1950, 1, 1], [1984, 2, 2], [2000, 1, 1], [2024, 6, 15], [2040, 12, 31]] as const) {
      // 起卦说明嵌在 summary 里，没有独立字段
      const r = calculateGuanYinLingQian({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` }) as unknown as { summary: string };
      const reported = Number(/六十甲子第 (\d+) 位/.exec(r.summary)?.[1]);
      const want = dayGanzhi(y, m, d, 12).idx + 1;
      if (reported !== want) bad.push(`${y}-${m}-${d} 报${reported} 应${want}`);
    }
    // 修复前 5/5 全不符（恒差 2）
    expect(`不符=${bad.join(",") || "无"}`).toBe("不符=无");
  });

  it("反证：1984-02-02 是丙寅日而非甲子日（原纪元注释的错处）", () => {
    const r = dayGanzhi(1984, 2, 2, 12);
    expect(`${r.gan}${r.zhi}`).toBe("丙寅");
    expect(`${dayGanzhi(1984, 1, 31, 12).gan}${dayGanzhi(1984, 1, 31, 12).zhi}`).toBe("甲子");
  });
});

/**
 * 时区陷阱（2026-09-20，接续文档 §2.110）
 *
 * `new Date("2024-01-01")` 把**纯日期串**按 **UTC 午夜**解析。
 * 若接着用 `getFullYear()/getMonth()/getDate()`（**本地**时区）取回年月日，
 * 在 UTC 以西的机器上会退到前一天／前一年。
 *
 * ⚠️ **这类 bug 只在部分时区出现**——开发机若在 UTC+8，怎么测都是绿的。
 * 本机实测为 UTC−8，正是它现形的原因；换台机器它就藏起来了。
 * 所以下面的断言**不依赖本机时区**：直接比对「按字面取的年份」与工具返回的年份。
 *
 * 已修两处：`wannianli`（返回错年份的节气表，且它是 VERIFIED_TOOLS 里的工具）、
 * `qimen-chuanren`（birthYear 兜底）。签类三个在同文件上方。
 */
describe("时区：纯日期串不得因机器时区偏移", () => {
  it("万年历跨年边界返回的是查询年份的节气表", async () => {
    const { calculateWanNianLi } = await import("../src/modules/tool-registry/calculators/wannianli.calculator");
    for (const date of ["2024-01-01", "2023-12-31", "2030-01-01"]) {
      const want = date.slice(0, 4);
      const r = calculateWanNianLi({ date, endDate: date }) as unknown as { jieQiList: { name: string; date: string }[] };
      const got = r.jieQiList.find((j) => j.date)?.date.slice(0, 4);
      expect(`${date} → 节气表年份 ${got}`).toBe(`${date} → 节气表年份 ${want}`);
    }
  });

  it("择日工具传表外的同义用途不得崩溃（嫁娶 vs 婚嫁）", async () => {
    const { calculateDongGong } = await import("../src/modules/tool-registry/calculators/donggong-zeri.calculator");
    for (const purpose of ["嫁娶", "开市", "安床", "婚嫁"]) {
      expect(() => calculateDongGong({ year: 2026, startMonth: 3, endMonth: 3, purpose })).not.toThrow();
    }
  });
});
