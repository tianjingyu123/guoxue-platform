import * as fs from "fs";
import * as path from "path";

/**
 * 玄空飞星·表结构可推导性（2026-09-20）
 *
 * ══ 为什么重点守这个 ══
 *
 * 与 ★28（万年历九宫飞星 9 宫错 8 宫）同类：**用户是照着方位摆家具、定床位的**。
 * ★28 的错法正是「把整套正确偏移安到了错的宫上」，所以这里第一条就守飞泊偏移的写法。
 *
 * 本文件只守源码层的静态表与关键公式（不跑引擎，适合 CI）。
 * 需要跑引擎的部分在 `artifacts/paipan-compare-20260919/`：
 *   xuankong-verify.mts   ——  九宫飞泊全枚举、年月日时紫白的逐格递推、
 *                             日干支锚点与已验证 bazi 核心跨文件比对、9 运×24 山×下卦/替卦 432 局
 *   xuankong-duality.mts  ——  坐向对调对偶
 *
 * ══ 判据 ══
 *
 * ① 二十四山自北顺时针 24 个、互异
 * ② 山 → 卦宫：对宫洛书数和为 10（坎1↔离9 艮8↔坤2 震3↔兑7 巽4↔乾6），八宫各 3 山
 * ③ 山阴阳：四正卦（坎离震兑）三山 [阳,阴,阴]；四隅卦（乾坤艮巽）[阴,阳,阳]；对山阴阳相同
 * ④ 元龙周期 3；PALACE_MOUNTAINS 与 MOUNTAIN_PALACE 互为逆映射
 * ⑤ 飞泊偏移必须写成「洛书本数 − 5」（★28 栽过的就是这一条）
 * ⑥ 替卦表覆盖二十四山且恰分 5 组，与文件头口诀逐字对应
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/xuankong-data.ts"), "utf8",
);

function arr(name: string): string[] {
  const m = new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
function nums(name: string): number[] {
  const m = new RegExp(`export const ${name}: number\\[\\] = \\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  // ⚠️ 必须先滤掉空串再转数字：数组字面量有尾逗号，split 出的末项是空串，
  //    而 `Number("")` 是 **0 不是 NaN**，靠 isNaN 过滤会凭空多出一个 0。
  return m[1].split(",").map((x) => x.trim()).filter((x) => x !== "").map(Number);
}
function bools(name: string): boolean[] {
  const m = new RegExp(`export const ${name}: boolean\\[\\] = \\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return m[1].split(",").map((x) => x.trim()).filter((x) => x === "true" || x === "false").map((x) => x === "true");
}

const MOUNTAINS = arr("MOUNTAINS");
const PALACE = nums("MOUNTAIN_PALACE");
const YANG = bools("MOUNTAIN_YANG");
const YUAN = nums("MOUNTAIN_YUAN");
const SIZHENG = new Set([1, 9, 3, 7]); // 坎离震兑

describe("玄空飞星 · 二十四山", () => {
  it("反证：四张表都解析到且各 24 项（解析失败会让下面全变空跑）", () => {
    for (const [n, a] of [["MOUNTAINS", MOUNTAINS], ["MOUNTAIN_PALACE", PALACE],
      ["MOUNTAIN_YANG", YANG], ["MOUNTAIN_YUAN", YUAN]] as [string, unknown[]][]) {
      expect(`${n}:${a.length}`).toBe(`${n}:24`);
    }
    expect(new Set(MOUNTAINS).size).toBe(24);
    expect(MOUNTAINS[0]).toBe("壬"); // 自北（坎宫地元）起顺时针
  });

  it("② 对山卦宫洛书数和为 10，八宫各辖 3 山", () => {
    const bad: string[] = [];
    for (let i = 0; i < 24; i++) {
      const s = PALACE[i] + PALACE[(i + 12) % 24];
      if (s !== 10) bad.push(`${MOUNTAINS[i]}(${PALACE[i]})+${MOUNTAINS[(i + 12) % 24]}(${PALACE[(i + 12) % 24]})=${s}`);
    }
    expect(bad).toEqual([]);
    const cnt: Record<number, number> = {};
    for (const p of PALACE) cnt[p] = (cnt[p] ?? 0) + 1;
    expect(cnt).toEqual({ 1: 3, 2: 3, 3: 3, 4: 3, 6: 3, 7: 3, 8: 3, 9: 3 }); // 无 5 宫（中宫不配山）
  });

  it("③ 四正卦 [阳,阴,阴] / 四隅卦 [阴,阳,阳]，且对山阴阳相同", () => {
    const bad: string[] = [];
    for (let i = 0; i < 24; i += 3) {
      const pal = PALACE[i];
      const want = SIZHENG.has(pal) ? [true, false, false] : [false, true, true];
      const got = [YANG[i], YANG[i + 1], YANG[i + 2]];
      if (got.join() !== want.join())
        bad.push(`${pal}宫(${MOUNTAINS.slice(i, i + 3).join("")})=${got.join()} 应${want.join()}`);
    }
    expect(bad).toEqual([]);
    for (let i = 0; i < 24; i++) expect(`${MOUNTAINS[i]}:${YANG[i]}`).toBe(`${MOUNTAINS[i]}:${YANG[(i + 12) % 24]}`);
  });

  it("④ 元龙周期 3（地元/天元/人元）", () => {
    expect(YUAN).toEqual(Array.from({ length: 24 }, (_, i) => i % 3));
  });

  it("④b PALACE_MOUNTAINS 与 MOUNTAIN_PALACE 互为逆映射，覆盖 24 山", () => {
    const blk = /export const PALACE_MOUNTAINS[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC);
    expect(blk).not.toBeNull();
    const map: Record<number, number[]> = {};
    for (const m of blk![1].matchAll(/(\d): \[(\d+), (\d+), (\d+)\]/g))
      map[Number(m[1])] = [Number(m[2]), Number(m[3]), Number(m[4])];
    expect(Object.keys(map)).toHaveLength(8);
    const all: number[] = [];
    for (const [pal, idxs] of Object.entries(map)) {
      for (const i of idxs) {
        expect(`${MOUNTAINS[i]}→${PALACE[i]}`).toBe(`${MOUNTAINS[i]}→${Number(pal)}`);
        all.push(i);
      }
    }
    expect(all.sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });
});

describe("玄空飞星 · 飞泊偏移（★28 同类风险点）", () => {
  /**
   * ★28：万年历九宫飞星把整套正确偏移安到了错的宫上，九个方位错八个，
   * 而用户正照着那些方位摆书桌床位。修法是 `offset = 该宫洛书本数 − 5`。
   * 玄空这份写的是 `(palace - 5 + 9) % 9`，正是同一形式。此处钉死，防止有人"优化"回去。
   */
  it("⑤ palaceOffset 必须是「洛书本数 − 5」的形式", () => {
    const m = /function palaceOffset\(palace: number\): number \{\s*return ([^\n]+)\n/.exec(SRC);
    expect(m).not.toBeNull();
    expect(m![1].replace(/\s/g, "")).toBe("(palace-5+9)%9");
  });

  it("⑤b 该公式给出的飞泊次序恰为洛书序 中→乾→兑→艮→离→坎→坤→震→巽", () => {
    const off = (p: number) => (p - 5 + 9) % 9;
    const order = Array.from({ length: 9 }, (_, k) => {
      for (let p = 1; p <= 9; p++) if (off(p) === k) return p;
      return -1;
    });
    expect(order).toEqual([5, 6, 7, 8, 9, 1, 2, 3, 4]);
  });
});

describe("玄空飞星 · 替卦表", () => {
  const blk = /const TI_TABLE[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC)!;
  const T: Record<string, number> = {};
  for (const m of blk[1].matchAll(/(.): (\d)/g)) T[m[1]] = Number(m[2]);

  it("⑥ 覆盖二十四山、不重不漏", () => {
    expect(Object.keys(T).sort()).toEqual([...MOUNTAINS].sort());
  });

  it("⑥b 恰分 5 组，与文件头口诀逐字对应", () => {
    const groups: Record<number, string> = {};
    for (const k of Object.keys(T)) groups[T[k]] = (groups[T[k]] ?? "") + k;
    const sorted = Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, [...v].sort().join("")]),
    );
    expect(sorted).toEqual({
      1: [..."子癸甲申"].sort().join(""),           // 子癸并甲申贪狼一路行
      2: [..."壬卯乙未坤"].sort().join(""),          // 壬卯乙未坤五位为巨门
      6: [..."乾亥辰巽巳戌"].sort().join(""),        // 乾亥辰巽巳连戌武曲名
      7: [..."酉辛丑艮丙"].sort().join(""),          // 酉辛丑艮丙天星说破军
      9: [..."寅午庚丁"].sort().join(""),            // 寅午庚丁上右弼四星临
    });
    // 五组人数 4+5+6+5+4 = 24
    expect(Object.values(sorted).map((s) => s.length)).toEqual([4, 5, 6, 5, 4]);
  });

  it("反证：口诀里的字与表必须真对得上（把贪狼组少写一字就该红）", () => {
    const tan = Object.keys(T).filter((k) => T[k] === 1).sort().join("");
    expect(tan).not.toBe([..."子癸甲"].sort().join(""));
    expect(tan).toBe([..."子癸甲申"].sort().join(""));
  });
});
