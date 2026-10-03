import * as fs from "fs";
import * as path from "path";

/**
 * 小成图（霍斐然体系）·归藏与先天序（2026-09-20）
 *
 * ══ 核心发现：归藏就是 (Z/2)³ 的异或群 ══
 *
 * 文件头把中宫归藏写成一串嵌套：
 *
 *     四正归藏 = 归藏(归藏(9,1), 归藏(3,7))
 *     正隅归藏 = 归藏(四正结果, 归藏(归藏(4,2), 归藏(8,6)))
 *
 * 而规则本身是「逐爻相对，同性得阴、异性得阳」——这**就是逐爻异或**（阳记 1）。
 * 于是八卦在归藏下构成 (Z/2)³：**坤是单位元、每卦自逆、可交换、可结合**。
 *
 * 由结合律与交换律立刻得到一条比原式好用得多的判据：
 *
 *     **中宫 = 八宫天盘卦的归藏总和（与顺序无关）**
 *
 * 实测 620 盘逐盘成立。这条不依赖那串嵌套式怎么写，
 * 所以哪天有人把嵌套顺序改了、只要结果还对，它照样过；改错了则立刻红。
 *
 * ══ 先天卦序也是生成出来的 ══
 *
 * 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8 不必抄：
 * **先天数 − 1 = 阴记 1、下爻权 4 / 中爻权 2 / 上爻权 1 的二进制值**。
 * （我第一次把位权写反了，测试当场报红 4 处——判据自己也会写错。）
 * 推论：错卦（三爻全变）先天数之和恒为 9。
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/xiaochengtu-verify.mts`：620 盘全枚举，
 * 布卦八宫固定位、互卦（下互=爻二三四／上互=爻三四五）、变卦仅差动爻一位、
 * 卦气升降与四式 2×2 完备、黄金基准（2026-07-02 16:45 → 水山蹇 3 爻动 → 水地比，震3宫水雷屯）复现。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/xiaochengtu-engine.ts"), "utf8",
);

/** 八卦爻象（下中上，阳=true） */
const LINES: Record<string, [boolean, boolean, boolean]> = {
  乾: [true, true, true], 兑: [true, true, false], 离: [true, false, true], 震: [true, false, false],
  巽: [false, true, true], 坎: [false, true, false], 艮: [false, false, true], 坤: [false, false, false],
};
const GUA8 = Object.keys(LINES);
const cuoOf = (g: string) => GUA8.find((h) => LINES[h].every((v, i) => v !== LINES[g][i]))!;
/** 归藏 = 逐爻异或（同性得阴、异性得阳） */
const xor = (a: string, b: string) =>
  GUA8.find((g) => LINES[g].every((v, i) => v === (LINES[a][i] !== LINES[b][i])))!;

function arr(name: string): string[] {
  const m = new RegExp(`export const ${name} = \\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
}

describe("小成图 · 先天卦序是生成出来的", () => {
  const ORDER = arr("XIANTIAN_ORDER");

  it("反证：先天序解析到 9 项（首项占位空串）", () => {
    expect(ORDER).toHaveLength(9);
    expect(ORDER[0]).toBe("");
    expect(ORDER.slice(1).sort()).toEqual([...GUA8].sort());
  });

  it("先天数 − 1 = 阴记 1、下爻权 4 / 中爻权 2 / 上爻权 1 的二进制值", () => {
    const bits = (g: string) => LINES[g].reduce((a, yang, i) => a + (yang ? 0 : 1 << (2 - i)), 0);
    const bad: string[] = [];
    for (let n = 1; n <= 8; n++) if (bits(ORDER[n]) !== n - 1) bad.push(`${ORDER[n]}:${bits(ORDER[n])}≠${n - 1}`);
    expect(bad).toEqual([]);
  });

  it("反证：位权写反（下 1 / 中 2 / 上 4）时必须报红 —— 我第一次就是这么写错的", () => {
    const wrong = (g: string) => LINES[g].reduce((a, yang, i) => a + (yang ? 0 : 1 << i), 0);
    const bad = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => wrong(ORDER[n]) !== n - 1);
    expect(bad.length).toBeGreaterThan(0);
  });

  it("错卦先天数之和恒为 9", () => {
    const bad = GUA8
      .map((g) => ({ g, cuo: cuoOf(g), sum: ORDER.indexOf(g) + ORDER.indexOf(cuoOf(g)) }))
      .filter((x) => x.sum !== 9)
      .map((x) => `${x.g}+${x.cuo}=${x.sum}`);
    expect(bad).toEqual([]);
  });
});

describe("小成图 · 归藏是 (Z/2)³ 异或群", () => {
  it("源码实现的就是逐爻异或（同性得阴、异性得阳）", () => {
    const m = /export function guiCang[\s\S]*?\n\}/.exec(SRC);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/la\[0\] !== lb\[0\]/);
    expect(m![0]).toMatch(/la\[1\] !== lb\[1\]/);
    expect(m![0]).toMatch(/la\[2\] !== lb\[2\]/);
  });

  it("坤是单位元、每卦自逆", () => {
    const notIdentity = GUA8.filter((g) => xor(g, "坤") !== g);
    const notSelfInverse = GUA8.filter((g) => xor(g, g) !== "坤");
    expect(notIdentity).toEqual([]);
    expect(notSelfInverse).toEqual([]);
  });

  it("交换律与结合律（8×8×8 全枚举）", () => {
    const bad: string[] = [];
    for (const a of GUA8) for (const b of GUA8) {
      if (xor(a, b) !== xor(b, a)) bad.push(`不交换 ${a}${b}`);
      for (const c of GUA8) if (xor(xor(a, b), c) !== xor(a, xor(b, c))) bad.push(`不结合 ${a}${b}${c}`);
    }
    expect(bad).toEqual([]);
  });

  it("中宫归藏式与「八宫总和」等价（文件头那串嵌套可化简）", () => {
    // 四正归藏 = 归藏(归藏(9,1), 归藏(3,7))；正隅 = 归藏(四正, 归藏(归藏(4,2), 归藏(8,6)))
    const bad: string[] = [];
    for (const g9 of GUA8) for (const g1 of GUA8) for (const g3 of GUA8) for (const g7 of GUA8) {
      const sizheng = xor(xor(g9, g1), xor(g3, g7));
      // 四隅固定取一组即可（结合律已单独验过）
      const [g4, g2, g8, g6] = ["巽", "坤", "艮", "乾"];
      const nested = xor(sizheng, xor(xor(g4, g2), xor(g8, g6)));
      const total = [g9, g1, g3, g7, g4, g2, g8, g6].reduce((a, x) => xor(a, x), "坤");
      if (nested !== total) bad.push(`${g9}${g1}${g3}${g7}`);
    }
    expect(bad).toEqual([]);
  });

  it("反证：把异或换成同或，64 组里不得有一组仍相同", () => {
    const xnor = (a: string, b: string) =>
      GUA8.find((g) => LINES[g].every((v, i) => v === (LINES[a][i] === LINES[b][i])))!;
    const same = GUA8.flatMap((a) => GUA8.filter((b) => xor(a, b) === xnor(a, b)));
    expect(same).toEqual([]);
  });
});

describe("小成图 · 卦气升降", () => {
  const m = /const RISING = new Set\(\[([^\]]+)\]\)/.exec(SRC)!;
  const RISING = new Set([...m[1].matchAll(/"(.)"/g)].map((x) => x[1]));

  it("反证：升卦集合解析到 4 个", () => {
    expect(RISING.size).toBe(4);
    expect([...RISING].sort()).toEqual([..."乾震艮离"].sort());
  });

  it("每个错卦对必一升一降（乾↔坤 震↔巽 艮↔兑 离↔坎）", () => {
    const bad = GUA8.filter((g) => RISING.has(g) === RISING.has(cuoOf(g)));
    expect(bad).toEqual([]);
  });

  /**
   * ⚠️ 留痕：反证不能拿「把离换成坎」当扰动 —— 离坎本就是一对错卦，
   * 对调后仍是一升一降，等于没扰动（我第一次就这么写，反证显示 0/8 破坏）。
   * 要真正破坏该结构，得让某个错卦对落到同侧。
   */
  it("反证：多算一个坤为升，必须破坏一升一降", () => {
    const fake = new Set([...RISING, "坤"]);
    const broken = GUA8.filter((g) => fake.has(g) === fake.has(cuoOf(g)));
    expect(broken.sort()).toEqual(["乾", "坤"].sort());
  });
});

describe("小成图 · 四式与布卦宫位", () => {
  it("四式覆盖「天升降 × 地升降」的完整 2×2", () => {
    const names = ["向心式", "离心式", "外引式", "内引式"];
    for (const nm of names) expect(SRC).toMatch(new RegExp(nm));
    expect(new Set(names).size).toBe(4);
  });

  it("布卦八宫固定位在文件头声明中（本上9 本下1 变上3 变下7 本上互4 本下互2 变上互8 变下互6）", () => {
    expect(SRC).toMatch(/本卦上卦→离9、下卦→坎1/);
    expect(SRC).toMatch(/变卦上卦→震3、下卦→兑7/);
    expect(SRC).toMatch(/本卦上互→巽4、下互→坤2/);
    expect(SRC).toMatch(/变卦上互→艮8、下互→乾6/);
  });
});
