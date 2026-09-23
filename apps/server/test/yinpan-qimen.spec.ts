import { computeYinpanJu, zhiOrdinal } from "@guoxue/shared/paipan";

/**
 * 阴盘奇门定局的基准（2026-09-19）。
 *
 * 这两个算例是网上讲阴盘排盘时反复出现的标准例子，**不是我自己推的**——
 * 本项目已有教训：手工推导期望值坑过两次（玄空格局连错两回）。
 *
 * 例一 2019-05-02 09:09，农历三月廿八，四柱 己亥 戊辰 己亥 己巳
 *      年支亥=12、月3、日28、时支巳=6 → 49 ÷ 9 余 4 → 阳 4 局
 * 例二 2006-05-23 19:45，农历四月廿六，四柱 丙戌 癸巳 壬子 庚戌
 *      年支戌=11、月4、日26、时支戌=11 → 52 ÷ 9 余 7 → 阳 7 局
 *
 * 两例都落在冬至后夏至前，故均为阳遁——顺带说明「阴盘」是流派名，
 * 不是「一律阴遁」的意思，旧实现恒判阴遁正是错在这里。
 */
describe("阴盘奇门定局", () => {
  it("地支序数：子=1 …… 亥=12", () => {
    expect(zhiOrdinal("子")).toBe(1);
    expect(zhiOrdinal("巳")).toBe(6);
    expect(zhiOrdinal("戌")).toBe(11);
    expect(zhiOrdinal("亥")).toBe(12);
    expect(zhiOrdinal("")).toBe(0);
  });

  it("算例一：2019-05-02 09:09（农历三月廿八，己亥年己巳时）＝阳 4 局", () => {
    const r = computeYinpanJu({ yearZhi: "亥", lunarMonth: 3, lunarDay: 28, hourZhi: "巳", isYang: true });
    expect(r.parts.sum).toBe(49);
    expect(r.label).toBe("阳4局");
  });

  it("算例二：2006-05-23 19:45（农历四月廿六，丙戌年庚戌时）＝阳 7 局", () => {
    const r = computeYinpanJu({ yearZhi: "戌", lunarMonth: 4, lunarDay: 26, hourZhi: "戌", isYang: true });
    expect(r.parts.sum).toBe(52);
    expect(r.label).toBe("阳7局");
  });

  it("整除取九，不取零", () => {
    // 凑一个和为 18 的：亥12 + 月1 + 日4 + 子1 = 18
    const r = computeYinpanJu({ yearZhi: "亥", lunarMonth: 1, lunarDay: 4, hourZhi: "子", isYang: false });
    expect(r.parts.sum).toBe(18);
    expect(r.num).toBe(9);
    expect(r.label).toBe("阴9局");
  });

  it("局数覆盖 1-9，且随日、时变化（旧实现只随月支变，一个月一个盘）", () => {
    const seen = new Set<number>();
    for (let day = 1; day <= 30; day++)
      for (const hz of ["子", "卯", "午", "酉"])
        seen.add(computeYinpanJu({ yearZhi: "寅", lunarMonth: 6, lunarDay: day, hourZhi: hz, isYang: true }).num);
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // 同月同时辰、只差一天，局数必须不同（相邻日和差 1）
    const d10 = computeYinpanJu({ yearZhi: "寅", lunarMonth: 6, lunarDay: 10, hourZhi: "午", isYang: true });
    const d11 = computeYinpanJu({ yearZhi: "寅", lunarMonth: 6, lunarDay: 11, hourZhi: "午", isYang: true });
    expect(`10日与11日同局? ${d10.num === d11.num}`).toBe("10日与11日同局? false");
  });

  it("遁型由调用方按冬夏至传入，不是写死的（旧实现恒判阴遁）", () => {
    const args = { yearZhi: "子", lunarMonth: 1, lunarDay: 1, hourZhi: "子" };
    const y = computeYinpanJu({ ...args, isYang: true });
    const n = computeYinpanJu({ ...args, isYang: false });
    // 局数只取决于四项取数，与遁型无关；遁型只改前缀。
    // 局数不在这里手写死——手推期望值本项目已经坑过三次。
    expect(y.num).toBe(n.num);
    expect(y.label).toBe(`阳${y.num}局`);
    expect(n.label).toBe(`阴${n.num}局`);
  });
});
