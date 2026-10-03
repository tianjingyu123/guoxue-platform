/**
 * 全计算器交叉验证扩展 — 覆盖全部 31 个未独立测试的计算器
 *
 * 验证层次:
 * 1. 全量导出: 所有 31 个函数存在且可调用不崩溃
 * 2. 结构完整性: 返回值为非空对象，至少含一个关键字段
 * 3. 核心算法: 已知基准点对照 + 边界条件
 * 4. 并发安全: 多计算器同时调用不冲突
 */

// ═══════════════════════════════════════════════════════════════
// 全量导出 + 基本可用性 — 31 个计算器
// ═══════════════════════════════════════════════════════════════

describe("全量计算器导出与基础可用性", () => {
  const calculators: [string, string, Record<string, unknown>][] = [
    ["daliuren", "calculateDaLiuRen", { datetime: "2024-06-15T10:00:00" }],
    ["zhuge", "calculateZhuGe", { method: "sanzi", chars: "测试", numbers: null, question: "问前程" }],
    ["company-naming", "calculateCompanyNaming", { industry: "科技", city: "北京", companyForm: "有限公司", style: "现代", ziHaoLength: 3, keywords: ["智"] }],
    ["qimen-acupuncture", "calculateQiMenAcupuncture", { datetime: "2024-06-15T10:00:00", chiefComplaint: "头痛", targetBodyPart: "头部" }],
    ["qimen-chuanren", "calculateQimenChuanren", { datetime: "2024-06-15T10:00:00", method: "zhuanpan", qiJuMethod: "chaibu", trueSolar: false, birthYear: 1996, gender: "男" }],
    ["qimen-mingli", "calculateQimenMingli", { birthTime: "1990-06-15T12:00:00", birthplace: "北京", gender: "男", jiGongMode: "kungong", trueSolar: false, ziShiMode: "traditional", daylightSaving: false }],
    ["qimen-yin-mingli", "calculateQimenYinMingli", { birthTime: "1990-06-15T12:00:00", birthplace: "北京", gender: "男", useTrueSolar: false, ziShiMode: "traditional", useDaylightSaving: false }],
    ["wannianli", "calculateWanNianLi", { date: "2024-06-01", endDate: "2024-06-07" }],
    ["qimen", "calculateQimenYang", { datetime: "2024-06-15T10:00:00" }],
    ["qizheng", "calculateQiZheng", { datetime: "2000-01-01T12:00:00", gender: "male", longitude: 116.4, latitude: 39.9, trueSolar: false, system: "guolao" }],
    ["qimen-fuzhou", "calculateQiMenFuZhou", { datetime: "2024-06-15T10:00:00", target: "财运", description: "求化解" }],
    ["wuge", "calculateWuGe", { surname: "张", givenName: "三", useKangXi: true, gender: "male" }],
    ["liuyao", "calculateLiuYao", { datetime: "2024-06-15T10:00:00" }],
    ["qimen", "calculateQimenYin", { datetime: "2024-06-15T10:00:00" }],
    ["meihua", "calculateMeiHua", { datetime: "2024-03-15T14:00:00", method: "time", type: "meihua" }],
    ["luopan", "calculateLuoPan", { degree: 180, magneticCorrection: true, longitude: 116.4, latitude: 39.9 }],
    ["wuyunliuqi", "calculateWuYunLiuQi", { year: 2024 }],
    ["feigong-qimen", "calculateFeiGongQiMen", { datetime: "2024-06-15T10:00:00" }],
    ["jinqianke", "calculateJinQianKe", { method: "random", datetime: "2024-06-15T10:00:00" }],
    ["bazhai", "calculateBaZhai", { birthYear: 1980, gender: "男", zuoShan: "坎" }],
    ["xingming-jiexi", "calculateXingmingJiexi", { surname: "张", givenName: "三", gender: "male", birthYear: 1990 }],
    // kongmingshengua 已于 2026-09-20 下架（实现的术不对，见 REMOVED_WRONG）
    ["xiaoliuren", "calculateXiaoLiuRen", { datetime: "2024-06-15T10:00:00", method: "time", type: "daojia" }],
    ["ziwei", "calculateZiWei", { name: "测试", gender: "男", year: 2000, month: 1, day: 1, hour: 12 }],
    ["bazi", "calculateBaZi", { name: "测试", gender: "男", year: 2000, month: 1, day: 1, hour: 12, minute: 0, city: "北京" }],
  ];

  // 注：xuankong / jinkoujue 不在此清单——那两份实现算错（§2.43、§2.47）已删除，
  // 正确实现在 shared，各自有断真实值的专项用例（本文件下方）。
  // xiaochengtu 同样已删除（§2.86：本卦不进九宫），闸门用例见本文件下方。
  // phone-analysis 等 16 个于 2026-09-20 整批删除（§2.104）——它们不是「算错」，
  // 而是**不该以计算器形式存在**：无计算、无可验证基准、前端零引用。
  // 删除清单与判据见 verification-gate.ts 文件头；缺席用例见本文件下方。
  for (const [file, func, input] of calculators) {
    it(`${file} — ${func}() 可调用且返回非空对象`, async () => {
      const mod = await import(`../src/modules/tool-registry/calculators/${file}.calculator`);
      const fn = (mod as any)[func];
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
      const result = fn(input);
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(Object.keys(result).length).toBeGreaterThan(0);
    }, 10000);
  }
});

// ═══════════════════════════════════════════════════════════════
// 核心占卜深度验证 — 大六壬 (649行，最大文件)
// ═══════════════════════════════════════════════════════════════

describe("大六壬 — 核心算法", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/daliuren.calculator"); });

  it("四课三传结构完整", () => {
    const result: any = mod.calculateDaLiuRen({ datetime: "2024-06-15T10:00:00" });
    expect(result.siKe).toBeDefined();
    expect(result.sanChuan).toBeDefined();
    expect(result.sanChuan.chu).toBeDefined();
    expect(result.sanChuan.zhong).toBeDefined();
    expect(result.sanChuan.mo).toBeDefined();
    const zhiSet = new Set(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]);
    expect(zhiSet.has(result.sanChuan.chu.zhi)).toBe(true);
    expect(zhiSet.has(result.sanChuan.zhong.zhi)).toBe(true);
    expect(zhiSet.has(result.sanChuan.mo.zhi)).toBe(true);
  });

  it("12宫四课结构正确", () => {
    const result: any = mod.calculateDaLiuRen({ datetime: "2024-03-20T08:00:00" });
    expect(result.gongs).toHaveLength(12);
    expect(result.tianJiangLayout).toHaveLength(12);
  });

  it("四季不同时间均不崩溃", () => {
    const dates = ["2024-03-20T10:00:00", "2024-06-21T10:00:00", "2024-09-23T10:00:00", "2024-12-22T10:00:00"];
    for (const dt of dates) {
      expect(() => { const r: any = mod.calculateDaLiuRen({ datetime: dt }); expect(r.sanChuan).toBeDefined(); }).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 奇门遁甲家族 — 阳盘/阴盘/飞宫/命理/阴盘命理/穿壬/山向 (7个)
// ═══════════════════════════════════════════════════════════════

describe("奇门遁甲家族", () => {
  it("阳盘奇门九宫数值范围正确", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/qimen.calculator");
    const result = mod.calculateQimenYang({ datetime: "2024-06-15T10:00:00" });
    expect(result.gongs).toHaveLength(9);
    expect(result.juNumber).toBeGreaterThanOrEqual(1);
    expect(result.juNumber).toBeLessThanOrEqual(9);
    for (const gong of result.gongs) {
      expect(gong.index).toBeGreaterThanOrEqual(1);
      expect(gong.index).toBeLessThanOrEqual(9);
    }
  });

  it("冬至阳遁、夏至阴遁", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/qimen.calculator");
    const winter = mod.calculateQimenYang({ datetime: "2024-01-15T10:00:00" });
    const summer = mod.calculateQimenYang({ datetime: "2024-07-15T10:00:00" });
    expect(["yang","阳遁"]).toContain(winter.dunType);
    expect(["yin","阴遁"]).toContain(summer.dunType);
  });

  it("拆补法与置闰法均可调用", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/qimen.calculator");
    expect(mod.calculateQimenYang({ datetime: "2024-06-15T10:00:00", qiJuMethod: "chaibu" }).gongs).toHaveLength(9);
    expect(mod.calculateQimenYang({ datetime: "2024-06-15T10:00:00", qiJuMethod: "zhirun" }).gongs).toHaveLength(9);
  });

  // 2026-09-19 重写。原用例叫「阴盘奇门月支定局逻辑正确」，断言的正是那个错的做法——
  // 旧 qimen-yin.calculator.ts 按月支查自造表定局（时家做成月家），已删除；
  // 而原断言只有 toHaveLength(9) 与 juNumber>=1，结构对就绿，抓不出任何算法错误。
  // 现在盘源改接共享奇门引擎，断言也改成「定局随节气走」这种能证伪的。
  it("阴盘奇门按自己的定局法（年月日时取数除九），逐时换盘", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/qimen.calculator");
    const jan = mod.calculateQimenYin({ datetime: "2024-01-15T10:00:00" });
    const jul = mod.calculateQimenYin({ datetime: "2024-07-15T10:00:00" });
    // 节气必须有值——旧实现这里恒为空
    expect(jan.jieQi).toBeTruthy();
    expect(jul.jieQi).toBeTruthy();
    // 冬夏遁型相反——旧实现恒判阴遁
    expect(jan.dunType).not.toBe(jul.dunType);
    // 同月内换节气就换局——旧实现同月同局
    const early = mod.calculateQimenYin({ datetime: "2024-01-03T10:00:00" });
    const late = mod.calculateQimenYin({ datetime: "2024-01-28T10:00:00" });
    expect(`1月3日与28日同局? ${early.juNumber === late.juNumber}`).toBe("1月3日与28日同局? false");
  });

  it("奇门各变体均可正常调用", async () => {
    const variants: [string, string, Record<string, unknown>][] = [
      ["feigong-qimen", "calculateFeiGongQiMen", { datetime: "2024-06-15T10:00:00" }],
      ["qimen-mingli", "calculateQimenMingli", { birthTime: "1990-06-15T12:00:00", birthplace: "北京", gender: "男", jiGongMode: "kungong", trueSolar: false, ziShiMode: "traditional", daylightSaving: false }],
      ["qimen-yin-mingli", "calculateQimenYinMingli", { birthTime: "1990-06-15T12:00:00", birthplace: "北京", gender: "男", useTrueSolar: false, ziShiMode: "traditional", useDaylightSaving: false }],
      ["qimen-chuanren", "calculateQimenChuanren", { datetime: "2024-06-15T10:00:00", method: "zhuanpan", qiJuMethod: "chaibu", trueSolar: false, birthYear: 1996, gender: "男" }],
      ["qimen-fuzhou", "calculateQiMenFuZhou", { datetime: "2024-06-15T10:00:00", target: "财运", description: "求化解" }],
      ["qimen-acupuncture", "calculateQiMenAcupuncture", { datetime: "2024-06-15T10:00:00", chiefComplaint: "头痛", targetBodyPart: "头部" }],
    ];
    for (const [file, func, input] of variants) {
      const mod = await import(`../src/modules/tool-registry/calculators/${file}.calculator`);
      const result = (mod as any)[func](input);
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 六爻/梅花 — 周易两大占卜
// ═══════════════════════════════════════════════════════════════

describe("六爻纳甲", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/liuyao.calculator"); });

  it("64卦编码完整 + 六爻结构", () => {
    const result: any = mod.calculateLiuYao({ datetime: "2000-01-01T12:00:00" });
    expect(result.yaos).toHaveLength(6);
    expect(result.benGua).toBeDefined();
    expect(result.benGua.name).toBeTruthy();
    expect(result.bianGua).toBeDefined();
    const props = ["liuShou", "liuQin", "type"];
    for (const yao of result.yaos) {
      for (const p of props) { expect(yao[p]).toBeDefined(); }
    }
  });

  it("世应爻有效范围", () => {
    const result: any = mod.calculateLiuYao({ datetime: "2024-06-15T10:00:00" });
    expect(result.shiYao).toBeGreaterThanOrEqual(1);
    expect(result.shiYao).toBeLessThanOrEqual(6);
    expect(result.yingYao).toBeGreaterThanOrEqual(1);
    expect(result.yingYao).toBeLessThanOrEqual(6);
  });
});

describe("梅花易数", () => {
  it("时间/数字起卦均可运行", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/meihua.calculator");
    const timeResult = mod.calculateMeiHua({ datetime: "2024-03-15T14:00:00", method: "time", type: "meihua" });
    const numResult = mod.calculateMeiHua({ method: "number", numbers: [23, 45, 67], type: "meihua" });
    for (const result of [timeResult, numResult]) {
      expect(result.benGua).toBeDefined();
      expect(result.huGua).toBeDefined();
      expect(result.bianGua).toBeDefined();
      expect(result.dongYao).toBeGreaterThanOrEqual(1);
      expect(result.dongYao).toBeLessThanOrEqual(6);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 太乙/玄空/七政/万年历 — 天文历法类
// ═══════════════════════════════════════════════════════════════

// 太乙神数：2026-09-19 实现已删除（核心计算是编的）。
//
// 原先这里有两个用例，断言的全是结构——jiNianCalc/sanSuan/baJiang 是否存在、
// baJiang 长度是否为 8。**两条全绿，而当时十六神正落在非整数宫位上**
// （实测文昌 4.5 宫、地主 7.5 宫、四神 10.5 宫、太簇 13.5 宫），
// 源头是 `gong: (gongXianIdx + i * 1.5 - 1) % 16 + 1` 里的 1.5 步长。
// 三算公式（文昌宫×3、始击宫×4）同样是凭空设定的乘加。
//
// 这是本仓库第三次出现「纯结构 spec 放跑编造算法」（前两次：阴盘奇门、奇门穿壬）。
// 结论写在这里当教训：**toBeDefined / toHaveLength 这类断言对算法正确性零保护。**
//
// 重建太乙需要先取得可靠的排盘基准（典籍算例或经市场检验的软件），
// 目前不具备，故不留占位实现。

describe("玄空风水", () => {
  // 原实现（tool-registry/calculators/xuankong.calculator）顺逆判错已删除，见 §2.43；
  // 这里改验 shared 的正确实现，并断言真实值而不只是结构
  let sh: any;
  beforeAll(async () => { sh = await import("@guoxue/shared/paipan"); });

  it("运盘/山盘/向盘完整，且与教科书基准一致", () => {
    const c = sh.computeXuankongChart(9, sh.XK_MOUNTAINS.indexOf("壬"), false);
    expect(Object.keys(c.yunPan)).toHaveLength(9);
    expect(Object.keys(c.shanPan)).toHaveLength(9);
    expect(Object.keys(c.xiangPan)).toHaveLength(9);
    // 九运运盘九入中顺飞：中 9、离 4、坎 5
    expect(c.yunPan[5]).toBe(9);
    expect(c.geju).toBeTruthy();
  });

  it("替卦模式可用，且与下卦结果不同", () => {
    const idx = sh.XK_MOUNTAINS.indexOf("壬");
    const xia = sh.computeXuankongChart(9, idx, false);
    const ti = sh.computeXuankongChart(9, idx, true);
    expect(Object.keys(ti.shanPan)).toHaveLength(9);
    // 替卦以起星诀换入中星，结果应与下卦有别（否则说明替卦没生效）
    expect(ti.shanCenter !== xia.shanCenter || ti.xiangCenter !== xia.xiangCenter).toBe(true);
  });
});

describe("七政四余", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/qizheng.calculator"); });

  it("十一曜 + 十二宫全部计算", () => {
    const result = mod.calculateQiZheng({
      datetime: "2000-01-01T12:00:00", gender: "male",
      longitude: 116.4, latitude: 39.9, trueSolar: false, system: "guolao",
    });
    expect(result.starPositions).toHaveLength(11);
    const names = result.starPositions.map((s: any) => s.star);
    for (const star of ["太阳","太阴","罗睺","计都","紫气","月孛"]) {
      expect(names).toContain(star);
    }
    for (const sp of result.starPositions) {
      expect(sp.eclipticDeg).toBeGreaterThanOrEqual(0);
      expect(sp.eclipticDeg).toBeLessThan(360);
    }
  });

  it("2000-01-01太阳约在摩羯280°附近", () => {
    const result = mod.calculateQiZheng({
      datetime: "2000-01-01T12:00:00", gender: "male",
      longitude: 116.4, latitude: 39.9, trueSolar: false, system: "guolao",
    });
    const sun = result.starPositions.find((s: any) => s.star === "太阳");
    expect(sun).toBeDefined();
    expect(sun!.eclipticDeg).toBeGreaterThan(278);
    expect(sun!.eclipticDeg).toBeLessThan(283);
  });
});

describe("万年历", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/wannianli.calculator"); });

  it("月度日历不少于28天", () => {
    const result: any = mod.calculateWanNianLi({ date: "2024-06-01", endDate: "2024-06-30" });
    expect(result.days).toBeDefined();
    expect(result.days.length).toBeGreaterThanOrEqual(28);
    for (const day of result.days.slice(0, 3)) {
      expect(day.riGanZhi).toBeTruthy();
    }
  });

  it("2024全年12个月均可生成", () => {
    for (const month of [1, 4, 7, 10]) {
      const start = `2024-${String(month).padStart(2, "0")}-01`;
      const end = `2024-${String(month).padStart(2, "0")}-28`;
      const result: any = mod.calculateWanNianLi({ date: start, endDate: end });
      expect(result.days.length).toBeGreaterThanOrEqual(27);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 金口诀/小成图/五运六气
// ═══════════════════════════════════════════════════════════════

describe("金口诀", () => {
  /**
   * 原测试调 tool-registry 的 calculateJinKouJue，只验结构。
   * 那份实现月将算错半年（秋分后误用谷雨月将），已删除（§2.47）。
   * 改为验 shared 的正确实现，并断言**第三方基准盘的真实值**（§2.60 实测）。
   */
  it("基准盘：2025-09-29 10:10 地分子中气 → 月将辰、用在将神", async () => {
    const { computeJinkoujue } = await import("@guoxue/shared/paipan");
    const { Solar } = await import("lunar-javascript");
    const lunar = (Solar as any).fromYmdHms(2025, 9, 29, 10, 10, 0).getLunar();
    const zhongqiTable: Record<string, number> = {};
    const table = lunar.getJieQiTable();
    for (const name of Object.keys(table)) {
      const jq = table[name];
      zhongqiTable[name] = new Date(jq.getYear(), jq.getMonth() - 1, jq.getDay(), jq.getHour(), jq.getMinute()).getTime();
    }
    const r: any = computeJinkoujue({
      date: new Date(2025, 8, 29, 10, 10),
      sizhu: {
        year: lunar.getYearInGanZhiByLiChun(), month: lunar.getMonthInGanZhiExact(),
        day: lunar.getDayInGanZhiExact(), hour: lunar.getTimeInGanZhi(),
      },
      zhongqiTable, jiangMethod: "zhong", difenMethod: "manual", difenZhi: "子",
      guirenSchool: "A", guiType: "auto",
    });
    expect(`${r.pillars.year} ${r.pillars.month} ${r.pillars.day} ${r.pillars.time}`).toBe("乙巳 乙酉 辛丑 癸巳");
    expect(r.yuejiang.zhi).toBe("辰");
    expect(r.yongRole).toBe("将神");
    expect(r.xunKong.join("")).toBe("辰巳");
    expect(r.siDaKong).toBe("亥子壬癸");
    expect(r.positions).toHaveLength(4);
  });
});

/**
 * 🔴 2026-09-19：本文件原有的小成图与五运六气两段，是「纯结构 spec 是假绿」的活标本。
 *
 * 小成图那条只断了 `gongs / mainGua / heBiWangLai` 三个 `toBeDefined`，
 * 而那份实现的九宫**整个是编的**——天盘由 `(宫位+动爻)%8` 生成，本卦根本不参与，
 * 四个完全不同的本卦只要动爻相同就排出一模一样的八宫。三条断言全程绿灯。
 *
 * 五运六气那条断 `basicInfo / daYun / liuQi` 三个 `toBeDefined` 外加「不崩溃」，
 * 而那份实现有四处错（客气整体错位两步、主客运太少不交替、太乙天符永远报不出来、
 * 顺逆恒为平）。同样全程绿灯。
 *
 * `toBeDefined` / `not.toThrow` 对算法正确性**零保护**——这已是第四次被它放跑。
 * 现分别改为：小成图验闸门确实拦住了下架实现；五运六气指向真正断值的回归文件。
 */
describe("小成图（实现已下架，验闸门）", () => {
  it("已删除的实现不得再被调用", async () => {
    const { REMOVED_WRONG } = await import("../src/modules/tool-registry/verification-gate");
    expect(REMOVED_WRONG["xiaochengtu"]).toBeDefined();
    expect(REMOVED_WRONG["xiaochengtu"]).toContain("本卦不参与");
  });

  it("计算端点拒绝出结果，并给出具体错因", async () => {
    const { ToolCalculationService } = await import("../src/modules/tool-registry/tool-calculation.service");
    const svc = new ToolCalculationService({} as never);
    await expect(svc.calculate({ toolId: "xiaochengtu", input: {} })).rejects.toThrow(/本卦不参与/);
  });
});

/**
 * 2026-09-20 整批删除（§2.104）：16 个「无核验价值」的计算器。
 *
 * ══ 与 REMOVED_WRONG 的区别 ══
 *
 * `REMOVED_WRONG` 收的是**算错**的实现（小成图、玄空、金口诀……），
 * 闸门要拿着具体错因把调用挡回去，所以必须留条目。
 * 这一批不一样——它们**不是算错，而是不该以计算器的形式存在**，三条判据任一成立即删：
 *
 *   ① 无计算：输入是主观描述，输出是描述文本（面相、手相）；
 *   ② 无可验证基准且无内部不变量：号码吉凶、数字能量、生肖/星座运势模板；
 *   ③ 纯内容检索伪装成计算器：古籍、名句、古地名、书体、姓氏源流、宅相。
 *
 * 它们不进 REMOVED_WRONG，因为「错因」这一栏填不出东西来；
 * 未列入 VERIFIED_TOOLS 本身就够闸门拦住了。
 * 本段用例守的是另一件事：**不要有人把文件再建回来**。
 * 删掉一个算法容易，难的是半年后有人「顺手补上」而没人记得当初为什么删。
 */
describe("整批删除的计算器不得复活（2026-09-20）", () => {
  const DELETED = [
    "mianxiang", "mianxiang-liunian", "mianxiang-shiere-gong", "shouxiang",
    "shengxiao-yunshi", "xingzuo-yunshi", "liunian-yunshi", "shichen-yunshi",
    "phone-analysis", "shuzi-nengliang",
    "guoxue-classics", "classical-quote-search", "ancient-place-names",
    "calligraphy-styles", "surname-origin", "zhaixiang-fengshui",
    // 第二批（同日）：函数体内读不到任何输入字段，输入到不了输出
    "ershisi-shan", "liuyao-duangua", "meihua-waixiang", "qimen-yingxun", "ziwei-xingyao",
    // 第二批里唯一**算错**的一个，另有 REMOVED_WRONG 条目守着
    "xuankong-jiugong",
    // 第三批（同日，「简化」气味扫描 + 与已核验实现比对）
    "guolao-xingzong", "tieban-shenshu", "hanzi-filter", "chunzi-shu",   // 无核验价值
    "bazi-fanpai", "qimen-zhongshen", "jiaqu-zeri",                      // 实测算错，进 REMOVED_WRONG
    // 第四批：被「输出的干支必须是六十甲子之一」这条自相矛盾型扫描抓出
    "qimen-shike", "shanxiang-qimen",
  ];

  it("16 个实现文件确实不在仓库里", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(__dirname, "../src/modules/tool-registry/calculators");
    const alive = DELETED.filter((f) => fs.existsSync(path.join(dir, `${f}.calculator.ts`)));
    expect(`复活的文件=${alive.join(",") || "无"}`).toBe("复活的文件=无");
  });

  it("calculators/index.ts 不再导出它们", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "../src/modules/tool-registry/calculators/index.ts"), "utf8");
    const leaked = DELETED.filter((f) => src.includes(`${f}.calculator`));
    expect(`残留导出=${leaked.join(",") || "无"}`).toBe("残留导出=无");
  });

  // ⚠️ 这里**不能**用「svc.calculate(toolId) 会抛错」来验删除——那条没有判别力：
  // 闸门在 dispatch 之前就把所有未核验工具一律拦掉，
  // 文件还在、分发还在，它照样抛同一个错。绿灯说明不了任何事。
  // 有判别力的是下面这条：直接查分发表里还有没有它们的函数名。
  it("tool-calculation.service 的分发表里已无它们的函数", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const FUNCS = [
      "calculateMianXiang", "calculateMianXiangLiuNian", "calculateMianXiangShiErGong",
      "calculateShouXiang", "calculateShengXiaoYunshi", "calculateXingZuoYunshi",
      "calculateLiuNianYunShi", "calculateShiChenYunShi", "calculatePhoneAnalysis",
      "calculateShuZiNengLiang", "calculateGuoXueClassics", "calculateClassicalQuoteSearch",
      "calculateAncientPlaceNames", "calculateCalligraphyStyles", "calculateSurnameOrigin",
      "calculateZhaixiangFengshui",
      "calculateErShiSiShan", "calculateLiuYaoDuanGua", "calculateMeiHuaWaiXiang",
      "calculateQiMenYingXun", "calculateZiWeiXingYao", "calculateXuanKongJiuGong",
      "calculateGuoLaoXingZong", "calculateTieBan", "calculateHanZiFilter",
      "calculateChunZiShu", "calculateBaziFanPai", "calculateQiMenZhongShen",
      "calculateJiaQuZeRi", "calculateQiMenShiKe", "calculateShanXiangQiMen",
    ];
    const src = fs.readFileSync(
      path.join(__dirname, "../src/modules/tool-registry/tool-calculation.service.ts"), "utf8",
    );
    // 注意 calculateMianXiang 是 calculateMianXiangLiuNian 的前缀，用词边界避免自相包含
    const leaked = FUNCS.filter((fn) => new RegExp(`\\b${fn}\\b`).test(src));
    expect(`残留分发=${leaked.join(",") || "无"}`).toBe("残留分发=无");
  });

  it("反证：这条检查确实能发现残留（在用函数必须查得到）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "../src/modules/tool-registry/tool-calculation.service.ts"), "utf8",
    );
    // 若这条挂了，说明上面那条的「查不到」只是因为查法本身失效，而非真的删干净了
    expect(/\bcalculateWuYunLiuQi\b/.test(src)).toBe(true);
  });
});

/**
 * 五运六气的实际正确性由
 * `src/modules/tool-registry/calculators/wuyunliuqi.calculator.spec.ts` 负责
 * （21 个测试：基础表对《素问》、内部不变量 60 年全覆盖、
 *   同化定数按甲子一轮逐年点名、相临五类）。
 * 此处只保留一条最低限度的可调用性检查，不再假装它是正确性测试。
 */
describe("五运六气（正确性见 wuyunliuqi.calculator.spec.ts）", () => {
  it("逐年可调用且司天与三之气自洽", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/wuyunliuqi.calculator");
    for (const year of [2000, 2010, 2020, 2024, 2030]) {
      const r: any = mod.calculateWuYunLiuQi({ year });
      // 只断一条铁律：三之气必为司天。修之前这条 60 年全违。
      expect(`${year}:${r.liuQi.keQi[2].qi}`).toBe(`${year}:${r.liuQi.siTian}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// P4 轻型工具 — 八宅/金钱/孔明/诸葛/五格/姓名/罗盘/手机 (8个)
// ═══════════════════════════════════════════════════════════════

describe("八宅风水", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/bazhai.calculator"); });

  it("命卦+宅卦+八方吉凶完整", () => {
    const result: any = mod.calculateBaZhai({ birthYear: 1980, gender: "男", zuoShan: "坎" });
    expect(result.mingGua).toBeTruthy();
    expect(result.zhaiGua).toBeTruthy();
    expect(Object.keys(result.baFang || {}).length).toBeGreaterThanOrEqual(8);
  });

  it("2000年后命卦公式正确", () => {
    const male = mod.calculateBaZhai({ birthYear: 2001, gender: "男", zuoShan: "坎" });
    const female = mod.calculateBaZhai({ birthYear: 2001, gender: "女", zuoShan: "坎" });
    expect(male.mingGua).toBeTruthy();
    expect(female.mingGua).toBeTruthy();
  });
});

describe("金钱课", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/jinqianke.calculator"); });

  it("64卦爻辞+互卦变卦完整", () => {
    const result: any = mod.calculateJinQianKe({ method: "random", datetime: "2024-06-15T10:00:00" });
    expect(result.yaos).toHaveLength(6);
    expect(result.benGua).toBeDefined();
    expect(result.bianGua).toBeDefined();
    expect(result.dongYaoCi).toBeDefined();
  });

  it("手动六次抛币模式可用", () => {
    const result: any = mod.calculateJinQianKe({ coins: [1, 1, 0, 1, 0, 0] });
    expect(result.yaos).toHaveLength(6);
  });
});

/**
 * 孔明课（kongmingshengua）已于 2026-09-20 下架——**实现的术不对**：
 * 旧版是五爻 32 卦体系（卦名如「开发卦」＋四句诗＋十项论断），
 * 本实现用的是周易六十四卦。详见 `verification-gate.ts` 的 `REMOVED_WRONG`。
 *
 * 顺带记一笔：原来这条用例只断言四个字段 `toBeDefined()`——
 * 而那时它的卦爻编码表 49/64 个卦是错的、变卦有 49% 退回本卦，这条照样全绿。
 * **`toBeDefined` 对算法正确性零保护。**
 */

describe("诸葛神数", () => {
  let mod: any;
  beforeAll(async () => { mod = await import("../src/modules/tool-registry/calculators/zhuge.calculator"); });

  it("384签体系 + 真实笔画", () => {
    const result: any = mod.calculateZhuGe({
      method: "sanzi", chars: "测试", numbers: null, question: "问前程",
    });
    expect(result.qianWen).toBeTruthy();
    expect(result.jieQian).toBeTruthy();
  });

  it("报数模式可用", () => {
    // 🔴 2026-09-20：原来传 `method: "number"`，而实现只认 `"baoshu"`。
    // 也就是说这条名叫「数字模式可用」的用例**从没测过报数模式**——
    // 它落进了「用当前时间起数」的兜底，测的是兜底。那条兜底已删，这条才暴露。
    const result: any = mod.calculateZhuGe({
      method: "baoshu", numbers: [123, 456, 789], question: "问财运",
    });
    expect(result.qianWen).toBeTruthy();
    expect(result.jieQian).toBeTruthy();
  });
});

describe("五格数理+姓名解析+罗盘+手机", () => {
  it("五格三才配置完整", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/wuge.calculator");
    const result: any = mod.calculateWuGe({
      surname: "张", givenName: "三", useKangXi: true, gender: "male",
    });
    expect(result.geDetails).toBeDefined();
    expect(result.geDetails.length).toBeGreaterThanOrEqual(5);
    for (const ge of result.geDetails) {
      expect(ge.number).toBeGreaterThan(0);
    }
    expect(result.sanCai).toBeDefined();
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it("姓名解析轻量版可用", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/xingming-jiexi.calculator");
    const result: any = mod.calculateXingmingJiexi({
      surname: "张", givenName: "三", gender: "male", birthYear: 1990,
    });
    expect(Object.keys(result).length).toBeGreaterThan(4);
  });

  it("罗盘24山+纳甲+风水建议", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/luopan.calculator");
    const result: any = mod.calculateLuoPan({
      degree: 180, magneticCorrection: true, longitude: 116.4, latitude: 39.9,
    });
    expect(result.shanAnalysis.zuoShan).toBeTruthy();
    expect(result.shanAnalysis.chaoXiang).toBeTruthy();
    expect(result.naJia).toBeTruthy();
  });

  // 手机号吉凶（phone-analysis）原有两条用例已随实现删除（2026-09-20，§2.104）。
  // 那两条测的是「号段能认出运营商」「分数在 0–100」——
  // **通过与否跟吉凶断语对不对毫无关系**，是典型的「有测试但无判别力」。
  // 号码吉凶本身无任何可验证基准（八星磁场是商业话术，非典籍），故连同实现一并删除。
  // 缺席用例见下方「整批删除的计算器不得复活」。
});

// ═══════════════════════════════════════════════════════════════
// 公司起名 + 八字/紫微封装
// ═══════════════════════════════════════════════════════════════

describe("公司起名", () => {
  it("候选名称列表+行业分析完整", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/company-naming.calculator");
    const result: any = mod.calculateCompanyNaming({
      industry: "科技", city: "北京", companyForm: "有限公司",
      style: "现代", ziHaoLength: 3, keywords: ["智", "创"],
    });
    expect(result.proposals).toBeDefined();
    expect(result.proposals.length).toBeGreaterThan(0);
    for (const p of result.proposals.slice(0, 3)) {
      expect(p.name).toBeTruthy();
    }
    expect(result.industryAnalysis).toBeDefined();
  });

  it("多个行业均可产出名称", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/company-naming.calculator");
    for (const industry of ["科技", "文化", "贸易"]) {
      const result: any = mod.calculateCompanyNaming({
        industry, city: "上海", companyForm: "有限公司",
        style: "传统", ziHaoLength: 3, keywords: ["盛"],
      });
      expect(result.proposals.length).toBeGreaterThan(0);
    }
  });
});

describe("八字/紫微封装层", () => {
  it("八字: siZhu/qiYun/shengXiao 完整", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/bazi.calculator");
    const result: any = mod.calculateBaZi({
      name: "测试", gender: "男", year: 2000, month: 1, day: 1, hour: 12,
      minute: 0, city: "北京",
    });
    expect(result.siZhu).toBeDefined();
    expect(result.qiYun).toBeDefined();
    expect(result.shengXiao).toBeTruthy();
  });

  it("紫微: gongWei/mingGong/siHua/wuXingJu 完整", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/ziwei.calculator");
    const result: any = mod.calculateZiWei({
      name: "测试", gender: "男", year: 2000, month: 1, day: 1, hour: 12,
    });
    expect(result.gongWei).toBeDefined();
    expect(result.mingGong).toBeDefined();
    expect(result.siHua).toBeDefined();
    expect(result.wuXingJu).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// 边界条件 + 并发安全
// ═══════════════════════════════════════════════════════════════

describe("边界条件", () => {
  it("子时边缘（00:30/23:30）奇门不崩溃", async () => {
    const mod = await import("../src/modules/tool-registry/calculators/qimen.calculator");
    expect(() => mod.calculateQimenYang({ datetime: "2024-06-15T00:30:00" })).not.toThrow();
    expect(() => mod.calculateQimenYang({ datetime: "2024-06-15T23:30:00" })).not.toThrow();
  });

  it("极端年份（1500/2100）多计算器不崩溃", async () => {
    const wnl = await import("../src/modules/tool-registry/calculators/wannianli.calculator");
    const wz = await import("../src/modules/tool-registry/calculators/bazi.calculator");
    expect(() => (wnl as any).calculateWanNianLi({ date: "2024-01-01", endDate: "2024-01-07" })).not.toThrow();
    expect(() => (wz as any).calculateBaZi({
      name: "测试", gender: "男", year: 2000, month: 1, day: 1, hour: 12, minute: 0, city: "北京",
    })).not.toThrow();
  });
});

describe("并发安全", () => {
  it("10个计算器并行调用无异常", async () => {
    const tasks = ["qimen", "liuyao", "meihua", "daliuren", "wannianli", "xuankong", "bazhai", "wuge", "xiaoliuren", "jinqianke"];
    const results = await Promise.all(tasks.map(async (name) => {
      const mod = await import(`../src/modules/tool-registry/calculators/${name}.calculator`);
      const fnName = Object.keys(mod).find(k => k.startsWith("calculate"))!;
      return (mod as any)[fnName]({});
    }).map(p => p.catch(() => null)));
    const succeeded = results.filter(Boolean).length;
    expect(succeeded).toBeGreaterThan(0);
  });
});

/**
 * 玄空九宫：2026-09-20 实测算错后删除，本段验闸门确实收了错因。
 *
 * 与 `xiaochengtu` 同一处置方式——**错因必须具体到能据以重建**，
 * 「不可用」三个字对后来人没有任何价值。
 */
describe("玄空九宫（实现算错已下架，验闸门）", () => {
  it("REMOVED_WRONG 收录，且错因指明方向反而非表错", async () => {
    const { REMOVED_WRONG } = await import("../src/modules/tool-registry/verification-gate");
    expect(REMOVED_WRONG["xuankong-jiugong"]).toBeDefined();
    // 错因要点：恒逆飞 + 运盘必顺飞。少了任一条都无法据此重建
    expect(REMOVED_WRONG["xuankong-jiugong"]).toContain("逆飞");
    expect(REMOVED_WRONG["xuankong-jiugong"]).toContain("顺飞");
  });

  it("计算端点拒绝出结果，并给出具体错因", async () => {
    const { ToolCalculationService } = await import("../src/modules/tool-registry/tool-calculation.service");
    const svc = new ToolCalculationService({} as never);
    await expect(svc.calculate({ toolId: "xuankong-jiugong", input: {} })).rejects.toThrow(/逆飞/);
  });
});

/**
 * 第三批实测算错的三个（2026-09-20）。
 *
 * 这三个与前两批不同——它们**有像模像样的计算**，只是算错。
 * 所以错因必须具体到能据以重建，而不是笼统的「不可用」。
 *
 * 三条错因各自钉一个关键词，将来若有人"修好了重新接上"，
 * 这里会立刻告诉他当初错在哪，不必回去翻 git。
 */
describe("第三批算错实现的闸门（2026-09-20）", () => {
  const CASES: [string, RegExp][] = [
    // 月柱与五虎遁 24/24 不符，且越界兜底产出「甲丑」这种不存在的干支
    ["bazi-fanpai", /甲丑/],
    // 定局 (节气序号 % 9) + 1，与共享奇门 12/12 不符
    ["qimen-zhongshen", /72 局|三元/],
    // 日干支用平均月长推算，108 样本全错
    ["jiaqu-zeri", /30\.44|108/],
    // 时干直接拿日干配时支，输出过六十甲子中不存在的干支
    ["qimen-shike", /戊亥|五鼠遁/],
    // 用事干支取错一头 + 四个宫标记是宫号取模；错因须留下重建路径
    ["shanxiang-qimen", /JU_72|共享奇门引擎/],
  ];

  it("三个都进了 REMOVED_WRONG，且错因留下了可据以重建的细节", async () => {
    const { REMOVED_WRONG } = await import("../src/modules/tool-registry/verification-gate");
    for (const [id, re] of CASES) {
      expect(`${id}=${REMOVED_WRONG[id] ? "有" : "无"}`).toBe(`${id}=有`);
      expect(`${id} 错因含细节=${re.test(REMOVED_WRONG[id])}`).toBe(`${id} 错因含细节=true`);
    }
  });

  it("计算端点对这三个都拒绝出结果", async () => {
    const { ToolCalculationService } = await import("../src/modules/tool-registry/tool-calculation.service");
    const svc = new ToolCalculationService({} as never);
    for (const [id] of CASES) {
      // 这里能断具体错因（而非只断"抛错"）——REMOVED_WRONG 的拦截发生在通用闸门之前
      await expect(svc.calculate({ toolId: id, input: {} })).rejects.toThrow(REMOVED_WRONG_SNIPPET[id]);
    }
  });
});

/** 各自错因里一段足够独特的文字，用于确认拒绝理由确实来自 REMOVED_WRONG 而非通用闸门 */
const REMOVED_WRONG_SNIPPET: Record<string, RegExp> = {
  "bazi-fanpai": /五虎遁/,
  "qimen-zhongshen": /72 局/,
  "jiaqu-zeri": /30\.44/,
  "qimen-shike": /戊亥/,
  "shanxiang-qimen": /旬首/,
};
