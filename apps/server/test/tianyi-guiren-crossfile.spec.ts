import * as fs from "fs";
import * as path from "path";

/**
 * 天乙贵人·四处实现跨文件一致性（2026-09-20）
 *
 * ══ 为什么要守 ══
 *
 * 同一个「天乙贵人」概念在仓库里有四份独立写法：
 *
 *   packages/shared/src/paipan/ganzhi.ts            `TIANYI`（八字神煞）
 *   packages/shared/src/paipan/jinkoujue-engine.ts  `GUIREN_A`（金口诀贵神，A 派）
 *   apps/mobile/src/pkg-paipan/lib/qizheng-engine.ts `TIANYI_GUI`（七政神煞）
 *   apps/mobile/src/pkg-paipan/lib/ziwei-engine.ts   `KUI` / `YUE`（紫微天魁天钺，下标制）
 *
 * 四份写法、四种数据形态（字符串数组 / 元组 / 下标），谁改了一份别人不会知道。
 * 2026-09-20 实测四份的**贵人位置对**完全一致，此处把这个一致性钉死。
 *
 * ══ 判据 ══
 *
 * ① 四份表都覆盖十干，每干恰两个位置且互异
 * ② 四份表逐干的**位置对**（无序）完全相同
 * ③ 结构：昼贵 + 夜贵 ≡ 8 (mod 12) —— 关于辰戌轴对称，十干恒定
 * ④ 位置对只有五组（丑未 / 子申 / 亥酉 / 午寅 / 卯巳），恰好对应五句口诀
 *
 * ══ 一并记录的待决项（不在此判断对错）══
 *
 * 金口诀另有 `GUIREN_B`（自称「甲羊戊庚牛派」）。实测：
 *   · 与 A 的**位置对 10/10 完全相同** —— 两派在「贵人在哪」上根本不分歧
 *   · 但**昼贵归属 8/10 不同**（甲乙丙丁己辛壬癸）
 * 而两个口诀名（甲戊庚牛羊 / 甲羊戊庚牛）说的恰恰是位置。名与数据对不上：
 * B 实为 A 把八行的昼夜两列对调。是否应如此，需竞品实测或典籍，**不在此替决策人判**。
 * 本测试只守「四处位置对一致」这条已确认成立的事实。
 */

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

type Pairs = Record<string, [string, string]>;

/** shared/ganzhi 的 TIANYI：甲: ["丑", "未"] 形态 */
function parseShared(): Pairs {
  const src = read("packages/shared/src/paipan/ganzhi.ts");
  const blk = /const TIANYI: Record<string, string\[\]> = \{([\s\S]*?)\n\s*\}/.exec(src);
  if (!blk) throw new Error("shared TIANYI 没解析到");
  const out: Pairs = {};
  for (const m of blk[1].matchAll(/(.): \["(.)", "(.)"\]/g)) out[m[1]] = [m[2], m[3]];
  return out;
}

/** 金口诀 GUIREN_A / GUIREN_B：甲: ["丑", "未"] 形态 */
function parseJkj(which: "A" | "B"): Pairs {
  const src = read("packages/shared/src/paipan/jinkoujue-engine.ts");
  const blk = new RegExp(`const GUIREN_${which}: Record<string, \\[string, string\\]> = \\{([\\s\\S]*?)\\n\\}`).exec(src);
  if (!blk) throw new Error(`GUIREN_${which} 没解析到`);
  const out: Pairs = {};
  for (const m of blk[1].matchAll(/(.): \["(.)", "(.)"\]/g)) out[m[1]] = [m[2], m[3]];
  return out;
}

/** 七政 TIANYI_GUI：甲: ["丑", "未"] 形态 */
function parseQizheng(): Pairs {
  const src = read("apps/server/src/modules/paipan/engine/qizheng-engine.ts");
  const blk = /const TIANYI_GUI: Record<string, string\[\]> = \{([\s\S]*?)\n\}/.exec(src);
  if (!blk) throw new Error("TIANYI_GUI 没解析到");
  const out: Pairs = {};
  for (const m of blk[1].matchAll(/(.): \["(.)", "(.)"\]/g)) out[m[1]] = [m[2], m[3]];
  return out;
}

/** 紫微 KUI / YUE：甲: 1 的地支下标形态 */
function parseZiwei(): Pairs {
  const src = read("apps/server/src/modules/paipan/engine/ziwei-engine.ts");
  const grab = (name: string) => {
    const blk = new RegExp(`const ${name}: Record<string, number> = \\{([^}]*)\\}`).exec(src);
    if (!blk) throw new Error(`紫微 ${name} 没解析到`);
    const o: Record<string, number> = {};
    for (const m of blk[1].matchAll(/(.): (\d+)/g)) o[m[1]] = Number(m[2]);
    return o;
  };
  const kui = grab("KUI"), yue = grab("YUE");
  const out: Pairs = {};
  for (const g of GAN) out[g] = [ZHI[kui[g]], ZHI[yue[g]]];
  return out;
}

const TABLES: [string, Pairs][] = [
  ["shared/ganzhi TIANYI", parseShared()],
  ["shared/jinkoujue GUIREN_A", parseJkj("A")],
  ["mobile/qizheng TIANYI_GUI", parseQizheng()],
  ["mobile/ziwei KUI+YUE", parseZiwei()],
];

const asSet = (p: [string, string]) => [...p].sort().join("");

describe.each(TABLES)("天乙贵人 · %s", (_name, T) => {
  it("① 十干齐全，每干两位且互异", () => {
    expect(Object.keys(T).sort()).toEqual([...GAN].sort());
    for (const g of GAN) {
      expect(T[g]).toHaveLength(2);
      expect(T[g][0]).not.toBe(T[g][1]);
      for (const z of T[g]) expect(ZHI).toContain(z);
    }
  });

  it("③ 昼贵 + 夜贵 ≡ 8 (mod 12)（关于辰戌轴对称，十干恒定）", () => {
    const sums = new Set(GAN.map((g) => (ZHI.indexOf(T[g][0]) + ZHI.indexOf(T[g][1])) % 12));
    expect([...sums]).toEqual([8]);
  });

  it("④ 位置对恰五组，对应五句口诀", () => {
    const groups = new Map<string, string[]>();
    for (const g of GAN) {
      const k = asSet(T[g]);
      groups.set(k, [...(groups.get(k) ?? []), g]);
    }
    expect(groups.size).toBe(5);
    expect([...groups.keys()].sort()).toEqual(["丑未", "亥酉", "午寅", "卯巳", "子申"].sort());
  });
});

describe("天乙贵人 · 跨文件", () => {
  it("反证：四份表都真的解析到了（解析失败会让下面全变空跑）", () => {
    expect(TABLES).toHaveLength(4);
    for (const [name, T] of TABLES) expect(`${name}:${Object.keys(T).length}`).toBe(`${name}:10`);
  });

  it("② 四份表逐干的位置对（无序）完全相同", () => {
    const [[baseName, base]] = TABLES;
    const diff: string[] = [];
    for (const [name, T] of TABLES.slice(1)) {
      for (const g of GAN) {
        if (asSet(T[g]) !== asSet(base[g]))
          diff.push(`${g}: ${baseName}=${asSet(base[g])} vs ${name}=${asSet(T[g])}`);
      }
    }
    expect(diff).toEqual([]);
  });

  it("反证：把紫微的天魁天钺整体挪一位，②必须报红", () => {
    const zw = parseZiwei();
    const shifted: Pairs = {};
    for (const g of GAN) {
      shifted[g] = [ZHI[(ZHI.indexOf(zw[g][0]) + 1) % 12], ZHI[(ZHI.indexOf(zw[g][1]) + 1) % 12]];
    }
    const base = TABLES[0][1];
    const bad = GAN.filter((g) => asSet(shifted[g]) !== asSet(base[g]));
    expect(bad).toEqual(GAN); // 十干全不匹配
  });

  /**
   * 待决项快照：金口诀 B 派与 A 派的分歧范围。
   * 这里不判对错，只把「位置全同、昼夜八处不同」这个事实钉住，
   * 以免将来有人默默改了 B 表就把这条待决项抹掉了。
   */
  it("待决快照：GUIREN_B 与 A —— 位置对 10/10 相同，昼贵归属 8/10 不同", () => {
    const A = parseJkj("A"), B = parseJkj("B");
    const samePos = GAN.filter((g) => asSet(A[g]) === asSet(B[g]));
    const diffDay = GAN.filter((g) => A[g][0] !== B[g][0]);
    expect(samePos).toEqual(GAN);
    expect(diffDay.sort()).toEqual(["甲", "乙", "丙", "丁", "己", "辛", "壬", "癸"].sort());
  });
});
