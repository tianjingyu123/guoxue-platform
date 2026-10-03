import { calculateBaZhaiGongWei } from "./bazhai-gongwei.calculator";
import { youXingMap } from "./bazhai.calculator";

/**
 * 八宅宫位（2026-09-19）。
 *
 * 修之前这里的游星走的是一个自造算法，注释写着「简化大游年法」：
 *   YOU_NIAN_ORDER[(命卦index - 宫位index + 8) % 8]
 * 即把每个命卦的游星分布当成同一个图案转一下。真正的大游年由变爻推出，
 * 八卦图案各不相同，不是旋转关系。
 *
 * 当时八个命卦里**六个违反八宅铁律**（东四命的四吉方必全在东四方）；
 * 剩下坎、乾两个吉凶分区碰巧对了，但生气/天医/延年互相串位——
 * 而门主灶择位恰恰要分这三者，所以八个全是错的。
 *
 * 现已改用与主计算器同一份 `youXingMap`（翻卦变爻法）。
 */
describe("八宅宫位：游年星", () => {
  const DONG_SI = ["坎", "震", "巽", "离"];
  const JI = ["伏位", "生气", "天医", "延年"];
  const ALL = ["坎", "坤", "震", "巽", "乾", "兑", "艮", "离"];

  it("与主计算器同源：逐卦逐宫一致，不再各算各的", () => {
    for (const ming of ALL) {
      const res: any = calculateBaZhaiGongWei({ mingGua: ming });
      const want = youXingMap(ming);
      for (const g of res.gongWeiList) {
        const dir = String(g.gongWei).replace("宫", "");
        expect(`${ming}命·${dir}宫=${g.youNian}`).toBe(`${ming}命·${dir}宫=${want[dir]}`);
      }
    }
  });

  it("八宅铁律：东四命四吉方全在东四方，西四命全在西四方", () => {
    for (const ming of ALL) {
      const res: any = calculateBaZhaiGongWei({ mingGua: ming });
      const good = res.gongWeiList
        .filter((g: any) => JI.includes(g.youNian))
        .map((g: any) => String(g.gongWei).replace("宫", ""));
      expect(good).toHaveLength(4);
      const stray = good.filter((d: string) => DONG_SI.includes(d) !== DONG_SI.includes(ming));
      expect(`${ming}命越组的吉方: ${stray.join("") || "无"}`).toBe(`${ming}命越组的吉方: 无`);
    }
  });

  it("命卦与主计算器共用一份实现（1990 男＝坎、女＝艮，第三方 App 基准）", () => {
    // 注意：返回字段带「命」字后缀，是本计算器的既有约定，不是笔误
    expect((calculateBaZhaiGongWei({ birthYear: 1990, gender: "男" }) as any).mingGua).toBe("坎命");
    expect((calculateBaZhaiGongWei({ birthYear: 1990, gender: "女" }) as any).mingGua).toBe("艮命");
  });
});
