import { calculateBaZhai, youXingMap } from "./bazhai.calculator";

/**
 * 八宅命卦与宅命匹配的基准用例（2026-09-18）。
 *
 * 基准来自第三方 H5「热卜四柱排盘」实测（市场检验版），八宅页排：
 * - 1990 年**男**命、坐北朝南 → 命卦 **坎（东四命）**、宅卦坎（东四宅）
 * - 1990 年**女**命、坐北朝南 → 命卦 **艮（西四命）**
 *
 * 修前这里有三个错（见接续文档 §2.64、§2.65）：
 * 1. 命卦取「后两位数字和再 11 减」，1990 男算成坤（西四）——东四/西四判反，
 *    整份八宅报告的吉凶方位会全部颠倒；
 * 2. 宅命匹配比的是「东四命」==="东四宅"，**永远为 false**，
 *    连它自己输出的「东四命不配东四宅」都自相矛盾；
 * 3. 性别只认中文「男」，传 "male" 静默走女命公式。
 *
 * 这组用例把基准钉死，避免再退化。
 */
describe("八宅：命卦与宅命匹配（对第三方基准）", () => {
  it("1990 男命＝坎（东四命）——基准值，不是推算出来的", () => {
    const r: any = calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "坎" });
    expect(r.mingGua.guaName).toBe("坎");
    expect(r.mingGua.group).toBe("东四命");
  });

  it("1990 女命＝艮（西四命）——基准值", () => {
    const r: any = calculateBaZhai({ birthYear: 1990, gender: "女", zuoShan: "坎" });
    expect(r.mingGua.guaName).toBe("艮");
    expect(r.mingGua.group).toBe("西四命");
  });

  it("性别兼容 male/female：与中文写法结果相同", () => {
    const m: any = calculateBaZhai({ birthYear: 1990, gender: "male", zuoShan: "坎" });
    const f: any = calculateBaZhai({ birthYear: 1990, gender: "female", zuoShan: "坎" });
    expect(m.mingGua.guaName).toBe("坎");
    expect(f.mingGua.guaName).toBe("艮");
  });

  it("宅命匹配不再恒 false：同组相配、异组不配", () => {
    // 坎命（东四）+ 坎宅（东四）→ 相配
    const a: any = calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "坎" });
    expect(a.zhaiMingMatch.isMatch).toBe(true);
    expect(a.zhaiMingMatch.desc).toContain("相配");

    // 坎命（东四）+ 坤宅（西四）→ 不配
    const b: any = calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "坤" });
    expect(b.zhaiMingMatch.isMatch).toBe(false);

    // 艮命（西四）+ 坤宅（西四）→ 相配
    const c: any = calculateBaZhai({ birthYear: 1990, gender: "女", zuoShan: "坤" });
    expect(c.zhaiMingMatch.isMatch).toBe(true);
  });

  it("八方游星逐卦逐位对大游年歌诀——独立基准，不是拿实现反推的", () => {
    // 歌诀是公开流传的口诀，与实现（翻卦变爻法）是两个来源。
    // 读法：每句七字，从**本卦的下一宫**起，按后天八卦圆周序循环。
    const DIR = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"];
    const GE_JUE: Record<string, string> = {
      乾: "六天五祸绝延生",
      坎: "五天生延绝祸六",
      艮: "六绝祸生延天五",
      震: "延生祸绝五天六",
      巽: "天五六祸生绝延",
      离: "六五绝延祸生天",
      坤: "天延绝生祸五六",
      兑: "生祸延绝六五天",
    };
    const FULL: Record<string, string> = {
      生: "生气", 天: "天医", 延: "延年",
      绝: "绝命", 五: "五鬼", 六: "六煞", 祸: "祸害",
    };

    for (const [gua, jue] of Object.entries(GE_JUE)) {
      const got = youXingMap(gua);
      expect(got[gua]).toBe("伏位"); // 本宫必是伏位
      const start = DIR.indexOf(gua);
      [...jue].forEach((ch, i) => {
        const dir = DIR[(start + 1 + i) % 8]; // 从下一宫起
        expect(`${gua}宅·${dir}方=${got[dir]}`).toBe(`${gua}宅·${dir}方=${FULL[ch]}`);
      });
    }
  });

  it("不变量：东四宅四吉方全在东四卦、四凶方全在西四卦（八卦逐个验）", () => {
    // 这是八宅的根本性质，不依赖任何外部基准就能自证：
    // 同组（东四/东四、西四/西四）为四吉，异组为四凶。
    // 修表之前这条**铁定不成立**——它本可以第一时间把抄错的游星表拦下来。
    const DONG_SI = ["坎", "震", "巽", "离"];
    const JI = ["伏位", "生气", "天医", "延年"];

    for (const gua of ["坎", "坤", "震", "巽", "乾", "兑", "艮", "离"]) {
      const map = youXingMap(gua);
      const sameGroup = (d: string) => DONG_SI.includes(d) === DONG_SI.includes(gua);
      const good = Object.entries(map).filter(([, star]) => JI.includes(star)).map(([d]) => d);
      const bad = Object.entries(map).filter(([, star]) => !JI.includes(star)).map(([d]) => d);

      expect(`${gua}宅吉方${good.sort().join("")}`).toBe(`${gua}宅吉方${good.filter(sameGroup).sort().join("")}`);
      expect(`${gua}宅凶方${bad.sort().join("")}`).toBe(`${gua}宅凶方${bad.filter((d) => !sameGroup(d)).sort().join("")}`);
      expect(good).toHaveLength(4);
      expect(bad).toHaveLength(4);
    }
  });

  it("朝向取对宫：坐坎朝离（正南），不再串到乾", () => {
    const a: any = calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "坎" });
    expect(a.zhaiGua.zuoShan).toBe("正北");
    expect(a.zhaiGua.chaoXiang).toBe("正南");
    // 艮坤对冲、震兑对冲，一并验
    expect((calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "艮" }) as any).zhaiGua.chaoXiang).toBe("西南");
    expect((calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "震" }) as any).zhaiGua.chaoXiang).toBe("正西");
  });

  it("门主灶按星力择位，不是按圆周顺序撞到谁算谁", () => {
    // 坎宅：生气在巽、天医在震、绝命在坤（由歌诀「坎五天生延绝祸六」可读出）
    const r: any = calculateBaZhai({ birthYear: 1990, gender: "男", zuoShan: "坎" });
    expect(r.menWei.star).toBe("生气");
    expect(r.menWei.direction).toBe("巽");
    expect(r.zhuWo.star).toBe("天医");
    expect(r.zhuWo.direction).toBe("震");
    expect(r.chuFang.star).toBe("绝命");
    expect(r.chuFang.direction).toBe("坤");
  });

  it("五入中寄宫：男寄坤2、女寄艮8", () => {
    // 1949 男：(100-49)%9 = 51%9 = 6 → 乾；取一个会得 5 的年份验寄宫
    // 1986 男：(100-86)%9 = 14%9 = 5 → 寄坤2
    const m: any = calculateBaZhai({ birthYear: 1986, gender: "男", zuoShan: "坎" });
    expect(m.mingGua.guaNum).toBe(2);
    // 1981 女：(81-4)%9 = 77%9 = 5 → 寄艮8
    const f: any = calculateBaZhai({ birthYear: 1981, gender: "女", zuoShan: "坎" });
    expect(f.mingGua.guaNum).toBe(8);
  });
});
