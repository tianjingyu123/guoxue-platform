import * as fs from "fs";
import * as path from "path";
import { PaipanEngineService } from "../src/modules/paipan/engine/paipan-engine.service";

/**
 * 太乙神数·积日偏移与主客定三算（★41 / ★42 / ★26）
 *
 * ══ ★41：「+180 对时太乙零影响」漏了一个模数 ══
 *
 * ★23 为修日太乙局数把 `JIRI_OFFSET` 加了 180 天，注释逐条论证「对时太乙零影响」，列了：
 *
 *     180 mod 60 = 0（日柱）  2160 mod 360 = 0（局数）
 *     2160 mod 60 = 0（干支）  2160 mod 240 = 0（值使）
 *
 * **唯独漏了五福的 mod 225**（`WUFU_SEQ[floor((积时 mod 225) / 45)]`，5 位 × 45 时）。
 * 2160 mod 225 = 135 ≠ 0，于是时太乙五福被挪了 3 位 ——
 * 黄金基准写「五福在中宫(5)」，实测变成了 8 宫。
 *
 * 改为 **+900** 后全部五个模数都满足，且对日太乙与 +180 完全等效（900 − 180 = 720 = 2×360）：
 *
 *     900 mod 60 = 0      10800 mod 360 = 0    10800 mod 60 = 0
 *     10800 mod 240 = 0   **10800 mod 225 = 0**  900 mod 360 = 180
 *
 * 代价：积时**显示值**变为 7034580，与竞品时太乙页的 7023780 差 8640。
 * 这没法两全 —— 竞品自己那两个基准就矛盾（时太乙页反推 jiRi = 585315，日太乙页要求再 +180 天）。
 * 取舍：**盘面量（局数/五福/值使/干支）全对 优先于 中间数值显示一致**。
 *
 * ══ ★42（2026-09-21，已被 ★26 取代）══
 *
 * 当时修的是 `suanBetween`「两端不计」实现里的两处 bug（同宫绕满一圈、相邻被兜底成终点宫数）。
 * 但「两端不计」这条规则本身没有出处 —— ★26 查了典籍才发现规则就是错的，函数已整体删除。
 *
 * ══ ★26（2026-09-22）：三算整套按《太乙金镜式经》重做 ══
 *
 * 对照《太乙金镜式经》（四库本，维基文库，公有领域）144 局立成表与卷内算例，归纳出四处根因：
 *   1. 宫数是**太乙九宫**（一乾 二离 三艮 四震 五中 六兑 七坤 八坎 九巽），不是洛书；
 *   2. 起点在正宫计本宫数、在间辰计 1，再顺行逐正宫相加，至太乙宫前止（起点即太乙宫则只计本宫）；
 *   3. 阳遁计神方向原来反了；
 *   4. 定算自**定目**起算（盘式主支之合神移至主支，文昌随之同移所临），不是主算 + 客算。
 * 新规则下：立成主算 138/144、客算 139/144 吻合（余下为刻本差异，多处恰差 10）；
 * 竞品日太乙 4 例、黄金基准时太乙 1 例的主/客/定三算全部复现（修前 5 例全错）。
 * 「0 作 9 论」在新规则下不再触发（算值恒 ≥ 1），`jiangGong` 保留该分支作防御。
 *
 * 立成表抽取：artifacts/paipan-compare-20260919/taiyi-src/parse-licheng.py → fixtures/taiyi-jinjing-licheng.json
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/taiyi-engine.ts"), "utf8",
);


describe("太乙 · 积日偏移（★41）", () => {
  it("反证：偏移常量解析得到（读不到会让下面全变空跑）", () => {
    const m = /const JIRI_OFFSET = 585315 \+ (\d+) - localDays/.exec(SRC);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(900);
  });

  /**
   * 这是本条的核心：把引擎里**所有**对积时取模的地方列全，逐条验偏移量整除。
   * 上一版就是漏了其中一个（mod 225）才出的 ★41。
   */
  it("偏移量必须整除全部五个模数（mod 360/240/225/60，以及积日自身的 mod 60）", () => {
    const k = 900;            // 积日偏移（天）
    const shift = 12 * k;     // 积时偏移
    const checks: [string, number, number][] = [
      ["日柱（积日 mod 60）", k % 60, 0],
      ["时太乙局数（积时 mod 360）", shift % 360, 0],
      ["干支（积时 mod 60）", shift % 60, 0],
      ["值使（积时 mod 240）", shift % 240, 0],
      ["五福（积时 mod 225）", shift % 225, 0],   // ★41 漏的就是这条
    ];
    const bad = checks.filter(([, got, want]) => got !== want).map(([n, got]) => `${n}=${got}`);
    expect(bad).toEqual([]);
  });

  it("对日太乙与旧值 +180 等效（900 − 180 = 720 = 2×360）", () => {
    expect((900 - 180) % 360).toBe(0);
    expect(900 % 360).toBe(180 % 360);
  });

  it("反证：旧值 +180 在 mod 225 上不整除（正是 ★41 的病根）", () => {
    expect((12 * 180) % 225).toBe(135);
    expect((12 * 180) % 225).not.toBe(0);
  });

  it("引擎里对积时取模的地方就是那五处，没有新增（新增了就要回到上面那条逐条验）", () => {
    const mods = [...SRC.matchAll(/(?:jiShi|zhiShiJi|jiRi)\s*%\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(new Set(mods)).toEqual(new Set([360, 240, 225]));
    // 干支那两处走 jiaziName(n) 的 (n-1)%60
    expect(SRC).toMatch(/const i = \(\(n - 1\) % 60 \+ 60\) % 60/);
  });

  it("★41 注释必须写明漏掉的是 mod 225（防止后人再算一遍时又漏）", () => {
    expect(SRC).toMatch(/唯独漏了五福的 mod 225/);
    expect(SRC).toMatch(/10800 mod 225 = 0/);
  });
});

describe("太乙 · 主客定三算（★26，取代 ★42 的「两端不计」）", () => {
  const svc = new PaipanEngineService();
  type R = { dunType: string; juNumber: number; taiyiPalace: number; jiShen: string; zhuSuan: number; keSuan: number; dingSuan: number };
  const run = (b: Record<string, unknown>) => svc.run("taiyi", { minute: 0, ...b }) as unknown as R;
  const trio = (r: R) => `${r.zhuSuan}/${r.keSuan}/${r.dingSuan}`;
  const LICHENG = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/taiyi-jinjing-licheng.json"), "utf8"));

  /** 太乙九宫：槽位 → 宫数；独立于引擎再写一遍 */
  const SLOT16 = ["子", "丑", "艮", "寅", "卯", "辰", "巽", "巳", "午", "未", "坤", "申", "酉", "戌", "乾", "亥"];
  const NUM: Record<string, number> = { 子: 8, 丑: 3, 艮: 3, 寅: 3, 卯: 4, 辰: 9, 巽: 9, 巳: 9, 午: 2, 未: 7, 坤: 7, 申: 7, 酉: 6, 戌: 1, 乾: 1, 亥: 1 };
  const ZHENG = new Set(["子", "艮", "卯", "巽", "午", "坤", "酉", "乾"]);
  const GOD: Record<string, string> = { 子: "地主", 丑: "阳德", 艮: "和德", 寅: "吕申", 卯: "高丛", 辰: "太阳", 巽: "大炅", 巳: "大神", 午: "大威", 未: "天道", 坤: "大武", 申: "武德", 酉: "太簇", 戌: "阴主", 乾: "阴德", 亥: "大义" };
  const SLOT_OF: Record<string, string> = Object.fromEntries(Object.entries(GOD).map(([k, v]) => [v, k]));

  /** 金镜规则独立实现：正宫计本宫数 / 间辰计 1，顺行逐正宫相加至太乙宫前 */
  function suanJJ(from: string, taiyi: number): number {
    let i = SLOT16.indexOf(from);
    const next = () => { do i = (i + 1) % 16; while (!ZHENG.has(SLOT16[i])); };
    let total: number;
    if (ZHENG.has(from)) { total = NUM[from]; if (total === taiyi) return total; } else total = 1;
    next();
    while (NUM[SLOT16[i]] !== taiyi) { total += NUM[SLOT16[i]]; next(); }
    return total;
  }

  /** 修前规则：洛书宫数 + 两端不计（仅用于反证判据有区分力） */
  const LUOSHU_OF_SLOT: Record<string, number> = { 子: 1, 丑: 8, 艮: 8, 寅: 8, 卯: 3, 辰: 4, 巽: 4, 巳: 4, 午: 9, 未: 2, 坤: 2, 申: 2, 酉: 7, 戌: 6, 乾: 6, 亥: 6 };
  const RING_OLD = [1, 8, 3, 4, 9, 2, 7, 6];
  function oldBetween(from: number, to: number): number {
    const fi = RING_OLD.indexOf(from), ti = RING_OLD.indexOf(to);
    if (fi === ti) return 0;
    let sum = 0;
    for (let i = (fi + 1) % 8; i !== ti; i = (i + 1) % 8) sum += RING_OLD[i];
    return sum;
  }

  it("黄金基准时太乙 2026-07-03 21:45（值数法）：阴遁 36 局，三算 25/9/34", () => {
    const r = run({ year: 2026, month: 7, day: 3, hour: 21, minute: 45, panShi: "hour", suanFa: "zhijin" });
    expect(`${r.dunType}${r.juNumber} 宫${r.taiyiPalace} 计${r.jiShen} ${trio(r)}`).toBe("阴遁36 宫6 计酉 25/9/34");
  });

  it("竞品日太乙 4 例的主/客/定三算全部复现（★26 修前 4 例全错），三种算法一致", () => {
    const cases: [number, number, string][] = [
      [9, 20, "30/4/15"], [9, 23, "7/13/13"], [10, 28, "25/27/36"], [12, 4, "7/13/13"],
    ];
    for (const suanFa of ["tongzong", "zhijin", "jinjing"]) {
      const got = cases.map(([m, d]) => `${suanFa} ${m}-${d}:${trio(run({ year: 2026, month: m, day: d, hour: 12, panShi: "day", suanFa }))}`);
      expect(got).toEqual(cases.map(([m, d, w]) => `${suanFa} ${m}-${d}:${w}`));
    }
  });

  it("反证：定算不再恒等于主算 + 客算（修前恒满足，那正是错处）", () => {
    const r = run({ year: 2026, month: 9, day: 20, hour: 12, panShi: "day", suanFa: "tongzong" });
    expect(r.dingSuan).not.toBe(r.zhuSuan + r.keSuan);
  });

  /**
   * 立成表每局给出太乙宫、天目（主算起点）、主算、客目、客算、计神。
   * 扫一段时太乙逐盘对照：主算只依赖局，全对照；客算依赖计神，仅在计神与立成相同时对照。
   * 立成是刻本，个别数目有误，所以断言的是**不符的局恰为已知那几局**，而不是 100% —— 新增任何不符都会失败。
   */
  it("引擎对《太乙金镜式经》144 局立成表：覆盖全部 144 局，不符的局恰为已知刻本差异", () => {
    const zhuBad = new Set<string>(), keBad = new Set<string>(), seen = new Set<string>(), keSeen = new Set<string>();
    // 1 月（阳遁）与 7 月（阴遁）各 15 天 × 12 时辰；时太乙每时进一局，180 盘即绕满 72 局
    for (const [mon, d] of [0, 6].flatMap((m) => Array.from({ length: 15 }, (_, i) => [m, i] as const))) {
      for (let h = 0; h < 24; h += 2) {
        const dt = new Date(Date.UTC(2026, mon, 1 + d));
        const r = run({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(), hour: h, panShi: "hour", suanFa: "tongzong" });
        const yin = r.dunType === "阴遁";
        const t = (yin ? LICHENG.yin : LICHENG.yang)[r.juNumber - 1];
        const key = `${yin ? "yin" : "yang"}${r.juNumber}`;
        expect(`${key}:宫${r.taiyiPalace}`).toBe(`${key}:宫${t.taiyi}`);
        seen.add(key);
        if (r.zhuSuan !== t.zhu) zhuBad.add(key);
        if (r.jiShen === t.jishen) { keSeen.add(key); if (r.keSuan !== t.ke) keBad.add(key); }
      }
    }
    expect(seen.size).toBe(144);
    expect([...zhuBad].sort()).toEqual([...ZHU_KNOWN].sort());
    expect([...keBad].filter((k) => !KE_KNOWN.includes(k))).toEqual([]);
    expect(keSeen.size).toBeGreaterThan(40);
  });

  it("独立实现对立成表：主算 ≥ 138/144、客算 ≥ 139/144；修前规则仅 67/144（判据有区分力）", () => {
    let z = 0, k = 0, zOld = 0;
    for (const key of ["yang", "yin"]) {
      for (const r of LICHENG[key]) {
        const tm = SLOT_OF[r.tianmu], km = SLOT_OF[r.kemu];
        if (suanJJ(tm, r.taiyi) === r.zhu) z++;
        if (suanJJ(km, r.taiyi) === r.ke) k++;
        if (oldBetween(LUOSHU_OF_SLOT[tm], r.taiyi) === r.zhu) zOld++;
      }
    }
    expect(z).toBeGreaterThanOrEqual(138);
    expect(k).toBeGreaterThanOrEqual(139);
    expect(zOld).toBe(67);   // 修前规则只对 67/144（实测），与新规则 138 拉开 71 局
  });

  it("金镜规则的三种起点：间辰计 1、正宫计本宫数、起点即太乙宫只计本宫", () => {
    expect(suanJJ("申", 1)).toBe(1 + 6);                       // 阳一局天目武德(申)，立成主算 7
    expect(suanJJ("乾", 1)).toBe(1);                           // 起点即太乙宫
    expect(suanJJ("子", 1)).toBe(8 + 3 + 4 + 9 + 2 + 7 + 6);   // 正宫起，绕至乾前
    expect(LICHENG.yang[0]).toMatchObject({ ju: 1, taiyi: 1, tianmu: "武德", zhu: 7 });
  });

  it("「0 作 9 论」保留为防御分支；新规则下算值恒 ≥ 1（全枚举 16 槽 × 8 宫）", () => {
    const fn = /const jiangGong = \(suan: number\): number => \{([\s\S]*?)\n  \}/.exec(SRC)!;
    expect(fn[1]).toMatch(/if \(g === 0\)/);
    for (const s of SLOT16) for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) expect(suanJJ(s, p)).toBeGreaterThanOrEqual(1);
  });

  it("源码：宫环为太乙九宫、「两端不计」实现已删除、定算自定目起算", () => {
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toMatch(/const PALACE_RING = \[8, 3, 4, 9, 2, 7, 6, 1\]/);
    expect(code).not.toMatch(/suanBetween/);
    expect(code).toMatch(/const dingSuan = suanFrom\(dingmu\.slot\)/);
  });
});

/** 引擎与立成表不符的局（刻本差异，多处恰差 10；由上面的扫描实测得出，新增任何一局都会失败） */
const ZHU_KNOWN: string[] = ["yang39", "yang50", "yin25", "yin26", "yin27", "yin70"];
// 客算：yin43/44 为立成「客目」与我们的始击推法不同（起点就不同）；yin11/15/46 为数目差异。
// 两份清单合起来恰为 check-suan.py 独立实现对立成表得出的 11 局，与引擎扫描互证。
const KE_KNOWN: string[] = ["yin11", "yin15", "yin43", "yin44", "yin46"];
