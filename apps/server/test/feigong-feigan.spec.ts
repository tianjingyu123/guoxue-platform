import * as fs from "fs";
import * as path from "path";

/**
 * 飞宫小奇门·甲乘龙飞九宫（★37，2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `apps/mobile/src/pkg-paipan/lib/feigong-engine.ts` 的飞干循环原写法：
 *
 *     for (const g of GANS) {
 *       if (pulled.has(g)) continue
 *       ganAt[cursor].push(g)
 *       if (cursor === 5) { const mate = WUHE[g]; ...; pulled.add(mate) }
 *       cursor = cursor === 9 ? 1 : cursor + 1
 *     }
 *
 * `pulled.add(mate)` 只能阻止**后续**布干。而天干五合恒为「相隔五位」，
 * 所以当落中宫之干的序号 ≥ 5 时，它的合干**早已布在前面的宫里**——
 * 既不会被跳过，也不会从原宫移走。后果有两个：
 *
 *   1. 该合干同时出现在中宫和另一宫（重复）；
 *   2. 十干循环因此多走一步、回绕到青龙宫，第 10 个干被 `ganAt[p][0] ?? ""` **静默丢弃**。
 *
 * 中宫在飞行序中的位次 s = (5 − 青龙宫 + 9) mod 9，落中宫之干为 GANS[s]：
 *
 *   | 青龙宫 | s | 落中宫之干 | 合干在前？ |
 *   |---|---|---|---|
 *   | 1 / 2 / 3 / 4 | 4/3/2/1 | 戊/丁/丙/乙 | 否 —— 正确 |
 *   | 6 / 7 / 8 / 9 | 8/7/6/5 | 壬/辛/庚/己 | **是 —— 出错** |
 *
 * 青龙落时支之宫，宫 6/7/8/9 对应时支 戌亥/酉/丑寅/午 —— **12 个时辰里占 6 个，半数盘受影响**。
 * 实测这半数盘里必有一干重复，且**癸恒定消失**（它总是回绕到青龙宫的那个第 10 干）。
 *
 * ══ 怎么修 ══
 *
 * 依文件头自己的口诀「落中宫之干的五合干**抽出**同居中宫」——「抽出」即不给它单独的宫，
 * 无论它排在中宫之前还是之后。所以先定出落中宫之干再飞：
 * 合干在前时它被抽出，后段整体顺延一位，落中宫之干变为 `GANS[s + 1]`。
 *
 * 修后八个青龙宫位十干全部齐全、不重不漏；黄金课例（青龙落震3宫，中宫丙辛）原样不变。
 *
 * ══ 本测试守什么 ══
 *
 * 用与实现**相互独立**的算法重排一遍飞干，逐宫比对八个青龙宫位；
 * 并显式守住「十干各出现一次」——这正是原缺陷违反的那条。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/feigong-engine.ts"), "utf8",
);

const GANS = "甲乙丙丁戊己庚辛壬癸".split("");
const WUHE: Record<string, string> = {
  甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙",
  丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊",
};
const PALACES = [1, 2, 3, 4, 6, 7, 8, 9];

/** 独立重排：给定青龙宫，返回 { 宫→干, 中宫两干 } */
function fly(qinglong: number): { at: Record<number, string>; center: [string, string] } {
  const centerStep = (((5 - qinglong) % 9) + 9) % 9;
  const centerGan =
    GANS.indexOf(WUHE[GANS[centerStep]]) > centerStep ? GANS[centerStep] : GANS[centerStep + 1];
  const pulled = new Set([WUHE[centerGan]]);
  const at: Record<number, string> = {};
  let center: [string, string] = ["", ""];
  let cursor = qinglong;
  for (const g of GANS) {
    if (pulled.has(g)) continue;
    if (cursor === 5) center = [g, WUHE[g]];
    else at[cursor] = g;
    cursor = cursor === 9 ? 1 : cursor + 1;
  }
  return { at, center };
}

describe("飞宫小奇门 · 甲乘龙飞九宫", () => {
  it("反证：源码读到且含飞干循环（读空会让下面全变空跑）", () => {
    expect(SRC).toMatch(/甲乘龙飞九宫/);
    expect(SRC).toMatch(/const centerStep = /);
  });

  it.each(PALACES)("青龙落 %i 宫：十干各出现一次，中宫两干互为五合", (q) => {
    const { at, center } = fly(q);
    const all = [...Object.values(at), ...center];
    expect(all).toHaveLength(10);
    expect(new Set(all).size).toBe(10);                 // ★37 违反的正是这一条
    expect([...new Set(all)].sort()).toEqual([...GANS].sort());
    expect(WUHE[center[0]]).toBe(center[1]);
    expect(at[q]).toBe("甲");                            // 青龙宫起甲
    expect(Object.keys(at).map(Number).sort((a, b) => a - b)).toEqual(PALACES);
  });

  it("黄金课例：青龙落震 3 宫时中宫为丙辛，且飞干与竞品实测一致", () => {
    const { at, center } = fly(3);
    expect(center).toEqual(["丙", "辛"]);
    // 文件头黄金基准：甲3 乙4 丁6 戊7 己8 庚9 壬1 癸2
    expect(at).toEqual({ 3: "甲", 4: "乙", 6: "丁", 7: "戊", 8: "己", 9: "庚", 1: "壬", 2: "癸" });
  });

  it("★37 复现：原写法（只 pulled.add 不抽出）在青龙宫 6/7/8/9 会重复并丢干", () => {
    /** 按缺陷前的写法重排，用于证明这条判据真能抓到它 */
    const buggy = (qinglong: number) => {
      const pulled = new Set<string>();
      const at: Record<number, string[]> = {};
      for (const p of [1, 2, 3, 4, 5, 6, 7, 8, 9]) at[p] = [];
      let cursor = qinglong;
      for (const g of GANS) {
        if (pulled.has(g)) continue;
        at[cursor].push(g);
        if (cursor === 5) {
          const mate = WUHE[g];
          if (!pulled.has(mate) && !at[5].includes(mate)) { at[5].push(mate); pulled.add(mate); }
        }
        cursor = cursor === 9 ? 1 : cursor + 1;
      }
      // 视图只取每宫第一个干
      const shown = [...PALACES.map((p) => at[p][0] ?? ""), ...at[5]];
      return shown;
    };
    for (const q of [1, 2, 3, 4]) {
      const s = buggy(q);
      expect(`${q}:${new Set(s).size}`).toBe(`${q}:10`);   // 这四个宫位原本就对
    }
    for (const q of [6, 7, 8, 9]) {
      const s = buggy(q);
      expect(`${q}:${new Set(s).size}`).toBe(`${q}:9`);    // 这四个只剩 9 个互异干
      // 丢掉的那个恒为癸（它总是回绕到青龙宫、被 ganAt[p][0] 吞掉的第 10 干）
      expect(GANS.filter((g) => !s.includes(g))).toEqual(["癸"]);
    }
  });

  it("实现必须保留「先定中宫之干再飞」的写法（防止改回原缺陷）", () => {
    // 查语义不查字面：必须先算出中宫位次与落中宫之干，再进飞行循环
    expect(SRC).toMatch(/const centerStep = \(\(\(5 - qinglongPalace\) % 9\) \+ 9\) % 9/);
    expect(SRC).toMatch(/const centerGan =/);
    expect(SRC).toMatch(/> centerStep \? GANS\[centerStep\] : GANS\[centerStep \+ 1\]/);
    expect(SRC).toMatch(/pulled\.add\(WUHE\[centerGan\]\)/);
    // 原缺陷的写法（在循环里才决定抽谁）不得复活
    expect(SRC).not.toMatch(/if \(!pulled\.has\(mate\) && !ganAt\[5\]\.includes\(mate\)\)/);
    // centerGan 必须在飞行循环之前算出
    expect(SRC.indexOf("const centerGan =")).toBeLessThan(SRC.indexOf("for (const g of GANS)"));
  });
});

describe("飞宫小奇门 · 黄黑道六神（口诀独立推出）", () => {
  const HUANGDAO_12 = ["青龙", "明堂", "天刑", "朱雀", "金匮", "天德", "白虎", "玉堂", "天牢", "玄武", "司命", "勾陈"];

  it("「道远几时通达／路遥何日还乡」里带辶的六字即黄道六神", () => {
    const SONG = [..."道远几时通达路遥何日还乡"];
    const CHUO = new Set([..."道远通达遥还"]);
    const derived = SONG.map((c, i) => (CHUO.has(c) ? HUANGDAO_12[i] : null)).filter(Boolean);
    expect(derived).toEqual(["青龙", "明堂", "金匮", "天德", "玉堂", "司命"]);

    const m = /const HUANGDAO_JI = new Set\(\[([^\]]+)\]\)/.exec(SRC)!;
    const inSrc = [...m[1].matchAll(/"(\S+?)"/g)].map((x) => x[1]);
    expect(inSrc.sort()).toEqual([...derived].sort());
  });

  it("与择吉 zeji-engine 的 HUANGDAO_SHEN 跨文件一致（★36 修过的那组）", () => {
    const ZEJI = fs.readFileSync(
      path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/zeji-engine.ts"), "utf8",
    );
    const zm = /const HUANGDAO_SHEN = new Set\(\[([^\]]+)\]\)/.exec(ZEJI)!;
    const zs = [...zm[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const fm = /const HUANGDAO_JI = new Set\(\[([^\]]+)\]\)/.exec(SRC)!;
    const fg = [...fm[1].matchAll(/"(\S+?)"/g)].map((x) => x[1]);
    expect(zs.sort()).toEqual(fg.sort());
  });
});
