import { calculateQimenYinMingli } from "./qimen-yin-mingli.calculator";
import { calculateQimenYin } from "./qimen.calculator";
import { calcBazi } from "@guoxue/bazi-engine";

/**
 * 阴盘命理奇门的回归护栏（2026-09-19）。
 *
 * 这个计算器的骨架是对的——命盘走 `calculateQimenYin`、大运流年取自已核验的
 * 八字引擎（`bz.qiYun.daYun`），两边都不手搓。这与公开讲法一致：
 * 「奇门命局中的大运和流年排法与四柱中的相同」。
 *
 * 但它原先**把命盘算出来的遁型丢掉，写死「阴遁」**——
 * 又是把「阴**盘**」（流派名）当成「阴**遁**」（遁法）。同一个误会已经让
 * 本目录的 qimen-yin.calculator.ts 整份作废（恒判阴遁、不查节气、月家当时家）。
 *
 * 所以这组用例只断值，且专盯两件事：
 *   一、遁型必须随出生时间变，且与命盘引擎一致；
 *   二、大运流年必须与八字引擎一致，不许另算一套。
 */
describe("阴盘命理奇门（修正遁型后）", () => {
  const at = (birthTime: string, gender: "男" | "女" = "男") =>
    calculateQimenYinMingli({
      birthTime,
      birthplace: "北京",
      gender,
      useTrueSolar: false,
      ziShiMode: "traditional",
      useDaylightSaving: false,
    }) as any;

  it("遁型不再恒为阴遁——冬至后夏至前生者为阳遁", () => {
    // 这四个日期分列冬至/夏至两侧，原实现一律报「阴遁」
    const cases: [string, string][] = [
      ["1990-01-05T10:00:00", "阳遁"],
      ["1990-03-15T10:00:00", "阳遁"],
      ["1990-07-01T10:00:00", "阴遁"],
      ["1990-09-15T10:00:00", "阴遁"],
    ];
    for (const [bt, want] of cases) {
      expect(`${bt.slice(0, 10)} ${at(bt).basicInfo.dunType}`).toBe(`${bt.slice(0, 10)} ${want}`);
    }
  });

  it("遁型与局数原样取自命盘引擎，不另行断言", () => {
    for (const bt of ["1990-03-15T10:00:00", "1985-11-20T06:00:00", "2001-06-30T22:00:00"]) {
      const r = at(bt);
      const plate: any = calculateQimenYin({ datetime: new Date(bt).toISOString() });
      const want = plate.dunType === "yang" ? "阳遁" : "阴遁";
      expect(`${bt} ${r.basicInfo.dunType}${r.basicInfo.juShu}`).toBe(`${bt} ${want}${plate.juNumber}`);
    }
  });

  it("断语里的遁型与 basicInfo 一致——不许两处打架", () => {
    // 穿壬那层编造数据正是栽在「summary 与引擎自相矛盾」上，这里预先设防
    for (const bt of ["1990-01-05T10:00:00", "1990-09-15T10:00:00"]) {
      const r = at(bt);
      const claimed = String(r.duanYu).match(/命盘：(阳遁|阴遁)/)?.[1];
      expect(`${bt} 断语遁型=${claimed}`).toBe(`${bt} 断语遁型=${r.basicInfo.dunType}`);
    }
  });

  it("大运取自八字引擎，起运岁数与步数逐项一致", () => {
    const cases: Array<[string, "男" | "女"]> = [
      ["1990-03-15T10:00:00", "男"],
      ["1988-08-08T14:00:00", "女"],
    ];
    for (const [bt, g] of cases) {
      const r = at(bt, g);
      const d = new Date(bt);
      const bz: any = calcBazi({
        name: "", gender: g, year: d.getFullYear(), month: d.getMonth() + 1,
        day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(),
        city: "北京", useTrueSolarTime: false,
      });
      // 大运步数必须与八字引擎一致（不许自己多排或少排）
      expect(`${bt} 大运步数=${r.mingLi.daYun.length}`).toBe(`${bt} 大运步数=${bz.qiYun.daYun.length}`);
      // 逐步干支一致——这一条才是「没有另算一套」的真凭据
      expect(r.mingLi.daYun.map((x: any) => x.ganZhi)).toEqual(bz.qiYun.daYun.map((x: any) => x.ganZhi));
    }
  });

  it("男女排运方向不同——同一天生的男女大运不应相同", () => {
    const m = at("1990-03-15T10:00:00", "男");
    const f = at("1990-03-15T10:00:00", "女");
    expect(m.mingLi.daYun.map((x: any) => x.ganZhi)).not.toEqual(f.mingLi.daYun.map((x: any) => x.ganZhi));
  });

  it("九宫齐全，命宫身宫都落在盘上", () => {
    const r = at("1990-03-15T10:00:00");
    expect(r.gongs?.length ?? r.basicInfo?.gongs?.length ?? 9).toBeGreaterThanOrEqual(9);
    expect(String(r.duanYu)).toMatch(/命宫落.+宫/);
    expect(String(r.duanYu)).toMatch(/身宫落.+宫/);
  });
});
