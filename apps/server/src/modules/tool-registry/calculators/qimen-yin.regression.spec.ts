import { calculateQimenYin, calculateQimenYang } from "./qimen.calculator";

/**
 * 阴盘奇门回归护栏（2026-09-19）。
 *
 * 两段历史，都记在这里免得再犯：
 *
 * ① 本目录原有一份独立的 `qimen-yin.calculator.ts`，按月支查一张自造表定局，
 *    **一个月只出一个盘**——而阴盘奇门是逐时辰换盘的。该实现已删除。
 *    它配的 spec 有 36 个用例全绿，却只验结构（toHaveProperty、数组长度、值在白名单内），
 *    抓不出任何算法错误。
 *
 * ② 删除后我一度把它接到阳盘引擎上（拆补法定局）——**这一步也是错的**。
 *    阴盘奇门按月亮走，自有定局法：（年支序数＋农历月＋农历日＋时支序数）÷9 取余。
 *    当初把「不用节气」当成毛病，是拿阳盘的标准去量阴盘。
 *    现已按通行讲法实现（`computeYinpanJu`，两个公开算例作基准）。
 *
 * 所以这组用例只断言值，且专盯上述病症。
 */
describe("阴盘奇门（按阴盘定局法）", () => {
  const at = (dt: string) => calculateQimenYin({ datetime: dt }) as any;

  it("复现公开算例一：2019-05-02 09:09 → 阳 4 局", () => {
    const r = at("2019-05-02T09:09:00");
    expect(`${r.dunType}${r.juNumber}`).toBe("yang4");
  });

  it("复现公开算例二：2006-05-23 19:45 → 阳 7 局", () => {
    const r = at("2006-05-23T19:45:00");
    expect(`${r.dunType}${r.juNumber}`).toBe("yang7");
  });

  it("逐时辰换局——旧实现一个月一个盘", () => {
    const jus = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map(
      (h) => at(`2024-06-15T${String(h).padStart(2, "0")}:00:00`).juNumber,
    );
    expect(new Set(jus).size).toBeGreaterThan(6);
  });

  it("同月不同日换局——旧实现同月同局", () => {
    const jus = [1, 5, 10, 15, 20, 25].map((d) => at(`2024-03-${String(d).padStart(2, "0")}T12:00:00`).juNumber);
    expect(new Set(jus).size).toBeGreaterThan(1);
  });

  it("遁型分阴阳，且以冬至夏至为界——旧实现恒判阴遁", () => {
    // 夏至（2024-06-21）当天转阴遁
    expect(at("2024-06-20T12:00:00").dunType).toBe("yang");
    expect(at("2024-06-21T12:00:00").dunType).toBe("yin");
    // 冬至（2024-12-21）当天转阳遁
    expect(at("2024-12-20T12:00:00").dunType).toBe("yin");
    expect(at("2024-12-21T12:00:00").dunType).toBe("yang");
  });

  it("与阳盘定局法不同：同一时刻两者的局多半不一致", () => {
    // 阳盘按节气拆补、阴盘按年月日时取数，本就是两套历法口径。
    // 若这里全都一致，说明阴盘又被接回阳盘的定局法了。
    let differ = 0;
    const dates = ["2024-02-10", "2024-04-05", "2024-06-15", "2024-08-20", "2024-10-01", "2024-12-15"];
    for (const ymd of dates) {
      const y = at(`${ymd}T10:00:00`);
      const g: any = calculateQimenYang({ datetime: `${ymd}T10:00:00` });
      if (`${y.dunType}${y.juNumber}` !== `${g.dunType}${g.juNumber}`) differ++;
    }
    expect(`${dates.length} 天里定局不同的有 ${differ} 天`).not.toBe(`${dates.length} 天里定局不同的有 0 天`);
  });

  it("局数始终落在 1-9，九宫齐全", () => {
    for (const ymd of ["2024-01-01", "2024-05-05", "2024-09-09", "2025-02-02"]) {
      const r = at(`${ymd}T08:00:00`);
      expect(r.juNumber).toBeGreaterThanOrEqual(1);
      expect(r.juNumber).toBeLessThanOrEqual(9);
      expect(r.gongs).toHaveLength(9);
    }
  });
});
