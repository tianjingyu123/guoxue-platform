import * as fs from "fs";
import * as path from "path";

/**
 * 太乙神数·积日偏移与主客算（★41 / ★42，2026-09-21）
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
 * ══ ★42：`suanBetween` 两处让「两端不计」名存实亡 ══
 *
 *     return sum === 0 ? PALACE_RING[ti] : sum // 同宫或相邻兜底
 *
 *   a. **同宫时 `fi === ti`，`while (i !== ti)` 绕满一整圈**，得 40 − 该宫数（实测 32/34/36/38），
 *      根本走不到那条兜底 —— 注释说的「同宫…兜底」从来没发生过。占主算 11.7%、客算 14.1%。
 *   b. 兜底把**相邻**时合法的 0 换成终点宫数。而文件头明写
 *      「大将 = 算去十位取个位（**0 作 9 论**）」，`jiangGong(0)` 也确实返回 9 ——
 *      算值为 0 本就是预期内的合法情形，兜底一加那条规则就成了**永不执行的死代码**。
 *      占主算 14.2%、客算 15.9%。
 *
 * 合计约 26%(主) / 30%(客) 的盘受影响。已改为如实返回 0，交给 `jiangGong` 按「0 作 9 论」处理。
 * 修后全枚举 496 盘中算值为 0 出现 273 次，大将均得 9 —— 这条规则从死代码变回活的。
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/taiyi-full-verify.mts`：
 * 十六神槽位四维插位、四正宫 1 槽/四维宫 3 槽、对槽洛书数和为 10、
 * 方位环与八门跟飞宫跨文件一致、太乙阴序恰为阳序逆序、
 * 文昌 18 步去重成一整圈且重留于注释所说的维位、阴阳起点相距半圈、
 * 主客算独立复算、大将/参将公式、黄金基准 9 项逐项复现。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/taiyi-engine.ts"), "utf8",
);
const PALACE_RING = [1, 8, 3, 4, 9, 2, 7, 6];

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

describe("太乙 · 主客算（★42）", () => {
  /** 独立实现：两宫之间顺行诸宫洛书数之和，两端不计 */
  function between(from: number, to: number): number {
    const fi = PALACE_RING.indexOf(from), ti = PALACE_RING.indexOf(to);
    if (fi < 0 || ti < 0) return 0;
    if (fi === ti) return 0;
    let sum = 0;
    for (let i = (fi + 1) % 8; i !== ti; i = (i + 1) % 8) sum += PALACE_RING[i];
    return sum;
  }
  /** 修前的实现（用于证明判据真能抓到它） */
  function buggy(from: number, to: number): number {
    const fi = PALACE_RING.indexOf(from), ti = PALACE_RING.indexOf(to);
    let sum = 0;
    let i = (fi + 1) % 8;
    while (i !== ti) { sum += PALACE_RING[i]; i = (i + 1) % 8; }
    return sum === 0 ? PALACE_RING[ti] : sum;
  }

  it("同宫与相邻，其间无宫 ⇒ 和为 0", () => {
    for (const p of PALACE_RING) expect(`同宫${p}:${between(p, p)}`).toBe(`同宫${p}:0`);
    for (let i = 0; i < 8; i++) {
      const a = PALACE_RING[i], b = PALACE_RING[(i + 1) % 8];
      expect(`相邻${a}→${b}:${between(a, b)}`).toBe(`相邻${a}→${b}:0`);
    }
  });

  it("隔一宫时恰为中间那一宫的洛书数（两端不计的直接推论）", () => {
    for (let i = 0; i < 8; i++) {
      const a = PALACE_RING[i], mid = PALACE_RING[(i + 1) % 8], b = PALACE_RING[(i + 2) % 8];
      expect(`${a}→${b}:${between(a, b)}`).toBe(`${a}→${b}:${mid}`);
    }
  });

  it("绕满一圈的和恒为 40 − 起点（八宫洛书数之和 = 40）", () => {
    expect(PALACE_RING.reduce((a, b) => a + b, 0)).toBe(40);
    for (let i = 0; i < 8; i++) {
      const a = PALACE_RING[i], last = PALACE_RING[(i + 7) % 8];
      expect(`${a}→${last}:${between(a, last)}`).toBe(`${a}→${last}:${40 - a - last}`);
    }
  });

  it("★42 复现：修前实现在同宫时绕满一圈得 40−宫数，在相邻时被兜底成终点宫数", () => {
    for (const p of PALACE_RING) expect(`同宫${p}:${buggy(p, p)}`).toBe(`同宫${p}:${40 - p}`);
    for (let i = 0; i < 8; i++) {
      const a = PALACE_RING[i], b = PALACE_RING[(i + 1) % 8];
      expect(`相邻${a}→${b}:${buggy(a, b)}`).toBe(`相邻${a}→${b}:${b}`);
    }
  });

  it("「0 作 9 论」必须是活代码：jiangGong(0) = 9", () => {
    const fn = /const jiangGong = \(suan: number\): number => \{([\s\S]*?)\n  \}/.exec(SRC)!;
    expect(fn[1]).toMatch(/if \(g === 0\)/);
    // 按源码逻辑重算 jiangGong(0)
    const g0 = (() => { let g = 0 % 10; if (g === 0) g = 0 % 9 === 0 ? 9 : 0 % 9; return g; })();
    expect(g0).toBe(9);
  });

  it("实现必须保留同宫早返回、且不得再出现 sum===0 兜底（只查代码，注释里引用旧写法不算）", () => {
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toMatch(/if \(fi === ti\) return 0/);
    // 反证：注释里确实还留着旧写法，说明剥注释这步真的生效了
    expect(SRC).toMatch(/sum === 0 \? PALACE_RING\[ti\] : sum/);
    expect(code).not.toMatch(/sum === 0 \? PALACE_RING\[ti\] : sum/);
  });
});
