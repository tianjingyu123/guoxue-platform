import { calculateWuYunLiuQi } from "./wuyunliuqi.calculator";

/**
 * 五运六气回归（2026-09-19 核验，接续文档 §2.82）
 *
 * ══ 修之前的四处错 ══
 *
 * ① **客气整体错位两步**：`let qiIdx = siTianIdx` 把司天摆在了初之气。
 *    司天定在三之气、在泉定在终之气，初之气须自司天前两位起。
 *    实测 1984/2020/2024/2025/2026 五年全部违反这两条铁律——
 *    其中「终之气 ≠ 在泉」是**自相矛盾**：同一次计算里 `zaiQuan` 报阳明燥金、
 *    终之气却排出厥阴风木。
 * ② **主运/客运五步套同一个太过不及**：甲年排出「土太过/金太过/水太过/木太过/火太过」。
 *    运气学是太少相生，须逐步交替。
 * ③ **太乙天符永远报不出来**：`results` 里天符排在太乙天符之前，
 *    而 `find(r => r.active)` 取第一个命中。太乙天符必然同时是天符，
 *    故戊午、己丑、己未、乙酉四年一律被降级成「天符」。
 *    同天符写死 `const tongTianFu = false; // 需更复杂推算`，同岁会同样写死——从未实现。
 *    岁会判定又过宽：拿十二支的五行一律比对，把壬寅、癸巳、庚申、辛亥误判为岁会。
 * ④ **顺逆恒为「平」**：`entry.rel.includes("顺")` 判的是 `rel` 字段，
 *    而 rel 取值只有「运气相合/气生运/运克气/气克运/运生气」，无一含「顺」「逆」二字，
 *    两个分支永不命中。「顺」「逆」只出现在 `desc` 里——判错了字段。
 *
 * ══ 两张基础表原本是对的 ══
 *
 * 天干化运（甲己土·乙庚金·丙辛水·丁壬木·戊癸火，阳干太过阴干不及）与
 * 地支化气（子午少阴·丑未太阴·寅申少阳·卯酉阳明·辰戌太阳·巳亥厥阴）
 * 逐项对过《素问·天元纪大论》，十干十二支全对，未改。
 * 错的全在推算层——**正确的骨架上加了一层假的**，是最隐蔽的一类。
 *
 * ══ 判据来源（均非手写期望值）══
 *
 * · 内部不变量：三之气≡司天、终之气≡在泉、客气六步不重复、太少交替；
 * · 外部定数：运气同化的年份数是《素问》给死的——天符12、岁会8、太乙天符4、
 *   同天符6、同岁会6，本测试按甲子一轮 60 年逐年点名比对；
 * · 交叉验证：修完后与前端 `pkg-paipan/lib/wuyunliuqi-engine.ts` 的判定逻辑
 *   逐条对照一致（前端这几处本来就是对的，是第 6 次「后端错·前端对」）。
 */

/** 1984 甲子起一整轮甲子 */
const YEARS = Array.from({ length: 60 }, (_, i) => 1984 + i);
const ALL = YEARS.map((y) => ({ y, r: calculateWuYunLiuQi({ year: y }) as any }));

/** 按同化类型点名年份（结果只报优先级最高的一种，故各表已扣除被更高级别吸收的年份） */
const pickGanZhi = (type: string) =>
  ALL.filter(({ r }) => r.tongHua.type === type)
    .map(({ r }) => r.basicInfo.nianGanZhi)
    .sort()
    .join(" ");

/**
 * 期望值也走同一条 `sort()` 再比。
 *
 * 首次写这张表时直接手打了中文次序，两条断言当场挂掉——
 * JS 的 `Array#sort()` 按 **UTF-16 码元**排，不是拼音也不是笔画，
 * 「戊午」排在「己丑」之后而非之前。集合本身是对的，错的是我猜的字序。
 * 手写期望值这个坑本轮已踩到第五次，故一律改为「两边同法归一」。
 */
const sortedExpect = (...ganZhi: string[]) => ganZhi.sort().join(" ");

describe("五运六气：基础表（《素问·天元纪大论》）", () => {
  it("天干化运十干全对，阳干太过、阴干不及", () => {
    // 甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火
    const expected: Record<string, string> = {
      甲: "土运太过", 己: "土运不及",
      乙: "金运不及", 庚: "金运太过",
      丙: "水运太过", 辛: "水运不及",
      丁: "木运不及", 壬: "木运太过",
      戊: "火运太过", 癸: "火运不及",
    };
    for (const { r } of ALL) {
      const gan = r.basicInfo.tianGan;
      const got = `${r.daYun.tianGanHuaYun}${r.daYun.yunState}`;
      expect(`${gan}→${got}`).toBe(`${gan}→${expected[gan]}`);
    }
  });

  it("地支化气十二支司天全对", () => {
    const expected: Record<string, string> = {
      子: "少阴君火", 午: "少阴君火",
      丑: "太阴湿土", 未: "太阴湿土",
      寅: "少阳相火", 申: "少阳相火",
      卯: "阳明燥金", 酉: "阳明燥金",
      辰: "太阳寒水", 戌: "太阳寒水",
      巳: "厥阴风木", 亥: "厥阴风木",
    };
    for (const { r } of ALL) {
      const zhi = r.basicInfo.diZhi;
      expect(`${zhi}→${r.liuQi.siTian}`).toBe(`${zhi}→${expected[zhi]}`);
    }
  });
});

describe("五运六气：内部不变量（60 年全覆盖）", () => {
  it("三之气 ≡ 司天", () => {
    const bad = ALL.filter(({ r }) => r.liuQi.keQi[2].qi !== r.liuQi.siTian)
      .map(({ r }) => `${r.basicInfo.nianGanZhi}(三之气=${r.liuQi.keQi[2].qi}≠司天${r.liuQi.siTian})`);
    expect(`违反=${bad.join(",")}`).toBe("违反=");
  });

  it("终之气 ≡ 在泉（修前此项自相矛盾）", () => {
    const bad = ALL.filter(({ r }) => r.liuQi.keQi[5].qi !== r.liuQi.zaiQuan)
      .map(({ r }) => `${r.basicInfo.nianGanZhi}(终之气=${r.liuQi.keQi[5].qi}≠在泉${r.liuQi.zaiQuan})`);
    expect(`违反=${bad.join(",")}`).toBe("违反=");
  });

  it("客气六步为三阴三阳各一，不重不漏", () => {
    const bad = ALL.filter(({ r }) => new Set(r.liuQi.keQi.map((k: any) => k.qi)).size !== 6)
      .map(({ r }) => r.basicInfo.nianGanZhi);
    expect(`违反=${bad.join(",")}`).toBe("违反=");
  });

  it("主气六步恒为木·君火·相火·土·金·水", () => {
    const fixed = ["厥阴风木", "少阴君火", "少阳相火", "太阴湿土", "阳明燥金", "太阳寒水"];
    for (const { r } of ALL) {
      expect(r.liuQi.zhuQi.map((q: any) => q.qi)).toEqual(fixed);
    }
  });

  it("客运五步太少相生（相邻不得同太少）", () => {
    const bad = ALL.filter(({ r }) => {
      const st = r.daYun.keYun.map((s: string) => (s.includes("太过") ? "太" : "少"));
      return st.some((v: string, i: number) => i > 0 && v === st[i - 1]);
    }).map(({ r }) => `${r.basicInfo.nianGanZhi}[${r.daYun.keYun.join("/")}]`);
    expect(`违反=${bad.join(",")}`).toBe("违反=");
  });

  it("主运五步太少相生，且岁运所居之步与岁运同太少", () => {
    const ORDER = ["木运", "火运", "土运", "金运", "水运"];
    for (const { r } of ALL) {
      const st = r.daYun.zhuYun.map((s: string) => (s.includes("太过") ? "太" : "少"));
      expect(st.some((v: string, i: number) => i > 0 && v === st[i - 1])).toBe(false);
      const pos = ORDER.indexOf(r.daYun.suiYun);
      const want = r.daYun.yunState === "太过" ? "太" : "少";
      expect(`${r.basicInfo.nianGanZhi}第${pos + 1}运=${st[pos]}`).toBe(`${r.basicInfo.nianGanZhi}第${pos + 1}运=${want}`);
    }
  });
});

describe("五运六气：运气同化（对照《素问》定数，非手写期望）", () => {
  /**
   * 报告只输出优先级最高的一种（类型 `TongHuaType` 只容一个值），
   * 故下列各表已按「太乙天符 > 天符/岁会 > 同天符/同岁会」扣除被吸收的年份：
   * · 天符 12 年，其中 4 年升为太乙天符 → 此处剩 8；
   * · 岁会 8 年，同 4 年升为太乙天符 → 剩 4；
   * · 同天符 6 年，甲辰甲戌已被岁会吸收 → 剩 4。
   */
  it("太乙天符 4 年：乙酉、戊午、己丑、己未", () => {
    expect(pickGanZhi("太乙天符")).toBe(sortedExpect("乙酉", "戊午", "己丑", "己未"));
  });

  it("天符（扣除太乙天符）8 年", () => {
    expect(pickGanZhi("天符")).toBe(sortedExpect("戊子", "乙卯", "丙辰", "丙戌", "丁巳", "丁亥", "戊寅", "戊申"));
  });

  it("岁会（扣除太乙天符）4 年：甲辰、甲戌、丙子、丁卯", () => {
    expect(pickGanZhi("岁会")).toBe(sortedExpect("甲辰", "甲戌", "丙子", "丁卯"));
  });

  it("同天符（扣除已归岁会的甲辰甲戌）4 年：庚子、庚午、壬寅、壬申", () => {
    expect(pickGanZhi("同天符")).toBe(sortedExpect("庚子", "庚午", "壬寅", "壬申"));
  });

  it("同岁会 6 年：辛丑、辛未、癸卯、癸酉、癸巳、癸亥", () => {
    expect(pickGanZhi("同岁会")).toBe(sortedExpect("辛丑", "辛未", "癸卯", "癸酉", "癸巳", "癸亥"));
  });

  it("壬寅、癸巳、庚申、辛亥不得判为岁会（寅巳申亥为长生位非正位）", () => {
    for (const gz of ["壬寅", "癸巳", "庚申", "辛亥"]) {
      const hit = ALL.find(({ r }) => r.basicInfo.nianGanZhi === gz)!;
      expect(`${gz}=${hit.r.tongHua.type}`).not.toBe(`${gz}=岁会`);
    }
  });

  it("甲辰兼具岁会与同天符，主判取岁会并在断语点出兼项", () => {
    const hit = ALL.find(({ r }) => r.basicInfo.nianGanZhi === "甲辰")!;
    expect(hit.r.tongHua.type).toBe("岁会");
    expect(hit.r.tongHua.desc).toContain("兼同天符");
  });

  it("不构成同化之年报「无」而非静默落到天符", () => {
    const none = ALL.filter(({ r }) => r.tongHua.type === "无");
    expect(none.length).toBeGreaterThan(0);
    for (const { r } of none) expect(r.tongHua.active).toBe(false);
  });
});

describe("五运六气：运气相临五类（《素问·六微旨大论》）", () => {
  it("顺逆三值俱现——修前 shunNi 恒为「平」", () => {
    const set = new Set(ALL.map(({ r }) => r.yunQiRelation.shunNi));
    expect([...set].sort().join("/")).toBe(["顺", "逆", "平"].sort().join("/"));
  });

  it("运气同气者必为「平」，且与天符类同化一致", () => {
    for (const { r } of ALL) {
      const same = r.yunQiRelation.relation.startsWith("天符");
      const isTianFuFamily = r.tongHua.type === "天符" || r.tongHua.type === "太乙天符";
      expect(`${r.basicInfo.nianGanZhi}:${same}`).toBe(`${r.basicInfo.nianGanZhi}:${isTianFuFamily}`);
      if (same) expect(r.yunQiRelation.shunNi).toBe("平");
    }
  });

  it("五类名目齐备且互斥", () => {
    const kinds = new Set(ALL.map(({ r }) => r.yunQiRelation.relation));
    expect([...kinds].sort().join(" ")).toBe(
      ["顺化（气生运）", "天符（运气同化）", "小逆（运生运气）", "不和（运克气）", "天刑（气克运）"].sort().join(" "),
    );
  });
});

describe("五运六气：抽样实盘", () => {
  it("2024 甲辰：岁运土太过、司天太阳寒水、在泉太阴湿土", () => {
    const r = calculateWuYunLiuQi({ year: 2024 }) as any;
    expect(r.basicInfo.nianGanZhi).toBe("甲辰");
    expect(`${r.daYun.suiYun}${r.daYun.yunState}`).toBe("土运太过");
    expect(r.liuQi.siTian).toBe("太阳寒水");
    expect(r.liuQi.zaiQuan).toBe("太阴湿土");
    // 甲年土运太过，土居主运第三步 → 三运太宫，前后相间
    expect(r.daYun.zhuYun).toEqual([
      "太角·木运太过", "少徵·火运不及", "太宫·土运太过", "少商·金运不及", "太羽·水运太过",
    ]);
    // 客运以岁运为初运，相生轮转、太少交替
    expect(r.daYun.keYun).toEqual([
      "土运太过", "金运不及", "水运太过", "木运不及", "火运太过",
    ]);
    // 司天太阳寒水居三之气，前推两位起初之气
    expect(r.liuQi.keQi.map((k: any) => k.qi)).toEqual([
      "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土",
    ]);
  });

  it("病候六步的主气取固定序、客气取推算序，二者不得串位", () => {
    const r = calculateWuYunLiuQi({ year: 2024 }) as any;
    expect(r.bingHou.map((b: any) => b.zhuQi)).toEqual(r.liuQi.zhuQi.map((q: any) => q.qi));
    expect(r.bingHou.map((b: any) => b.keQi)).toEqual(r.liuQi.keQi.map((q: any) => q.qi));
  });
});
