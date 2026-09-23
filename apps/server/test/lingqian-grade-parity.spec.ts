import * as fs from "fs";
import * as path from "path";

/**
 * 观音灵签·两份实现的签级一致性（2026-09-21 定案）
 *
 * ══ 「23 处等级分歧」的真相：不是抄错，是丢了一档 ══
 *
 * 仓库里有两份观音签 100 签数据：
 *
 *   `lingqian.calculator.ts`          通用灵签框架，内含 `GUANYIN_100`（字段 `grade`）
 *   `guanyin-lingqian.calculator.ts`  观音灵签完整数据库（字段 `level`）
 *
 * 逐签比对后发现分歧**完全是系统性的**：23 处**全部**是
 * `lingqian=中下` vs `guanyin=中平`，而且 guanyin 那份的取值集合里
 * **根本没有「中下」这一档**。
 *
 * 验证假设后确认：**guanyin 就是把 lingqian 的「中下」并入「中平」的退化版**，
 * 其余 100 签逐签相同，四个档（上上2 / 上吉14 / 中吉29 / 下下1）分毫不差。
 *
 * ══ 定案：以 lingqian 的六档为准 ══
 *
 * 1. shared 的类型 `QianGrade` **明确定义了六档**：
 *    `"上上" | "上吉" | "中吉" | "中平" | "中下" | "下下"` —— guanyin 只用五档是**丢档**，不是流派差异
 * 2. 传统观音灵签本就分这六档
 * 3. 把 23 支中下签显示成中平，**对用户是偏乐观的误导**（求签看的就是这个字）
 *
 * 已把 guanyin 那 23 签改回「中下」。修后两份档位分布完全一致：
 * 上上2 / 上吉14 / 中吉29 / 中平31 / 中下23 / 下下1 = 100。
 *
 * ══ 本闸门守什么 ══
 *
 * 两份数据 100 签逐签同级。谁只改一份，这里立刻红。
 * （长远应收敛成一份；在收敛前先守住不漂。）
 */

const ROOT = path.resolve(__dirname, "../../..");
const DIR = path.join(ROOT, "apps/server/src/modules/tool-registry/calculators");
const LQ = fs.readFileSync(path.join(DIR, "lingqian.calculator.ts"), "utf8");
const GY = fs.readFileSync(path.join(DIR, "guanyin-lingqian.calculator.ts"), "utf8");
const TYPES = fs.readFileSync(path.join(ROOT, "packages/shared/src/types/tools/lingqian.ts"), "utf8");

/** lingqian 的 GUANYIN_100：每条形如 [签号, "等级", …] */
function lingqianGrades(): Map<number, string> {
  const blk = /const GUANYIN_100: QianData\[\] = \[([\s\S]*?)\n\]/.exec(LQ);
  if (!blk) throw new Error("GUANYIN_100 没解析到");
  return new Map([...blk[1].matchAll(/\[(\d+),\s*"([^"]+)"/g)].map((m) => [Number(m[1]), m[2]] as [number, string]));
}
/** guanyin-lingqian：number + 其后最近的 level */
function guanyinGrades(): Map<number, string> {
  return new Map(
    [...GY.matchAll(/number:\s*(\d+),[\s\S]{0,400}?level:\s*"([^"]+)"/g)]
      .map((m) => [Number(m[1]), m[2]] as [number, string]),
  );
}
const A = lingqianGrades();
const B = guanyinGrades();
const SIX = ["上上", "上吉", "中吉", "中平", "中下", "下下"];

describe("观音灵签 · 两份实现签级一致", () => {
  it("反证：两份都解析到 100 签（解析失败会让下面全变空跑）", () => {
    expect(A.size).toBe(100);
    expect(B.size).toBe(100);
    for (let n = 1; n <= 100; n++) {
      expect(`lingqian 有第${n}签`).toBe(A.has(n) ? `lingqian 有第${n}签` : `lingqian 缺第${n}签`);
      expect(`guanyin 有第${n}签`).toBe(B.has(n) ? `guanyin 有第${n}签` : `guanyin 缺第${n}签`);
    }
  });

  it("★ 100 签逐签同级（23 处「中下→中平」的丢档已修）", () => {
    const diff: string[] = [];
    for (let n = 1; n <= 100; n++) {
      if (A.get(n) !== B.get(n)) diff.push(`第${n}签：lingqian=${A.get(n)} guanyin=${B.get(n)}`);
    }
    expect(diff).toEqual([]);
  });

  it("两份都必须用满六档，不得再把「中下」并进「中平」", () => {
    for (const [name, m] of [["lingqian", A], ["guanyin", B]] as const) {
      const used = new Set(m.values());
      expect(`${name} 档数:${used.size}`).toBe(`${name} 档数:6`);
      for (const g of SIX) expect(`${name} 含${g}`).toBe(used.has(g) ? `${name} 含${g}` : `${name} 缺${g}`);
    }
  });

  it("档位分布必须相同，且合计 100", () => {
    const dist = (m: Map<number, string>) => {
      const o: Record<string, number> = {};
      for (const g of m.values()) o[g] = (o[g] ?? 0) + 1;
      return o;
    };
    const da = dist(A), db = dist(B);
    expect(db).toEqual(da);
    expect(Object.values(da).reduce((x, y) => x + y, 0)).toBe(100);
    // 钉住实际分布：上上2 上吉14 中吉29 中平31 中下23 下下1
    expect(da).toEqual({ 上上: 2, 上吉: 14, 中吉: 29, 中平: 31, 中下: 23, 下下: 1 });
  });

  it("等级取值必须都在 shared 的 QianGrade 六档之内", () => {
    expect(TYPES).toMatch(/QianGrade = "上上" \| "上吉" \| "中吉" \| "中平" \| "中下" \| "下下"/);
    const bad: string[] = [];
    for (const [n, g] of [...A, ...B]) if (!SIX.includes(g)) bad.push(`第${n}签 ${g}`);
    expect(bad).toEqual([]);
  });

  it("反证：把任一签改级，逐签比对必须抓到", () => {
    const fake = new Map(B);
    fake.set(2, "上上");
    const diff = [...A].filter(([n, g]) => fake.get(n) !== g);
    expect(diff).toHaveLength(1);
    expect(diff[0][0]).toBe(2);
  });
});
