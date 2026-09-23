import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 干支合法性全域扫描（2026-09-20，接续文档 §2.109）
 *
 * ══ 这是一条「自相矛盾型」判据 ══
 *
 * 它**不需要任何外部基准**——不用竞品、不用典籍、不用另一份实现。
 * 依据只有一条算术事实：六十甲子是十天干与十二地支**同步递进**的产物，
 * 所以阳干只配阳支、阴干只配阴支，120 种两字组合里只有 60 种存在。
 * 一个工具若输出「甲丑」「戊亥」，它自己就已经证明了自己错。
 *
 * desktop-44 在玄空九宫那条上提的：
 * 「运/山/向三盘共用同一函数，同入中数则三盘重合——这种内部矛盾
 *   本身就能写成不变量，不需要外部基准。」
 * 本文件是把那个想法做成常驻扫描。
 *
 * ══ 战绩 ══
 *
 * 首次运行即抓出两个：
 * - `bazi-fanpai`：下标越界被 `|| GAN[0]` 兜底，输出「甲丑」；
 * - `qimen-shike`：时干直接拿**日干**配时支，输出「戊亥」「庚巳」「丙丑」。
 *
 * 两个都已删除。价值在于：**这两条都是"结果看着正常"的 bug**，
 * 结构完整、字段齐全、不崩溃，只有拿六十甲子一比才现形。
 *
 * ══ 为什么只认「恰好两字」的值 ══
 *
 * 断语正文里「甲乙丙丁」「乙木生于卯月」这类连写会误伤，
 * 所以只检查**整个字符串恰好是干＋支两字**的值。这牺牲了一些覆盖面，
 * 换来的是零误报——一条会狼来了的扫描等于没有。
 *
 * ⚠️ 已知的合法例外见 `ALLOW` ——二十四山的**双山**名
 * （甲卯、乙辰、庚酉、辛戌）形如干支但不是干支，属罗盘术语。
 * 首轮扫描时它们报了红，逐个确认后加进白名单。
 * **白名单只放"确认过的非干支术语"，绝不放"看起来应该没事"的。**
 */

const DIR = path.join(__dirname, "../src/modules/tool-registry/calculators");
const GAN = [..."甲乙丙丁戊己庚辛壬癸"];
const ZHI = [..."子丑寅卯辰巳午未申酉戌亥"];

const VALID_60 = new Set<string>();
for (let n = 0; n < 60; n++) VALID_60.add(GAN[n % 10] + ZHI[n % 12]);

/** 形如干支但实为他物的合法术语。加条目必须写明它是什么。 */
const ALLOW = new Set([
  "甲卯", "乙辰", "庚酉", "辛戌", // 二十四山「双山三合」名（另有癸丑丙午丁未坤申等本身即合法干支）
]);

const isGanZhiShaped = (s: string) => s.length === 2 && GAN.includes(s[0]) && ZHI.includes(s[1]);

/** 多组差异很大的入参——单组入参可能恰好走不到出问题的分支 */
const INPUTS: Record<string, unknown>[] = (
  [[1984, 2, 3, 5], [2019, 11, 27, 22], [2024, 6, 15, 10], [1996, 8, 8, 14], [2030, 1, 1, 0]] as const
).map(([y, m, d, h]) => {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const iso = `${y}-${p2(m)}-${p2(d)}T${p2(h)}:00:00`;
  return {
    datetime: iso, birthTime: iso, date: `${y}-${p2(m)}-${p2(d)}`,
    year: y, month: m, day: d, hour: h, minute: 0,
    birthYear: y, birthMonth: m, birthDay: d, birthHour: h,
    gender: h % 2 ? "男" : "女", name: "测试", surname: "张", givenName: "三",
    yearPillar: "甲子", monthPillar: "丙寅", dayPillar: "戊辰", hourPillar: "庚申",
    riZhu: "戊辰", dayGan: "戊",
    number: (y % 9) + 1, question: "问前程", method: "time",
    city: "北京", longitude: 116.4, latitude: 39.9,
  };
});

function collect(v: unknown, out: (s: string) => void): void {
  if (typeof v === "string") { if (isGanZhiShaped(v)) out(v); return; }
  if (Array.isArray(v)) { for (const x of v) collect(x, out); return; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) collect(x, out); }
}

describe("全域扫描：输出中的干支必须是六十甲子之一", () => {
  it("没有任何计算器输出阳干配阴支（或反之）的不存在干支", () => {
    const offenders: string[] = [];
    let scanned = 0;

    for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".calculator.ts"))) {
      const id = f.replace(".calculator.ts", "");
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(path.join(DIR, f)) as Record<string, unknown>;
      const fns = Object.keys(mod).filter((k) => typeof mod[k] === "function" && /^calculate/.test(k));
      for (const fn of fns) {
        const bad = new Set<string>();
        for (const inp of INPUTS) {
          let r: unknown;
          try { r = (mod[fn] as (x: unknown) => unknown)(inp); } catch { continue; }
          // 异步/需 DB 的跳过（本扫描只覆盖纯计算路径）
          if (r && typeof (r as Promise<unknown>).then === "function") {
            (r as Promise<unknown>).catch(() => undefined);
            continue;
          }
          collect(r, (s) => { scanned++; if (!VALID_60.has(s) && !ALLOW.has(s)) bad.add(s); });
        }
        if (bad.size) offenders.push(`${id}.${fn} → ${[...bad].join(" ")}`);
      }
    }

    // 反证：扫描确实看到了东西。若 scanned 为 0，上面的「无违例」毫无意义
    expect(`扫到的干支处数>0: ${scanned > 0}`).toBe("扫到的干支处数>0: true");
    expect(`非法干支=${offenders.join(" | ") || "无"}`).toBe("非法干支=无");
  });

  it("反证：判据本身有判别力（六十甲子表恰好 60 条，且能认出「甲丑」是非法的）", () => {
    expect(VALID_60.size).toBe(60);
    expect(VALID_60.has("甲子")).toBe(true);
    expect(VALID_60.has("甲丑")).toBe(false);  // 阳干配阴支
    expect(VALID_60.has("戊亥")).toBe(false);  // qimen-shike 曾经的输出
    expect(VALID_60.has("乙子")).toBe(false);  // 阴干配阳支
  });
});
