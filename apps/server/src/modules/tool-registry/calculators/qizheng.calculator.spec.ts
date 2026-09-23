import { calculateQiZheng } from "./qizheng.calculator";
import { REMOVED_WRONG } from "../verification-gate";

/**
 * 七政四余回归（2026-09-19，接续文档 §2.101）
 *
 * ══ 同一领域两份实现，一份真算一份编造 ══
 *
 * `qizheng` 用 `sweph`（瑞士星历表）真算；
 * 已删除的 `qizheng-siyu` 把行星黄经写作
 * `太阳黄经 + (距 J2000 天数 × 常数 + 常数) % 360`——**相对太阳匀速偏移**。
 *
 * ══ 判据：内行星距日角距，几何必然，不需星历表 ══
 *
 * 水星、金星是内行星，从地球看永远在太阳附近。这不是流派问题，是轨道几何。
 *
 * **最大距角随轨道位置变化**：水星 17.9°–27.8°、金星 45.4°–47.8°。
 * 首版我把金星上限写成 47°，实测 2025-01 得 47.1° 挂掉——
 * **是我的阈值紧了 0.1°，不是星历错**。改按真实上限 28° / 48°。
 * （这也说明本判据确实贴着物理边界，不是宽松到恒真。）
 *
 * 同一判据、同一批 56 个样本（2020–2026 逐季）：
 *
 * | 实现 | 违反 |
 * |---|---|
 * | `qizheng`（sweph） | **0/56** |
 * | `qizheng-siyu`（常数偏移） | **44/56**，金星出现距日 123° |
 *
 * 这条判据还是**原点无关**的——两星角距不随二十八宿起点的假设改变
 * （两者走同一换算），故不必先确定宿度口径即可定案。
 */

const sep = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
/**
 * ⚠️ 入参是 `datetime`（ISO 字符串），**不是** year/month/day。
 *
 * 我第一版测试传的是 `{year, month, day, hour}`，全被忽略，
 * 函数回落到 `new Date().toISOString()`——**56 个样本其实是同一个盘**，
 * 于是「内行星角距 0/56 违反」是**假绿**。
 *
 * 抓到这个错的正是下面那条「一年扫过全周天」的断言——
 * 它本是为反向确认判别力而写（怕角距约束恒真），结果先抓出了我自己的调用错误。
 * **写判别力反证，第一个防的往往是自己。**
 */
const run = (year: number, month: number) =>
  calculateQiZheng({ datetime: `${year}-${String(month).padStart(2, "0")}-15T12:00:00Z`, gender: "男" }) as any;
const starsOf = (r: any) => (r.starPositions ?? []) as any[];

/** 2020–2026 逐季共 28 个时点 */
const SAMPLES: [number, number][] = [];
for (let y = 2020; y <= 2026; y++) for (const m of [1, 4, 7, 10]) SAMPLES.push([y, m]);

describe("七政：内行星距日角距（轨道几何，非流派）", () => {
  it("水星距日恒 ≤28°、金星 ≤48°（28 个时点共 56 项）", () => {
    const bad: string[] = [];
    for (const [y, m] of SAMPLES) {
      const ss = starsOf(run(y, m));
      const sun = ss.find((s) => s.star === "太阳")!;
      for (const [nm, lim] of [["水星", 28], ["金星", 48]] as const) {
        const p = ss.find((s) => s.star === nm);
        if (!p) continue;
        const d = sep(p.eclipticDeg, sun.eclipticDeg);
        if (d > lim) bad.push(`${y}-${m} ${nm}=${d.toFixed(1)}°`);
      }
    }
    expect(`违反=${bad.slice(0, 5).join(" ")}`).toBe("违反=");
  });

  it("外行星不受此限（说明约束确实只约束内行星，不是恒真断言）", () => {
    // 土星、火星可以远离太阳——若这条也恒成立，说明上一条没有判别力
    const far = SAMPLES.some(([y, m]) => {
      const ss = starsOf(run(y, m));
      const sun = ss.find((s) => s.star === "太阳")!;
      const sat = ss.find((s) => s.star === "土星");
      return sat && sep(sat.eclipticDeg, sun.eclipticDeg) > 90;
    });
    expect(`存在土星距日>90°的时点=${far}`).toBe("存在土星距日>90°的时点=true");
  });
});

describe("七政：真星历的特征（编造实现产生不了的）", () => {
  it("存在逆行时点——匀速偏移模型永远不会逆行", () => {
    const anyRetro = SAMPLES.some(([y, m]) =>
      starsOf(run(y, m)).some((s) => s.direction === "逆"),
    );
    expect(`出现逆行=${anyRetro}`).toBe("出现逆行=true");
  });

  it("太阳恒顺行（太阳视运动无逆行）", () => {
    for (const [y, m] of SAMPLES) {
      const sun = starsOf(run(y, m)).find((s) => s.star === "太阳")!;
      expect(`${y}-${m} 太阳=${sun.direction}`).toBe(`${y}-${m} 太阳=顺`);
    }
  });

  it("黄经恒在 [0,360) 且宿度落在合法范围", () => {
    for (const [y, m] of SAMPLES.slice(0, 8)) {
      for (const s of starsOf(run(y, m))) {
        expect(s.eclipticDeg).toBeGreaterThanOrEqual(0);
        expect(s.eclipticDeg).toBeLessThan(360);
        expect(s.xiuDu).toBeGreaterThan(0);
      }
    }
  });

  it("太阳黄经随月份推移，一年扫过全周天", () => {
    const degs = [1, 4, 7, 10].map((m) => starsOf(run(2026, m)).find((s) => s.star === "太阳")!.eclipticDeg);
    // 四个季度点应分布在不同象限，不得聚在一处
    expect(`不同值数=${new Set(degs.map((d) => Math.floor(d / 90))).size}`).toBe("不同值数=4");
  });
});

describe("七政四余：编造实现已下架", () => {
  it("qizheng-siyu 在下架名单内，理由指明内行星角距", () => {
    expect(REMOVED_WRONG["qizheng-siyu"]).toBeDefined();
    expect(REMOVED_WRONG["qizheng-siyu"]).toContain("内行星距日角距");
  });
});
