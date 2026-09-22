import * as fs from "fs";
import * as path from "path";

/**
 * 金钱课·六十四卦签辞覆盖与真伪（2026-09-21）
 *
 * ══ 为什么重点查覆盖与雷同 ══
 *
 * 这类「一卦一签辞」的大表，本项目已经栽过两次：
 *   · ★30 诸葛神数 384 签里 **346 条是由下标算术拼接生成的**
 *   · 六爻卦辞 `liuyao-guaci` **只收录了 16/64 卦**，其余走兜底套话
 *
 * 所以 `apps/mobile/src/pkg-paipan3/lib/jinqianke-data.ts`（1102 行）先查两件事：
 * **覆盖是否完整**、**内容是否雷同**（雷同 = 拼接生成的气味）。
 *
 * ══ 实测结论：这份是真数据 ══
 *
 *   QIAN_DB 64 条，六十四卦缺 0、多余 0
 *   题辞重复 0 组、签诗整体重复 0 组
 *   吉凶分布 上上7 / 上吉21 / 中平19 / 中下10 / 下下7 —— 五档都用上，未塌缩
 *   转发出来的 GUACI 64/64 齐全；京房八宫 getPalace 每宫恰 8 卦
 *
 * 与 ★30 形成对比 —— 同类结构，这一份经得起查。
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/jinqianke-verify.mts`：
 * `castToHexName` 全枚举 64 种投掷得 64 个互异卦名且与 HEX_NAMES 一致；
 * `findGua` 的 `return "乾"` 兜底经确认**不可达**（BAGUA_LINES 覆盖全部 8 种三元组）；
 * 卦名与上下卦之象自洽（纯卦含「为」，其余头两字即上下卦之象）。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan3/lib/jinqianke-data.ts"), "utf8",
);

/** 逐条解析 QIAN_DB：键名 + level + 题辞 + 四句签诗 */
function parseDb(): { name: string; title: string; level: number; poem: string[] }[] {
  const at = SRC.indexOf("export const QIAN_DB");
  const end = SRC.indexOf("export function getQianEntry");
  const blk = SRC.slice(at, end);
  const out: { name: string; title: string; level: number; poem: string[] }[] = [];
  // 形如：  水火既济: {\n    title: "…", level: 4,\n    poem: ["…","…","…","…"],
  const re = /^ {2}(\S+?): \{\s*\n\s*title: "([^"]+)",\s*level: (\d),\s*\n\s*poem: \[([^\]]+)\]/gm;
  for (const m of blk.matchAll(re)) {
    out.push({
      name: m[1], title: m[2], level: Number(m[3]),
      poem: [...m[4].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
    });
  }
  return out;
}
const DB = parseDb();

/** 八卦先天数与之象（用于独立生成六十四卦名的期望头两字） */
const BAGUA_NUM: Record<string, number> = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 };
const XIANG: Record<string, string> = { 乾: "天", 兑: "泽", 离: "火", 震: "雷", 巽: "风", 坎: "水", 艮: "山", 坤: "地" };

describe("金钱课 · 签辞覆盖", () => {
  it("反证：QIAN_DB 解析到 64 条（解析失败会让下面全变空跑）", () => {
    expect(DB).toHaveLength(64);
    expect(new Set(DB.map((x) => x.name)).size).toBe(64);
  });

  it("① 六十四卦一卦不缺 —— 卦名由上下卦之象独立生成后逐卦对", () => {
    const names = new Set(DB.map((x) => x.name));
    const missing: string[] = [];
    for (const up of Object.keys(BAGUA_NUM)) for (const lo of Object.keys(BAGUA_NUM)) {
      // 纯卦名是「卦名 + 为 + 象」（乾为天、坤为地…），卦名在前象在后；
      // 其余头两字为「上象 + 下象」（水雷屯 = 坎上震下）
      const hit = up === lo
        ? names.has(`${up}为${XIANG[up]}`)
        : [...names].some((n) => n.startsWith(XIANG[up] + XIANG[lo]));
      if (!hit) missing.push(`${up}上${lo}下`);
    }
    expect(missing).toEqual([]);
  });

  it("② 题辞不得雷同（★30 诸葛 346/384 条拼接生成，正是从雷同看出来的）", () => {
    const seen = new Map<string, string[]>();
    for (const x of DB) seen.set(x.title, [...(seen.get(x.title) ?? []), x.name]);
    const dup = [...seen].filter(([, v]) => v.length > 1).map(([t, v]) => `${t}: ${v.join("、")}`);
    expect(dup).toEqual([]);
  });

  it("③ 签诗整体不得雷同，且每卦恰四句、句句非空", () => {
    const dupPoem = new Map<string, string[]>();
    const badShape: string[] = [];
    for (const x of DB) {
      if (x.poem.length !== 4) badShape.push(`${x.name} ${x.poem.length}句`);
      if (x.poem.some((l) => !l.trim())) badShape.push(`${x.name} 有空句`);
      const k = x.poem.join("|");
      dupPoem.set(k, [...(dupPoem.get(k) ?? []), x.name]);
    }
    expect(badShape).toEqual([]);
    expect([...dupPoem].filter(([, v]) => v.length > 1).map(([, v]) => v.join("、"))).toEqual([]);
  });

  it("④ 吉凶五档都用上且不塌缩（实测 上上7/上吉21/中平19/中下10/下下7）", () => {
    const cnt: Record<number, number> = {};
    for (const x of DB) cnt[x.level] = (cnt[x.level] ?? 0) + 1;
    expect(Object.keys(cnt).map(Number).sort()).toEqual([1, 2, 3, 4, 5]);
    // 任何一档都不该占到一半以上（占了就说明是套模板）
    for (const [lv, c] of Object.entries(cnt)) expect(`${lv}:${c < 32}`).toBe(`${lv}:true`);
  });

  it("⑤ castToHexName 的兜底必须不可达：BAGUA_LINES 覆盖全部 8 种三元组", () => {
    // 源码里确有 `return "乾"` 兜底；它只在 BAGUA_LINES 缺项时才会被触发
    expect(SRC).toMatch(/return "乾"/);
    const meihua = fs.readFileSync(
      path.join(ROOT, "packages/shared/src/paipan/meihua-data.ts"), "utf8",
    );
    const blk = /BAGUA_LINES[^=]*=\s*\{([\s\S]*?)\n\}/.exec(meihua);
    expect(blk).not.toBeNull();
    const combos = new Set<string>();
    for (const m of blk![1].matchAll(/(\S+?): \[(true|false), (true|false), (true|false)\]/g)) {
      combos.add([m[2], m[3], m[4]].join(","));
    }
    expect(combos.size).toBe(8); // 2³ 全覆盖 ⇒ findGua 永远找得到，兜底不可达
  });

  it("⑥ 分类论断六项齐全（事业/求财/婚恋/健康/出行/决策）", () => {
    const meta = /export const CAT_META[\s\S]*?\n\]/.exec(SRC)![0];
    const keys = [...meta.matchAll(/key: "(\w+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["career", "wealth", "love", "health", "travel", "decision"]);
    // 每卦的 cat 都要有这六项
    const missing: string[] = [];
    for (const x of DB) {
      const at = SRC.indexOf(`  ${x.name}: {`);
      const seg = SRC.slice(at, at + 2000);
      for (const k of keys) if (!new RegExp(`${k}: "[^"]+"`).test(seg)) missing.push(`${x.name}.${k}`);
    }
    expect(missing).toEqual([]);
  });
});
