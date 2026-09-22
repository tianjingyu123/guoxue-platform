import * as fs from "fs";
import * as path from "path";

/**
 * 八宅·大游年歌诀表可推导性（2026-09-20）
 *
 * ══ 抓手 ══
 *
 * `apps/mobile/src/pkg-paipan3/lib/bazhai-data.ts` 的 `YOUNIAN_SONG` 是一张
 * **8 卦 × 7 方 = 56 格的手写歌诀表**，是典型的「抄错了也看不出来」的形态。
 *
 * 但游年八星本质是**爻变**：两卦之间变了哪几爻，就唯一决定是哪一星。
 * 所以不逐格抄书，而是**只从「乾」一行反推出「变爻集合 → 星名」的映射，
 * 再拿它去验另外七行**。一行推出全表 —— 56 格里有 48 格是被推出来的，不是被抄来的。
 *
 * 实测反推结果（上中下三位，1 表示该爻变）：
 *
 *   000 伏位   100 生气   010 绝命   001 祸害
 *   111 延年   011 天医   110 五鬼   101 六煞
 *
 * ══ 最强的一条：东四/西四是群论结论，不是约定 ══
 *
 * 四吉星（伏位/生气/天医/延年）的变爻集合是 `{000, 100, 011, 111}`，
 * **对 XOR 封闭且含单位元 —— 构成 (Z/2)³ 的一个 4 元子群 H**。
 * 于是 H 的两个陪集恰好把八卦分成两组：
 *
 *   坎 ^ H = {坎, 巽, 震, 离} = 东四
 *   乾 ^ H = {乾, 兑, 艮, 坤} = 西四
 *
 * 这就是「东四命住东四宅」的根据：**同组 ⟺ 相互为四吉方**。
 * `GUA_INFO.group` 必须与这个分解一致 —— 它不是一张可以随便写的标注表。
 *
 * ══ 一处我判错、被数据纠正的地方 ══
 *
 * 我起初按「九宫对宫应为错卦（三爻全变）」验 `GRID_LAYOUT`，6 处报红。
 * 但那是**先天**八卦盘的性质；`GRID_LAYOUT` 是**后天**（洛书）盘，只有坎离一对恰是错卦。
 * 后天盘的正确判据是洛书幻方 `4 9 2 / 3 5 7 / 8 1 6`，以及对宫洛书数和为 10。
 * 换成这两条后全过。（同日在玄空替卦上犯过同型错误，见 [[verify-by-enumeration]]。）
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/bazhai-verify.mts`：64 格逐格验、对称性、
 * 命卦 1900–2100 全枚举（男女各覆盖八卦、22 个五黄年全归坤）、
 * 二十四山→八宅与玄空 `MOUNTAIN_PALACE` 跨文件一致。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan3/lib/bazhai-data.ts"), "utf8",
);

type Gua = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";
/** 八卦爻象（上中下，阳=1） */
const YAO: Record<Gua, number> = {
  乾: 0b111, 兑: 0b011, 离: 0b101, 震: 0b001,
  巽: 0b110, 坎: 0b010, 艮: 0b100, 坤: 0b000,
};
const ALL = Object.keys(YAO) as Gua[];
const JI = new Set(["生气", "天医", "延年", "伏位"]);
const bits = (n: number) => n.toString(2).padStart(3, "0");

/** 解析歌诀顺序与歌诀表，重建 8×8 的 star(A,B) */
function buildMatrix(): Record<Gua, Record<Gua, string>> {
  const ord = /const YOUNIAN_ORDER: Gua\[\] = \[([^\]]+)\]/.exec(SRC);
  if (!ord) throw new Error("YOUNIAN_ORDER 没解析到");
  const ORDER = [...ord[1].matchAll(/"(.)"/g)].map((m) => m[1] as Gua);

  const blk = /const YOUNIAN_SONG: Record<Gua, string\[\]> = \{([\s\S]*?)\n\}/.exec(SRC);
  if (!blk) throw new Error("YOUNIAN_SONG 没解析到");
  const SONG: Record<string, string[]> = {};
  for (const m of blk[1].matchAll(/(.): \[([^\]]+)\]/g))
    SONG[m[1]] = [...m[2].matchAll(/"(\S+?)"/g)].map((x) => x[1]);

  const out = {} as Record<Gua, Record<Gua, string>>;
  for (const base of ORDER) {
    const row = { [base]: "伏位" } as Record<Gua, string>;
    const start = ORDER.indexOf(base);
    SONG[base].forEach((star, i) => { row[ORDER[(start + 1 + i) % 8]] = star; });
    out[base] = row;
  }
  return out;
}

const M = buildMatrix();

describe("八宅 · 大游年歌诀", () => {
  it("反证：八行歌诀都解析到，每行八方齐全（解析失败会让下面全变空跑）", () => {
    expect(Object.keys(M).sort()).toEqual([...ALL].sort());
    for (const a of ALL) expect(Object.keys(M[a]).sort()).toEqual([...ALL].sort());
  });

  /** 只从乾一行反推映射 */
  const MAP = new Map<number, string>();
  for (const g of ALL) MAP.set(YAO["乾"] ^ YAO[g], M["乾"][g]);

  it("② 变爻集合 ↔ 八星 是双射（8 个子集对 8 颗星）", () => {
    expect(MAP.size).toBe(8);
    expect(new Set(MAP.values()).size).toBe(8);
    // 反推结果必须是这一组（钉住，防止歌诀被整体改写还"自洽"）
    const got = Object.fromEntries([...MAP].map(([k, v]) => [bits(k), v]));
    expect(got).toEqual({
      "000": "伏位", "100": "生气", "010": "绝命", "001": "祸害",
      "111": "延年", "011": "天医", "110": "五鬼", "101": "六煞",
    });
  });

  it("① 用乾一行的映射验全表 64 格（48 格是推出来的，不是抄来的）", () => {
    const bad: string[] = [];
    for (const a of ALL) for (const b of ALL) {
      const want = MAP.get(YAO[a] ^ YAO[b]);
      if (M[a][b] !== want) bad.push(`${a}宅${b}方=${M[a][b]} 应${want}（变爻${bits(YAO[a] ^ YAO[b])}）`);
    }
    expect(bad).toEqual([]);
  });

  it("③ 对称：star(A,B) === star(B,A)（XOR 天然对称）", () => {
    const bad: string[] = [];
    for (const a of ALL) for (const b of ALL)
      if (M[a][b] !== M[b][a]) bad.push(`${a}→${b}=${M[a][b]} 但 ${b}→${a}=${M[b][a]}`);
    expect(bad).toEqual([]);
  });

  it("④⑤ 伏位只在本宫；每卦八方八星互异", () => {
    for (const a of ALL) {
      expect(`${a}:${M[a][a]}`).toBe(`${a}:伏位`);
      expect(new Set(Object.values(M[a])).size).toBe(8);
      // 八星互异 + 本宫为伏位 已蕴含「他宫无伏位」，这里再显式列一遍便于定位
      const fuweiAt = ALL.filter((b) => M[a][b] === "伏位");
      expect(fuweiAt).toEqual([a]);
    }
  });

  it("反证：把映射改一项，①必须大面积报红（不是空跑）", () => {
    const FAKE = new Map(MAP);
    FAKE.set(0b100, "绝命");
    let n = 0;
    for (const a of ALL) for (const b of ALL) if (M[a][b] !== FAKE.get(YAO[a] ^ YAO[b])) n++;
    expect(n).toBeGreaterThanOrEqual(8);
  });
});

describe("八宅 · 东四西四是群论结论", () => {
  const MAP = new Map<number, string>();
  for (const g of ALL) MAP.set(YAO["乾"] ^ YAO[g], M["乾"][g]);
  const H = [...MAP].filter(([, v]) => JI.has(v)).map(([k]) => k).sort((a, b) => a - b);

  it("⑥ 四吉星的变爻集合构成 (Z/2)³ 的 4 元子群", () => {
    expect(H.map(bits)).toEqual(["000", "011", "100", "111"]);
    expect(H).toContain(0);                                  // 含单位元
    for (const x of H) for (const y of H) expect(H).toContain(x ^ y); // 对 XOR 封闭
  });

  it("⑥b 子群陪集 = GUA_INFO 的 east/west 分组", () => {
    const blk = /export const GUA_INFO[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC);
    expect(blk).not.toBeNull();
    const group: Record<string, string> = {};
    for (const m of blk![1].matchAll(/(.): \{[^}]*group: "(east|west)"/g)) group[m[1]] = m[2];
    expect(Object.keys(group).sort()).toEqual([...ALL].sort());

    for (const a of ALL) {
      const coset = H.map((h) => ALL.find((g) => YAO[g] === (YAO[a] ^ h))!).sort();
      const same = ALL.filter((g) => group[g] === group[a]).sort();
      expect(`${a}:${coset.join("")}`).toBe(`${a}:${same.join("")}`);
    }
    expect(ALL.filter((g) => group[g] === "east").sort()).toEqual([..."坎离震巽"].sort());
    expect(ALL.filter((g) => group[g] === "west").sort()).toEqual([..."乾坤艮兑"].sort());
  });

  it("⑥c 同组 ⟺ 互为四吉方（八宅「东四命住东四宅」的全部内容）", () => {
    const blk = /export const GUA_INFO[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC)!;
    const group: Record<string, string> = {};
    for (const m of blk[1].matchAll(/(.): \{[^}]*group: "(east|west)"/g)) group[m[1]] = m[2];
    const bad: string[] = [];
    for (const a of ALL) for (const b of ALL) {
      const sameGroup = group[a] === group[b];
      if (JI.has(M[a][b]) !== sameGroup) bad.push(`${a}宅${b}方=${M[a][b]} 同组=${sameGroup}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("八宅 · 九宫布局（后天洛书盘）", () => {
  const LUOSHU: Record<Gua, number> = { 坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兑: 7, 艮: 8, 离: 9 };

  const m = /export const GRID_LAYOUT: \(Gua \| null\)\[\] = \[([^\]]+)\]/.exec(SRC)!;
  const layout = m[1].split(",").map((x) => x.trim().replace(/"/g, ""));
  const grid = layout.map((g) => (g === "null" ? 5 : LUOSHU[g as Gua]));

  it("反证：九宫解析到 9 格，八卦各一 + 中位为空", () => {
    expect(layout).toHaveLength(9);
    expect(layout[4]).toBe("null");
    expect(layout.filter((x) => x !== "null").sort()).toEqual([...ALL].sort());
  });

  it("南上北下排成洛书 4 9 2 / 3 5 7 / 8 1 6", () => {
    expect(grid).toEqual([4, 9, 2, 3, 5, 7, 8, 1, 6]);
  });

  it("幻方：三行三列两对角线之和皆 15；对宫洛书数和皆 10", () => {
    for (const L of [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]])
      expect(`${L}:${L.reduce((a, i) => a + grid[i], 0)}`).toBe(`${L}:15`);
    for (let i = 0; i < 9; i++) if (i !== 4) expect(`${i}:${grid[i] + grid[8 - i]}`).toBe(`${i}:10`);
  });

  /**
   * ⚠️ 留痕：这里**不能**用「对宫为错卦（三爻全变）」判 —— 那是先天八卦盘的性质。
   * 后天盘上只有坎离一对恰是错卦，另外三对不是。误用会 6 处误报。
   */
  it("留痕：后天盘上只有坎离一对是错卦，另外三对不是（防止再次误用先天判据）", () => {
    const pairs: [Gua, Gua][] = [["巽", "乾"], ["离", "坎"], ["坤", "艮"], ["震", "兑"]];
    const cuo = pairs.filter(([a, b]) => (YAO[a] ^ YAO[b]) === 0b111).map(([a, b]) => a + b);
    expect(cuo).toEqual(["离坎"]);
  });
});
