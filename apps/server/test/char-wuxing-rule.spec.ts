import * as fs from "fs";
import * as path from "path";

/**
 * 字五行口径·全库规则闸门（2026-09-21 定案）
 *
 * ══ 背景：与旧版分歧 4/7，曾长期挂在待决清单上 ══
 *
 * 七个判别字里四个与旧版不同：
 *
 *   字 | 我们 | 旧版
 *   进 | 土   | 火
 *   张 | 木   | 火
 *   三 | 火   | 金
 *   华 | 木   | 水
 *
 * 字五行是**起名喜用神匹配的输入**，直接改推荐结果，所以必须定。
 *
 * ══ 定案：保持我们的口径 ══
 *
 * 反推出我们的规则是：
 *
 *   **部首有唯一五行（79 个部首）⇒ 取部首五行；否则 ⇒ 取数理五行（笔画尾数）**
 *   （即 `xingming-engine.ts` 文件头写的「部首五行为主、数理五行兜底」）
 *
 * 全库 20992 字验证：**100% 合规，零例外**（走部首 9964 字、走数理兜底 11028 字）。
 *
 * 那 79 个部首全都合部首义理：艹→木 氵→水 釒→金 火/忄/心→火 山/石/田/王/土→土
 * 木/竹/禾/米→木 魚→水 貝/刂/金→金 …… 而「混杂」的部首（糹、一、臼、寸、丿、又）
 * 恰恰是**没有明确五行归属**的，它们走数理兜底 —— 糹部 530 字 100% 等于数理，是铁证。
 *
 * 四个分歧字逐一合规：
 *   进[15,土,辶] 辶无定五行 → 数理 15→土 ✓
 *   张[11,木,弓] 弓无定五行 → 数理 11→木 ✓
 *   三[3,火,一]  一无定五行 → 数理 3→火  ✓
 *   华[14,木,艹] 艹→木（部首）           ✓
 *
 * **不跟旧版的理由**：旧版那四个值对不上部首、数理、音韵（声母五音）**任何一派**，
 * 推不出规则；且旧版自身有自相矛盾的记录（「阳」笔画在旧版里出现过 9 / 12 / 17 三个值）。
 * 跟一个推不出来的黑箱走，等于把可验证换成不可验证。
 *
 * ══ 本闸门守什么 ══
 *
 * 全库 20992 字逐字复算。谁改了字典、或混进了既非部首也非数理的"第三种值"，这里立刻红。
 */

const ROOT = path.resolve(__dirname, "../../..");
const DICT = JSON.parse(
  fs.readFileSync(path.join(ROOT, "apps/server/src/modules/paipan/engine/data/kangxi-strokes.json"), "utf8"),
) as Record<string, [number, string, string]>;

/** 数理五行：笔画尾数 1,2木 3,4火 5,6土 7,8金 9,0水 */
const SHULI = ["水", "木", "木", "火", "火", "土", "土", "金", "金", "水"];
const shuliWx = (n: number) => SHULI[n % 10];

/** 从全库反推「有唯一五行的部首」 */
function radicalsWithFixedWuxing(): Map<string, string> {
  const by = new Map<string, Set<string>>();
  for (const [, v] of Object.entries(DICT)) {
    const [, wx, rad] = v;
    if (!by.has(rad)) by.set(rad, new Set());
    by.get(rad)!.add(wx);
  }
  const out = new Map<string, string>();
  for (const [rad, set] of by) if (set.size === 1) out.set(rad, [...set][0]);
  return out;
}
const RAD_WX = radicalsWithFixedWuxing();

describe("字五行口径 · 全库规则", () => {
  it("反证：字典读到且规模正确（读空会让下面全变空跑）", () => {
    expect(Object.keys(DICT).length).toBe(20992);
    for (const v of Object.values(DICT).slice(0, 50)) {
      expect(v).toHaveLength(3);
      expect(typeof v[0]).toBe("number");
      expect(["金", "木", "水", "火", "土"]).toContain(v[1]);
    }
  });

  it("79 个部首有唯一五行，且合部首义理（抽查十个）", () => {
    expect(RAD_WX.size).toBe(79);
    const expected: [string, string][] = [
      ["艹", "木"], ["氵", "水"], ["釒", "金"], ["火", "火"], ["土", "土"],
      ["忄", "火"], ["山", "土"], ["木", "木"], ["魚", "水"], ["貝", "金"],
    ];
    for (const [rad, wx] of expected) expect(`${rad}→${RAD_WX.get(rad)}`).toBe(`${rad}→${wx}`);
  });

  it("「混杂」部首恰是无定五行者，走数理兜底 —— 糹部 530 字 100% 等于数理", () => {
    expect(RAD_WX.has("糹")).toBe(false);
    const si = Object.entries(DICT).filter(([, v]) => v[2] === "糹");
    expect(si).toHaveLength(530);
    const bad = si.filter(([, [n, wx]]) => wx !== shuliWx(n));
    expect(bad).toEqual([]);
  });

  it("★ 全库 20992 字逐字合规：部首有定五行取部首，否则取数理尾数", () => {
    const dirty: string[] = [];
    let viaRad = 0, viaShuli = 0;
    for (const [ch, [n, wx, rad]] of Object.entries(DICT)) {
      if (RAD_WX.has(rad)) {
        if (wx === RAD_WX.get(rad)) viaRad++;
        else dirty.push(`${ch}[${n},${wx},${rad}] 部首应${RAD_WX.get(rad)}`);
      } else if (wx === shuliWx(n)) viaShuli++;
      else dirty.push(`${ch}[${n},${wx},${rad}] 数理应${shuliWx(n)}（部首无定五行）`);
    }
    expect(dirty.slice(0, 20)).toEqual([]);
    expect(viaRad + viaShuli).toBe(20992);
    // 两条路径都要有实质占比，否则说明规则退化成单一来源
    expect(viaRad).toBeGreaterThan(5000);
    expect(viaShuli).toBeGreaterThan(5000);
  });

  it("四个与旧版分歧的字，逐一符合本口径（定案依据）", () => {
    const cases: [string, string, "部首" | "数理"][] = [
      ["进", "土", "数理"], ["张", "木", "数理"], ["三", "火", "数理"], ["华", "木", "部首"],
    ];
    for (const [ch, wx, via] of cases) {
      const [n, got, rad] = DICT[ch];
      expect(`${ch}:${got}`).toBe(`${ch}:${wx}`);
      if (via === "部首") expect(`${ch}经${RAD_WX.has(rad) ? "部首" : "数理"}`).toBe(`${ch}经部首`);
      else {
        expect(`${ch}经${RAD_WX.has(rad) ? "部首" : "数理"}`).toBe(`${ch}经数理`);
        expect(`${ch}:${shuliWx(n)}`).toBe(`${ch}:${wx}`);
      }
    }
  });

  /**
   * 反证：扰动数理表后走兜底的那 11028 字必须大面积报红。
   * ⚠️ 挪「一位」只能翻掉约一半 —— 因为数理表本身相邻成对
   * （水 木木 火火 土土 金金 水），错一位时有半数落回同一五行。
   * 挪「两位」才会几乎全翻。两个数都断言，顺带把这个特性钉住。
   */
  it("反证：扰动数理五行表，兜底字必须大面积报红", () => {
    const count = (shift: number) => {
      let bad = 0;
      for (const [, [n, wx, rad]] of Object.entries(DICT)) {
        if (!RAD_WX.has(rad) && wx !== SHULI[(n + shift) % 10]) bad++;
      }
      return bad;
    };
    const one = count(1), two = count(2);
    expect(one).toBeGreaterThan(4000);   // 实测 5513 ≈ 11028 的一半（相邻成对所致）
    expect(two).toBeGreaterThan(9000);   // 挪两位几乎全翻
    expect(two).toBeGreaterThan(one);
  });
});
