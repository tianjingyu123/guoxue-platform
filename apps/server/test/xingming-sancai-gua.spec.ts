import * as fs from "fs";
import * as path from "path";

/**
 * 姓名分析·三才吉凶与姓名卦（2026-09-21）
 *
 * 五格本身已在 ★31 核过（外格前后端相反，已修，闸门 `wuge-invariants.spec.ts`）。
 * 这里守其余部分。
 *
 * ══ 一个方法上的坑，值得留痕 ══
 *
 * 文件头注释写「三才吉凶采用五行生克规则化判定（**生我/比和为吉，克我为凶**）」，
 * 我照这句写判据，125 组里红了一大片。查实现才发现它是**加权三态打分**：
 *
 *     比和 +2 / 生入 +2 / 泄（被生）+1 / 被克 0 / 克入 −2
 *     两项相加：≥3 吉、≥0 半吉、否则凶
 *
 * 注释描述得过简（没提「半吉」这一档），但实现本身没错 —— **是判据太粗，不是实现有病**。
 * 而反过来照抄实现的分值表当判据，又等于「拿实现当规格」，永远查不出错。
 *
 * 所以这里改用**独立于具体分值的结构性判据**：
 *   · 对称性：relation(a,b) 与 relation(b,a) 必须互逆（★29 那类风险）
 *   · 极值：天人地全比和必吉；天地皆克人必凶
 *   · 单调性：固定人格与地格，把天格换成「对人格关系更好」的五行，吉凶不得变差
 *   · 天地对称：交换天格与地格，吉凶不变（二者对人格是对等的两个来向）
 *
 * ══ 顺带清掉一个死项 ══
 *
 * `GOOD_GUA` 原先同时列了「谦」与「地山谦」。`hexName()` 恒返回全名，
 * 「谦」永远命不中 —— 是死项。同一卦的全名已在表内，删掉不改变任何结果，已清。
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/xingming-verify.mts`：
 * 姓名卦全枚举天格×地格 80×80 产出恰 64 个互异卦名且 GUA_CI 全查得到；
 * 81 数理表 1–81 齐全、>81 输入有定义；数理五行按尾数 1–200 全对；
 * 康熙字典 20992 字、148 个常用姓名字零缺失；端到端 30 组评分 67–99 且五格恒等式全成立。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/xingming-engine.ts"), "utf8",
);

type WX = "金" | "木" | "水" | "火" | "土";
const WXS: WX[] = ["金", "木", "水", "火", "土"];
const SHENG: Record<WX, WX> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<WX, WX> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const rel = (a: WX, b: WX) =>
  a === b ? "same" : SHENG[a] === b ? "sheng" : KE[a] === b ? "ke" : SHENG[b] === a ? "shengBy" : "keBy";

/** 按源码里的分值表重算三才吉凶（仅用于结构性判据的输入，不作为正确性依据） */
function parseScoreTable(): Record<string, number> {
  const fn = /function relScore[\s\S]*?\n\}/.exec(SRC)!;
  const out: Record<string, number> = {};
  for (const m of fn[0].matchAll(/case "(\w+)": return (?:into \? (-?\d+) : (-?\d+)|(-?\d+))/g)) {
    out[m[1]] = Number(m[2] ?? m[4]); // into=true 分支（天/地 → 人格）
  }
  return out;
}
const SCORE = parseScoreTable();
const luckOf = (t: WX, r: WX, d: WX) => {
  const s = SCORE[rel(t, r)] + SCORE[rel(d, r)];
  return s >= 3 ? "吉" : s >= 0 ? "半吉" : "凶";
};

describe("姓名分析 · 五行关系", () => {
  it("反证：分值表解析到五种关系（解析失败会让下面全变空跑）", () => {
    expect(Object.keys(SCORE).sort()).toEqual(["ke", "keBy", "same", "sheng", "shengBy"]);
  });

  it("relation 必须互逆：rel(a,b) 与 rel(b,a) 成对（★29 那类风险）", () => {
    const INV: Record<string, string> = { same: "same", sheng: "shengBy", shengBy: "sheng", ke: "keBy", keBy: "ke" };
    const bad: string[] = [];
    for (const a of WXS) for (const b of WXS) {
      if (rel(b, a) !== INV[rel(a, b)]) bad.push(`${a}→${b}=${rel(a, b)} 但 ${b}→${a}=${rel(b, a)}`);
    }
    expect(bad).toEqual([]);
  });

  it("生克两表互相钉死：我克 = 我生之所生（土克水 ⇐ 土生金、金生水）", () => {
    const src = /const SHENG: Record<WX, WX> = \{([^}]*)\}/.exec(SRC)!;
    const ke = /const KE: Record<WX, WX> = \{([^}]*)\}/.exec(SRC)!;
    const pick = (s: string) => {
      const o: Record<string, string> = {};
      for (const m of s.matchAll(/(.): "(.)"/g)) o[m[1]] = m[2];
      return o;
    };
    const S = pick(src[1]), K = pick(ke[1]);
    expect(Object.keys(S).sort()).toEqual([...WXS].sort());
    for (const w of WXS) expect(`${w}克${K[w]}`).toBe(`${w}克${S[S[w]]}`);
  });

  it("分值表单调：克入 < 被克 < 泄 < 生入 ≤ 比和", () => {
    expect(SCORE.ke).toBeLessThan(SCORE.keBy);
    expect(SCORE.keBy).toBeLessThan(SCORE.shengBy);
    expect(SCORE.shengBy).toBeLessThan(SCORE.sheng);
    expect(SCORE.sheng).toBeLessThanOrEqual(SCORE.same);
  });
});

describe("姓名分析 · 三才吉凶（结构性判据，不照抄实现分值）", () => {
  it("125 组三才只产出吉/半吉/凶三态，且三态都出现、不塌缩", () => {
    const cnt: Record<string, number> = {};
    for (const t of WXS) for (const r of WXS) for (const d of WXS) {
      const l = luckOf(t, r, d);
      expect(["吉", "半吉", "凶"]).toContain(l);
      cnt[l] = (cnt[l] ?? 0) + 1;
    }
    // ⚠️ 不能用 sort() 比中文数组 —— JS 按 UTF-16 码元排，顺序不是直觉顺序（本项目已栽过）
    expect(new Set(Object.keys(cnt))).toEqual(new Set(["吉", "半吉", "凶"]));
    for (const c of Object.values(cnt)) expect(c).toBeGreaterThan(10); // 任一档都不得只剩零星几个
  });

  it("极值：天人地全比和必吉；天地皆克人必凶", () => {
    for (const w of WXS) {
      expect(`全${w}:${luckOf(w, w, w)}`).toBe(`全${w}:吉`);
      const killers = WXS.filter((x) => KE[x] === w);
      for (const k of killers) expect(`${k}${w}${k}:${luckOf(k, w, k)}`).toBe(`${k}${w}${k}:凶`);
    }
  });

  it("单调性：天格换成对人格关系更好的五行，吉凶不得变差", () => {
    const RANK = ["ke", "keBy", "shengBy", "sheng", "same"];
    const LUCK = ["凶", "半吉", "吉"];
    const bad: string[] = [];
    let compared = 0;
    for (const r of WXS) for (const d of WXS) for (const a of WXS) for (const b of WXS) {
      if (RANK.indexOf(rel(a, r)) >= RANK.indexOf(rel(b, r))) continue;
      compared++;
      if (LUCK.indexOf(luckOf(a, r, d)) > LUCK.indexOf(luckOf(b, r, d)))
        bad.push(`天${a}(${rel(a, r)})=${luckOf(a, r, d)} 优于 天${b}(${rel(b, r)})=${luckOf(b, r, d)}（人${r}地${d}）`);
    }
    expect(compared).toBeGreaterThan(100); // 反证：确实比较了足够多对
    expect(bad).toEqual([]);
  });

  it("天地对称：交换天格与地格，吉凶不变", () => {
    const bad: string[] = [];
    for (const t of WXS) for (const r of WXS) for (const d of WXS) {
      if (luckOf(t, r, d) !== luckOf(d, r, t)) bad.push(`天${t}地${d} vs 天${d}地${t}（人${r}）`);
    }
    expect(bad).toEqual([]);
  });

  it("留痕：文件头注释「生我/比和为吉，克我为凶」描述过简，实为加权三态", () => {
    expect(SRC).toMatch(/生我\/比和为吉，克我为凶/);
    // 实现确实分三态且有 ≥3 / ≥0 两道阈值
    expect(SRC).toMatch(/score >= 3 \? "吉" : score >= 0 \? "半吉" : "凶"/);
  });
});

describe("姓名分析 · 姓名卦吉凶表", () => {
  const grab = (n: string) => {
    const m = new RegExp(`const ${n} = new Set\\(\\[([^\\]]+)\\]\\)`).exec(SRC)!;
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };

  it("表内每个卦名都是完整卦名（两字象 + 卦名，或「X为Y」），不得有简称死项", () => {
    for (const setName of ["GOOD_GUA", "BAD_GUA"]) {
      const list = grab(setName);
      // hexName 恒返回完整卦名，长度至少 3（如「地天泰」「巽为风」）
      const tooShort = list.filter((n) => [...n].length < 3);
      expect(`${setName}:${tooShort.join("、")}`).toBe(`${setName}:`);
    }
  });

  it("「谦」这个死项已清除（「地山谦」保留）", () => {
    const good = grab("GOOD_GUA");
    expect(good).not.toContain("谦");
    expect(good).toContain("地山谦");
  });

  it("吉卦与凶卦两表不得有交集", () => {
    const g = new Set(grab("GOOD_GUA"));
    const b = grab("BAD_GUA").filter((x) => g.has(x));
    expect(b).toEqual([]);
  });
});
