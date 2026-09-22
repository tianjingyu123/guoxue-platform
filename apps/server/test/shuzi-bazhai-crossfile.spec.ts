import * as fs from "fs";
import * as path from "path";

/**
 * 数字能量·八星磁场表 = 八宅游年表（★38，2026-09-21）
 *
 * ══ 关键发现：这张 65 格的表一格都不用抄 ══
 *
 * `apps/mobile/src/pkg-paipan2/lib/shuzi-data.ts` 的 `PAIR_DEFS` 是一张
 * 「两位数字 → 八星磁场」的手写表（65 组）。但它**就是八宅游年表按洛书数映射到数字**：
 *
 *     数字 → 后天卦：1坎 2坤 3震 4巽 6乾 7兑 8艮 9离（5 为中宫，无卦）
 *     两数得何星 = 两卦的**变爻集合**（逐爻异或）→ 星，与八宅完全同一套结构
 *
 * 例：13 → 坎(010) ⊕ 震(001) = 011 = 天医 ✓
 *
 * 实测与 `pkg-paipan3/lib/bazhai-data.ts` 的 `younianStars` **逐格一致（64 组）**，
 * 吉凶归属也一致（天医/生气/延年吉、伏位平、绝命/五鬼/六煞/祸害煞）。
 * 于是两份独立写的表互为参照，谁改错了都会红。
 *
 * ══ ★38：全零数字串把结果页打空 ══
 *
 * `lifeNumber()` 对全零串算出数字和 0，而 `LIFE_NUMBERS` 只有 1–9 与 11/22/33，
 * `LIFE_NUMBERS[0]` 是 **undefined**。而结果页 `pkg-paipan2/shuzi/*.vue` 直接写
 * `result.life.info.title`、`result.life.info.positives.join(' · ')`，**没有任何可选链**。
 *
 * 可达性：`extractDigits` 原先放行这些输入 ——
 *   · 自定义「000」  → ok:true
 *   · 车牌「京A00000」→ ok:true（**这是真实存在的车牌格式**）
 * 于是用户输入后结果页必然报错。
 *
 * 修法（两层都堵，不只依赖校验层）：
 *   1. `extractDigits` 增加「数字不能全为 0」；
 *   2. `lifeNumber` 自身对无 1–9 的串返回 null，防别的调用方绕过校验。
 *
 * 顺带说明为什么不是「给 LIFE_NUMBERS 补个 0 项」：全零串既算不出八星磁场
 * （0 无磁场、逐位跳过，命中为空），也没有对应的生命灵数，补一个 0 项等于编造内容。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SHUZI = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan2/lib/shuzi-data.ts"), "utf8",
);
const BAZHAI = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan3/lib/bazhai-data.ts"), "utf8",
);

type Gua = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";
const YAO: Record<Gua, number> = {
  乾: 0b111, 兑: 0b011, 离: 0b101, 震: 0b001,
  巽: 0b110, 坎: 0b010, 艮: 0b100, 坤: 0b000,
};
/** 洛书数 → 后天卦（5 为中宫，无卦） */
const NUM_GUA: Record<string, Gua> = {
  "1": "坎", "2": "坤", "3": "震", "4": "巽", "6": "乾", "7": "兑", "8": "艮", "9": "离",
};
const DIGITS = "123456789".split("");

/** shuzi 的两位数字 → 星 */
function parsePairs(): Record<string, string> {
  const blk = /const PAIR_DEFS: \[StarName, string\[\]\]\[\] = \[([\s\S]*?)\n\]/.exec(SHUZI);
  if (!blk) throw new Error("PAIR_DEFS 没解析到");
  const out: Record<string, string> = {};
  for (const m of blk[1].matchAll(/\["(\S+?)", \[([^\]]+)\]\]/g))
    for (const p of m[2].matchAll(/"(\d\d)"/g)) out[p[1]] = m[1];
  return out;
}
/** 八宅歌诀表 → star(卦A, 卦B) */
function parseBazhai(): Record<Gua, Record<Gua, string>> {
  const ord = /const YOUNIAN_ORDER: Gua\[\] = \[([^\]]+)\]/.exec(BAZHAI)!;
  const ORDER = [...ord[1].matchAll(/"(.)"/g)].map((m) => m[1] as Gua);
  const blk = /const YOUNIAN_SONG: Record<Gua, string\[\]> = \{([\s\S]*?)\n\}/.exec(BAZHAI)!;
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

const PAIR = parsePairs();
const BZ = parseBazhai();

describe("数字能量 · 八星磁场表就是八宅游年表", () => {
  it("反证：两边都解析到（shuzi 65 组、八宅 8 行）", () => {
    expect(Object.keys(PAIR)).toHaveLength(65);
    expect(Object.keys(BZ).sort()).toEqual((Object.keys(YAO) as Gua[]).sort());
  });

  it("① 与八宅 younianStars 逐格一致（64 组，跨文件互证）", () => {
    const bad: string[] = [];
    for (const a of DIGITS) for (const b of DIGITS) {
      if (a === "5" || b === "5") continue;
      const want = BZ[NUM_GUA[a]][NUM_GUA[b]];
      if (PAIR[a + b] !== want) bad.push(`${a}${b}(${NUM_GUA[a]}${NUM_GUA[b]})=${PAIR[a + b]} 应${want}`);
    }
    expect(bad).toEqual([]);
  });

  it("② 对称：PAIR[ab] === PAIR[ba]", () => {
    const bad = Object.keys(PAIR).filter((k) => PAIR[k] !== PAIR[k[1] + k[0]]);
    expect(bad).toEqual([]);
  });

  it("③ 81 组里恰覆盖 65 组，未覆盖的正是含 5 且非 55 的 16 组（中宫无卦）", () => {
    const all = DIGITS.flatMap((a) => DIGITS.map((b) => a + b));
    const miss = all.filter((k) => !PAIR[k]).sort();
    const want = all.filter((k) => (k[0] === "5" || k[1] === "5") && k !== "55").sort();
    expect(miss).toEqual(want);
    expect(miss).toHaveLength(16);
  });

  it("④ 每个非伏位星恰 8 组（4 无序对 × 2 序），伏位 9 组（八卦自配 + 55）", () => {
    const cnt: Record<string, number> = {};
    for (const k of Object.keys(PAIR)) cnt[PAIR[k]] = (cnt[PAIR[k]] ?? 0) + 1;
    expect(cnt).toEqual({ 天医: 8, 生气: 8, 延年: 8, 绝命: 8, 五鬼: 8, 六煞: 8, 祸害: 8, 伏位: 9 });
  });

  it("⑤ 吉凶归属与八宅一致（天医/生气/延年吉、伏位平、其余煞）", () => {
    const nat: Record<string, string> = {};
    for (const m of SHUZI.matchAll(/name: "(\S+?)", alias: "\S+?", nature: "(\S)"/g)) nat[m[1]] = m[2];
    expect(nat).toEqual({ 天医: "吉", 生气: "吉", 延年: "吉", 伏位: "平", 绝命: "煞", 五鬼: "煞", 六煞: "煞", 祸害: "煞" });
  });

  it("反证：把异或换成同或，64 组里相符的不得超过少数几组", () => {
    let same = 0;
    for (const a of DIGITS) for (const b of DIGITS) {
      if (a === "5" || b === "5") continue;
      const flipped = (Object.keys(YAO) as Gua[]).find(
        (g) => YAO[g] === (0b111 ^ (YAO[NUM_GUA[a]] ^ YAO[NUM_GUA[b]])),
      )!;
      if (PAIR[a + b] === BZ[NUM_GUA[a]][flipped]) same++;
    }
    expect(same).toBeLessThan(16); // 64 组里绝大多数必须变
  });
});

describe("数字能量 · ★38 全零串", () => {
  it("LIFE_NUMBERS 只有 1–9 与 11/22/33，没有 0（所以全零串必须被挡住）", () => {
    const i = SHUZI.indexOf("export const LIFE_NUMBERS");
    const j = SHUZI.indexOf("export function lifeNumber");
    const keys = [...SHUZI.slice(i, j).matchAll(/^\s{2}(\d+): \{/gm)].map((m) => Number(m[1]));
    expect(keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);
    expect(keys).not.toContain(0);
  });

  it("extractDigits 必须拒绝全零串（自定义「000」、车牌「京A00000」都曾被放行）", () => {
    expect(SHUZI).toMatch(/数字不能全为 0/);
    // 校验必须在 return { ok: true } 之前
    const guard = SHUZI.indexOf("数字不能全为 0");
    const okReturn = SHUZI.indexOf("return { ok: true, digits }");
    expect(guard).toBeLessThan(okReturn);
  });

  it("lifeNumber 自身也要挡（不能只依赖校验层，别的调用方会绕过）", () => {
    const fn = /export function lifeNumber[\s\S]*?\n\}/.exec(SHUZI)!;
    expect(fn[0]).toMatch(/if \(!\/\[1-9\]\/\.test\(digits\)\) return null/);
  });

  it("结果页仍然直接取 info 的字段（所以上面两道闸不能撤）", () => {
    // 数字能量是单页工具，输入与结果都在 index.vue（没有独立的 result.vue）
    const vue = fs.readFileSync(
      path.join(ROOT, "apps/mobile/src/pkg-paipan2/shuzi/index.vue"), "utf8",
    );
    // 页面没有可选链，一旦 info 为空必然报错 —— 这正是必须在引擎侧挡住的理由
    expect(vue).toMatch(/result\.life\.info\.title/);
    expect(vue).not.toMatch(/result\.life\.info\?\./);
  });
});
