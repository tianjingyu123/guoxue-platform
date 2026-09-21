import * as fs from "fs";
import * as path from "path";

/**
 * 六十四卦多副本一致性扫描（2026-09-20）
 *
 * ══ 为什么要有这道扫描 ══
 *
 * 仓库里同一份六十四卦表有 **15 个副本**（12 个计算器 + 知识库种子 + shared 两处）。
 * 原为 16 个，`kongming` 已于 2026-09-20 随工具下架（实现的术不对，见 REMOVED_WRONG）。
 * 按「同一概念有 n 份实现就有至少 n−1 份错」，这里必然藏着错字与错配——
 * 首轮跑下来确实抓出三处：
 *
 *   · `liushisi-gua` 第 63 卦既济 `yaoPattern` 写成 101110（第四爻误作阳）
 *   · `meihua` 的卦名→卦符表漏了「泽水困」，查它得到 `?`
 *   · `meihua-duangua` 的卦名表只有 63 条，缺「乾离」(天火同人)，被 `||` 兜底成「乾上离」
 *
 * ══ 判据为什么不抄外部卦表 ══
 *
 * 抄一张卦表来当参照，等于用一份没验过的数据去验另一份。这里的判据全部**可推导**：
 *
 *   A 名↔位：卦名头两字就是上下卦之象（水雷屯＝上坎下震），必与所在格一致。
 *            这是**内容型**判据——把「格子」和「它的位置」绑在一起，
 *            计数型不变量（多少格、有没有重复）约束不了内容。
 *   B 序卦对偶：通行本「二二相耦，非覆即变」——每对 (2k−1, 2k) 必为综卦，
 *            自综者（乾坤颐大过坎离中孚小过）必为错卦。纯由六爻推，不查表。
 *   C 完备双射：64 格不重不漏。
 *   D 符号↔序：Unicode 卦符 U+4DC0..U+4DFF 就是通行卦序，
 *            码位必等于 0x4DC0 + 序 − 1。这是外部权威锚点且不是"某本书的说法"。
 *   E 京房八宫：本宫→一世…五世→游魂→归魂全由爻变推出，连世应爻位一并推出。
 *   F 跨副本：同序号 / 同格的卦名逐项比对。
 *
 * ══ 边界 ══
 *
 * 这道扫描**不校勘引文**。卦辞爻辞的异文（祗/祇、咷/啕、寘/置、臲卼/臲兀…）
 * 需要底本才能定，已单列清单交人工校勘，不在这里断言。
 */

const ROOT = path.resolve(__dirname, "../../..");
const CAL = path.join(ROOT, "apps/server/src/modules/tool-registry/calculators");
const read = (p: string) => fs.readFileSync(p, "utf8");

const XIANG2GUA: Record<string, string> = { 天: "乾", 泽: "兑", 火: "离", 雷: "震", 风: "巽", 水: "坎", 山: "艮", 地: "坤" };
const GUA2XIANG: Record<string, string> = Object.fromEntries(Object.entries(XIANG2GUA).map(([a, b]) => [b, a]));
const GUA2BITS: Record<string, number[]> = {
  乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
  巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
};
/** 矩阵型表与八宫表统一用的八卦次序 */
const ORDER = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];

/** 由卦名推出上下卦：名字自己就说明了它该在哪一格 */
function trigrams(name: string): { upper: string; lower: string } | null {
  if (!name) return null;
  const m = /^(.)为(.)$/.exec(name);
  if (m) return GUA2XIANG[m[1]] === m[2] ? { upper: m[1], lower: m[1] } : null;
  const u = XIANG2GUA[name[0]], l = XIANG2GUA[name[1]];
  return u && l ? { upper: u, lower: l } : null;
}
/** 六爻自下而上，1=阳 */
function lines6(name: string): number[] | null {
  const t = trigrams(name);
  return t ? [...GUA2BITS[t.lower], ...GUA2BITS[t.upper]] : null;
}
const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function all(re: RegExp, txt: string): RegExpExecArray[] {
  const r: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) r.push(m);
  return r;
}

// ── 抽取：按通行卦序编号的副本 ──
interface Entry { name: string; symbol?: string; upper?: string; lower?: string; yaoPattern?: number[] }
const byIndex: Record<string, Record<number, Entry>> = {};

{
  const t = read(path.join(CAL, "dayan-shifa.calculator.ts"));
  byIndex["dayan-shifa"] = {};
  for (const m of all(/^\s*(\d+):\s*\{name:"([^"]+)",symbol:"([^"]*)"/gm, t)) byIndex["dayan-shifa"][+m[1]] = { name: m[2], symbol: m[3] };
}
{
  const t = read(path.join(CAL, "jiaoshi-yilin.calculator.ts"));
  byIndex["jiaoshi-yilin"] = {};
  for (const m of all(/\[\s*(\d+),\s*"([^"]+)","([^"]*)","([^"]*)","([^"]*)"/g, t)) byIndex["jiaoshi-yilin"][+m[1]] = { name: m[2], symbol: m[3], upper: m[4], lower: m[5] };
}
{
  const t = read(path.join(CAL, "jinqianke.calculator.ts"));
  byIndex["jinqianke"] = {};
  let i = 0;
  for (const m of all(/\{name:"([^"]+)",symbol:"([^"]*)",key:"(\d+)",shangGua:"([^"]+)",xiaGua:"([^"]+)"/g, t)) byIndex["jinqianke"][++i] = { name: m[1], symbol: m[2], upper: m[4], lower: m[5] };
}
// kongming 那份 64 卦表已随工具于 2026-09-20 下架（实现的术不对，见 REMOVED_WRONG），
// 副本数由 16 降为 15。
{
  const t = read(path.join(CAL, "liushisi-gua.calculator.ts"));
  byIndex["liushisi-gua"] = {};
  for (const m of all(/number:\s*(\d+),\s*name:\s*"([^"]+)",\s*symbol:\s*"([^"]*)",\s*composition:\s*\{\s*upper:\s*"([^"]+)",\s*lower:\s*"([^"]+)"\s*\},[\s\S]*?yaoPattern:\s*\[([^\]]*)\]/g, t))
    byIndex["liushisi-gua"][+m[1]] = { name: m[2], symbol: m[3], upper: m[4], lower: m[5], yaoPattern: m[6].split(",").map((s) => +s.trim()) };
}
{
  const t = read(path.join(CAL, "liushisi-tupu.calculator.ts"));
  byIndex["liushisi-tupu"] = {};
  for (const m of all(/\{ number: (\d+), name: "([^"]+)", shangGua: "([^"]+)", xiaGua: "([^"]+)"/g, t))
    byIndex["liushisi-tupu"][+m[1]] = { name: m[2], upper: m[3].replace(/[^一-龥]/g, ""), lower: m[4].replace(/[^一-龥]/g, "") };
}
{
  const t = read(path.join(CAL, "xuankong-dagua.calculator.ts"));
  byIndex["xuankong-dagua"] = {};
  for (const m of all(/\{ n:(\d+), name:"([^"]+)", sym:"([^"]*)", upper:"([^"]+)", lower:"([^"]+)"/g, t))
    byIndex["xuankong-dagua"][+m[1]] = { name: m[2], symbol: m[3], upper: m[4], lower: m[5] };
}
{
  const t = read(path.join(CAL, "zhouyi-64gua.calculator.ts"));
  byIndex["zhouyi-64gua"] = {};
  for (const m of all(/\{ index: (\d+), name: "([^"]+)", symbol: "([^"]*)", shangGua: "([^"]+)", xiaGua: "([^"]+)"/g, t))
    byIndex["zhouyi-64gua"][+m[1]] = { name: m[2], upper: m[4], lower: m[5] };
}
{
  const t = read(path.join(ROOT, "apps/server/src/modules/paipan/knowledge-seed/gua64.ts"));
  byIndex["knowledge-seed/gua64"] = {};
  let i = 0;
  for (const m of all(/\{ name: "([^"]+)", xiang:/g, t)) byIndex["knowledge-seed/gua64"][++i] = { name: m[1] };
}

// ── 抽取：按 [上卦][下卦] 定位的副本 ──
const byPos: Record<string, Record<string, string>> = {};
function matrix(file: string, blockRe: RegExp) {
  const t = read(file);
  const hit = blockRe.exec(t);
  if (!hit) throw new Error(`矩阵块未匹配：${file}`);
  // 三份矩阵的写法不同（有的留了空行/空列占位，有的没有），
  // 统一做法：只认由字符串字面量组成的行，再滤掉占位空串，最后要求恰好 8×8。
  const rows = all(/\[(?:\s*"[^"]*"\s*,?)+\s*\]/g, hit[0])
    .map((m) => all(/"([^"]*)"/g, m[0]).map((q) => q[1]).filter(Boolean))
    .filter((r) => r.length > 0);
  if (rows.length !== 8 || rows.some((r) => r.length !== 8)) {
    throw new Error(`矩阵形状不是 8×8：${file} → ${rows.map((r) => r.length).join(",")}`);
  }
  const map: Record<string, string> = {};
  rows.forEach((row, ri) => row.forEach((n, ci) => { map[ORDER[ri] + "|" + ORDER[ci]] = n; }));
  return map;
}
byPos["heluo"] = matrix(path.join(CAL, "heluo.calculator.ts"), /const HEXAGRAM_NAMES[\s\S]*?\n\];/);
byPos["shared/meihua-data"] = matrix(path.join(ROOT, "packages/shared/src/paipan/meihua-data.ts"), /export const HEX_NAMES: string\[\]\[\] = \[[\s\S]*?\n\]/);
byPos["shared/liuyao-engine"] = matrix(path.join(ROOT, "packages/shared/src/paipan/liuyao-engine.ts"), /const GUA_NAMES: string\[\]\[\] = \[[\s\S]*?\n\]/);
{
  const t = read(path.join(CAL, "meihua.calculator.ts"));
  byPos["meihua"] = {};
  for (const m of all(/"(\d)(\d)":"([^"]+)"/g, t)) byPos["meihua"][ORDER[+m[1] - 1] + "|" + ORDER[+m[2] - 1]] = m[3];
}
{
  const t = read(path.join(CAL, "meihua-duangua.calculator.ts"));
  byPos["meihua-duangua"] = {};
  for (const m of all(/"([一-龥])([一-龥])":\s*"([^"]+)"/g, t))
    if (GUA2BITS[m[1]] && GUA2BITS[m[2]]) byPos["meihua-duangua"][m[1] + "|" + m[2]] = m[3];
}

// ── 抽取：京房八宫序的副本（number 不是卦序） ──
interface NajiaEntry extends Entry { gong: string; shi: number; ying: number }
const najia: NajiaEntry[] = all(
  /\{ number: (\d+), name: "([^"]+)", symbol: "([^"]*)", upper: "([^"]+)", lower: "([^"]+)", gong: "([^"]*)", shiYao: (\d+), yingYao: (\d+) \}/g,
  read(path.join(CAL, "liuyao-najia.calculator.ts")),
).map((m) => ({ name: m[2], symbol: m[3], upper: m[4], lower: m[5], gong: m[6], shi: +m[7], ying: +m[8] }));

describe("六十四卦副本一致性", () => {
  // 反证：抽取器本身不能是空的，否则下面每一条都会"因为没有数据而全绿"
  it("反证：每个副本都真的抽到了 64 条（抽取器失灵会让全部断言变成空跑）", () => {
    for (const [k, v] of Object.entries(byIndex)) expect(`${k}=${Object.keys(v).length}`).toBe(`${k}=64`);
    for (const [k, v] of Object.entries(byPos)) expect(`${k}=${Object.keys(v).length}`).toBe(`${k}=64`);
    expect(najia).toHaveLength(64);
  });

  describe("A 名↔位：卦名头两字即上下卦之象", () => {
    for (const [key, map] of Object.entries(byPos)) {
      it(`${key}：64 格名与位相符`, () => {
        const bad = Object.entries(map).filter(([pos, nm]) => {
          const [u, l] = pos.split("|");
          const t = trigrams(nm);
          return !t || t.upper !== u || t.lower !== l;
        }).map(([pos, nm]) => `[上${pos.split("|")[0]}下${pos.split("|")[1]}]=${nm}`);
        expect(bad).toEqual([]);
      });
    }
    for (const [key, map] of Object.entries(byIndex)) {
      const has = Object.values(map).some((v) => v.upper);
      if (!has) continue;
      it(`${key}：声明的 upper/lower 与卦名相符`, () => {
        const bad = Object.entries(map).filter(([, v]) => {
          const t = trigrams(v.name);
          return !t || t.upper !== v.upper || t.lower !== v.lower;
        }).map(([i, v]) => `#${i} ${v.name} 声明上${v.upper}下${v.lower}`);
        expect(bad).toEqual([]);
      });
    }
    it("liuyao-najia：声明的 upper/lower 与卦名相符", () => {
      const bad = najia.filter((v) => {
        const t = trigrams(v.name);
        return !t || t.upper !== v.upper || t.lower !== v.lower;
      }).map((v) => `${v.name} 声明上${v.upper}下${v.lower}`);
      expect(bad).toEqual([]);
    });
  });

  describe("B 序卦对偶：二二相耦，非覆即变", () => {
    for (const [key, map] of Object.entries(byIndex)) {
      it(`${key}：32 对全合`, () => {
        const bad: string[] = [];
        for (let k = 1; k <= 32; k++) {
          const a = map[2 * k - 1], b = map[2 * k];
          const la = a && lines6(a.name), lb = b && lines6(b.name);
          if (!la || !lb) { bad.push(`#${2 * k - 1}/${2 * k} 缺项或名不可解`); continue; }
          const rev = [...la].reverse();
          const ok = same(la, rev) ? same(lb, la.map((x) => 1 - x)) : same(lb, rev);
          if (!ok) bad.push(`#${2 * k - 1}${a.name}/#${2 * k}${b.name}`);
        }
        expect(bad).toEqual([]);
      });
    }
  });

  describe("C 完备双射：64 格不重不漏", () => {
    for (const [key, map] of Object.entries({ ...byIndex })) {
      it(`${key}：无重复卦名`, () => {
        const names = Object.values(map).map((v) => v.name);
        expect(new Set(names).size).toBe(names.length);
      });
    }
    for (const [key, map] of Object.entries(byPos)) {
      it(`${key}：64 格齐全且无重复`, () => {
        const missing: string[] = [];
        for (const u of ORDER) for (const l of ORDER) if (!map[u + "|" + l]) missing.push(`上${u}下${l}`);
        expect(missing).toEqual([]);
        const names = Object.values(map);
        expect(new Set(names).size).toBe(names.length);
      });
    }
  });

  describe("D 卦符↔卦序：Unicode U+4DC0..U+4DFF 即通行卦序", () => {
    for (const [key, map] of Object.entries(byIndex)) {
      const has = Object.values(map).some((v) => v.symbol && v.symbol.codePointAt(0)! >= 0x4dc0);
      if (!has) continue;
      it(`${key}：卦符码位 = 0x4DC0 + 序 − 1`, () => {
        const bad = Object.entries(map)
          .filter(([i, v]) => v.symbol && v.symbol.codePointAt(0)! >= 0x4dc0 && v.symbol.codePointAt(0) !== 0x4dc0 + +i - 1)
          .map(([i, v]) => `#${i} ${v.name} 作${v.symbol} 应${String.fromCodePoint(0x4dc0 + +i - 1)}`);
        expect(bad).toEqual([]);
      });
    }
  });

  describe("E 京房八宫：本宫→一世…游魂→归魂，全由爻变推出", () => {
    const SHI = [6, 1, 2, 3, 4, 5, 4, 3];
    const LABEL = ["本宫", "一世", "二世", "三世", "四世", "五世", "游魂", "归魂"];
    it("liuyao-najia：64 卦的卦名/宫属/世应全部与爻变推导相符", () => {
      const bad: string[] = [];
      najia.forEach((v, n) => {
        const pal = ORDER[Math.floor(n / 8)], step = n % 8;
        const base = [...GUA2BITS[pal], ...GUA2BITS[pal]];
        const ln = [...base];
        for (let j = 0; j < Math.min(step, 5); j++) ln[j] = 1 - ln[j];
        if (step >= 6) { for (let j = 0; j < 5; j++) ln[j] = 1 - base[j]; ln[3] = base[3]; }
        if (step === 7) for (let j = 0; j < 3; j++) ln[j] = base[j];
        const real = lines6(v.name);
        if (!real || !same(real, ln)) { bad.push(`${pal}宫${LABEL[step]} 表作${v.name} 应${ln.join("")}`); return; }
        if (v.gong !== pal + "宫") bad.push(`${v.name} gong=${v.gong} 应${pal}宫`);
        if (v.shi !== SHI[step]) bad.push(`${v.name}(${LABEL[step]}) 世${v.shi} 应${SHI[step]}`);
        const ying = SHI[step] > 3 ? SHI[step] - 3 : SHI[step] + 3;
        if (v.ying !== ying) bad.push(`${v.name}(${LABEL[step]}) 应${v.ying} 应为${ying}`);
      });
      expect(bad).toEqual([]);
    });
  });

  describe("F 跨副本：同序号 / 同格必须给同一个卦名", () => {
    it("按卦序编号的 9 个副本逐序一致", () => {
      const bad: string[] = [];
      for (let i = 1; i <= 64; i++) {
        const seen = new Map<string, string[]>();
        for (const [k, map] of Object.entries(byIndex)) {
          const v = map[i];
          if (v) seen.set(v.name, [...(seen.get(v.name) ?? []), k]);
        }
        if (seen.size > 1) bad.push(`序${i}：` + [...seen].map(([n, ks]) => `${n}(${ks.join(",")})`).join(" vs "));
      }
      expect(bad).toEqual([]);
    });
    it("按上下卦定位的 5 个副本逐格一致", () => {
      const bad: string[] = [];
      for (const u of ORDER) for (const l of ORDER) {
        const seen = new Map<string, string[]>();
        for (const [k, map] of Object.entries(byPos)) {
          const v = map[u + "|" + l];
          if (v) seen.set(v, [...(seen.get(v) ?? []), k]);
        }
        if (seen.size > 1) bad.push(`[上${u}下${l}]：` + [...seen].map(([n, ks]) => `${n}(${ks.join(",")})`).join(" vs "));
      }
      expect(bad).toEqual([]);
    });
    it("两类副本的卦名用字完全相同（错一个字就永远检索不到）", () => {
      const a = new Set<string>(), b = new Set<string>();
      Object.values(byIndex).forEach((m) => Object.values(m).forEach((v) => a.add(v.name)));
      Object.values(byPos).forEach((m) => Object.values(m).forEach((v) => b.add(v)));
      najia.forEach((v) => b.add(v.name));
      expect([...a].filter((n) => !b.has(n))).toEqual([]);
      expect([...b].filter((n) => !a.has(n))).toEqual([]);
    });
    it("meihua 卦名→卦符表：64 条且与通行卦序相符", () => {
      const t = read(path.join(CAL, "meihua.calculator.ts"));
      const sym: Record<string, string> = {};
      for (const m of all(/"([一-龥]+)":"([䷀-䷿])"/g, t)) sym[m[1]] = m[2];
      const nameToIdx: Record<string, number> = {};
      for (const map of Object.values(byIndex)) for (const [i, v] of Object.entries(map)) nameToIdx[v.name] = +i;
      expect(Object.keys(sym)).toHaveLength(64);
      const bad = Object.entries(sym)
        .filter(([nm, s]) => !nameToIdx[nm] || s.codePointAt(0) !== 0x4dc0 + nameToIdx[nm] - 1)
        .map(([nm, s]) => `${nm} 作${s}`);
      expect(bad).toEqual([]);
    });
    it("liuyao-najia 卦符：按卦名对应的通行卦序核", () => {
      const nameToIdx: Record<string, number> = {};
      for (const map of Object.values(byIndex)) for (const [i, v] of Object.entries(map)) nameToIdx[v.name] = +i;
      const bad = najia
        .filter((v) => v.symbol && (!nameToIdx[v.name] || v.symbol.codePointAt(0) !== 0x4dc0 + nameToIdx[v.name] - 1))
        .map((v) => `${v.name} 作${v.symbol}`);
      expect(bad).toEqual([]);
    });
  });

  describe("坏字：引文里不得出现独立的偏旁", () => {
    /**
     * 既济六四原本写成「繻有衣衤如」——「袽」被拆成了「衤」+「如」。
     * 这类坏字不是异文、不需要底本就能判：偏旁单用在经文里不成字。
     * （祗/祇、咷/啕、寘/置 那些是真异文，需要底本，不在这里断言。）
     */
    const RADICALS = "衤礻讠钅饣纟忄氵扌犭辶";
    /**
     * 只扫这 15 个带卦表的文件。全仓库扫会被 `cezi`（测字）刷屏 61 条——
     * 那门术本来就拿偏旁当数据，不是坏字。**会狼来了的扫描等于没有。**
     */
    const files = [
      "dayan-shifa", "heluo", "jiaoshi-yilin", "jinqianke", "liushisi-gua",
      "liushisi-tupu", "liuyao-guaci", "liuyao-najia", "meihua", "meihua-duangua",
      "xuankong-dagua", "zhouyi-64gua",
    ].map((n) => path.join(CAL, `${n}.calculator.ts`)).concat([
      path.join(ROOT, "packages/shared/src/paipan/meihua-data.ts"),
      path.join(ROOT, "packages/shared/src/paipan/liuyao-engine.ts"),
      path.join(ROOT, "apps/server/src/modules/paipan/knowledge-seed/gua64.ts"),
    ]);
    it(`15 份卦表的字符串字面量里没有孤立偏旁（${RADICALS}）`, () => {
      const bad: string[] = [];
      for (const f of files) {
        for (const m of all(/"([^"\n]*)"/g, read(f))) {
          const hit = [...m[1]].filter((c) => RADICALS.includes(c));
          if (hit.length) bad.push(`${path.basename(f)}: ${m[1].slice(0, 40)} ← ${hit.join("")}`);
        }
      }
      expect(bad).toEqual([]);
    });
  });

  describe("爻象：yaoPattern 必须与卦名推出的六爻一致", () => {
    it("liushisi-gua：64 条相符（既济曾写成 101110）", () => {
      const bad = Object.entries(byIndex["liushisi-gua"])
        .filter(([, v]) => v.yaoPattern && !same(lines6(v.name)!, v.yaoPattern))
        .map(([i, v]) => `#${i} ${v.name} 作${v.yaoPattern!.join("")} 应${lines6(v.name)!.join("")}`);
      expect(bad).toEqual([]);
    });
  });
});
