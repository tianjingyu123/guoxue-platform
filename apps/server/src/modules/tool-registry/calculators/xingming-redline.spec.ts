import { calculateXingmingJiexi } from "./xingming-jiexi.calculator";
import { calculateWuGe } from "./wuge.calculator";
import { calculateSanCaiWuGe } from "./sancai-wuge.calculator";
import { SHU_LI_81, DISPUTED_SHU_LI, isDisputedShuLi } from "./xingming-data";

/**
 * 姓名学红线与五格一致性（2026-09-19，接续文档 §2.94）
 *
 * ══ 为什么姓名学这块红线最重 ══
 *
 * 决策人定过：**不得预言生死、寿命、绝症**。
 * 姓名学的主要使用场景是**给婴儿取名**——用笔画数告诉家长孩子会夭折，
 * 是这条红线里最重的一种，而且对方往往正处在最愿意相信的时候。
 *
 * ══ 处理原则：不是把凶数改成吉数 ══
 *
 * 典籍的归类（吉/半吉/凶/大凶）照旧保留，传统意象（破家、非命、残菊逢霜）也保留——
 * 那是这门术自己的语言，抹掉就成了另一套东西。
 * 改的只有一类：**把生死寿命当作事实陈述的句子**。
 *
 * 已改：数理20「破家亡身」→「古称破家之数，主家缘单薄」；
 * 数理34 事业提示「短命」→「多阻难成」；所有 `jianKang:"大凶"`→「宜多留意」
 * （健康栏直接写「大凶」等于下病危判断，而笔画数给不出这个结论）。
 *
 * 未改：「多病」「衰弱」「凄凉」「漂泊」「败落」等程度提示，
 * 以及八星名中的「绝命」——那是方位名不是断语。
 */

/** 把生死寿命当事实说的词 */
const DEATH_WORDS = ["夭折", "短命", "亡身", "早夭", "丧命", "凶死", "毙", "殒命", "绝症", "癌"];
/** 健康栏不得直接下重判 */
const HEALTH_VERDICTS = ["大凶"];

describe("姓名学红线：八十一数理不得预言生死", () => {
  it("数理表中无生死断言", () => {
    const hit: string[] = [];
    SHU_LI_81.forEach((x: any, i: number) => {
      const text = [x?.name, x?.meaning, x?.poem, x?.hints?.jiYe, x?.hints?.jiaTing, x?.hints?.jianKang]
        .filter(Boolean).join("｜");
      for (const w of DEATH_WORDS) if (text.includes(w)) hit.push(`数理${i + 1} 含「${w}」：${text.slice(0, 40)}`);
    });
    expect(`命中=${hit.join(" / ")}`).toBe("命中=");
  });

  it("健康栏不得直接写「大凶」（笔画数给不出病危判断）", () => {
    const hit = SHU_LI_81
      .map((x: any, i: number) => ({ i: i + 1, v: x?.hints?.jianKang }))
      .filter((x) => HEALTH_VERDICTS.includes(x.v))
      .map((x) => `数理${x.i}`);
    expect(`命中=${hit.join(",")}`).toBe("命中=");
  });

  it("凶数仍保留凶的归类——不是把凶改成吉（否则就成了另一套东西）", () => {
    const kinds = new Set(SHU_LI_81.map((x: any) => x?.jiXiong));
    expect([...kinds].sort().join("/")).toContain("大凶");
    const daXiong = SHU_LI_81.filter((x: any) => x?.jiXiong === "大凶").length;
    expect(daXiong).toBeGreaterThan(0);
  });

  it("传统意象保留（破家、非命这类名目仍在）", () => {
    const names = SHU_LI_81.map((x: any) => x?.name).join(" ");
    expect(names).toContain("破家之数");
    expect(names).toContain("非命之数");
  });

  it("整份计算输出里同样不得出现生死断言", () => {
    for (const [s, g] of [["张", "三"], ["李", "小明"], ["王", "建国"], ["欧阳", "修"]] as const) {
      const json = JSON.stringify(calculateXingmingJiexi({ surname: s, givenName: g }));
      for (const w of DEATH_WORDS) {
        expect(`${s}${g} 含「${w}」=${json.includes(w)}`).toBe(`${s}${g} 含「${w}」=false`);
      }
    }
  });
});

describe("姓名学：三个计算器五格必须一致（合并后防再分叉）", () => {
  const pick = (r: any): string => {
    const m: Record<string, number> = {};
    for (const d of r.geDetails ?? r.wuGe ?? []) m[d.name] = d.number ?? d.strokes;
    return `${m["天格"]}/${m["人格"]}/${m["地格"]}/${m["外格"]}/${m["总格"]}`;
  };

  /** 四种情形各取样本：单姓单名、单姓双名、复姓单名、复姓双名、三字名 */
  const CASES: [string, string][] = [
    ["张", "三"], ["李", "小明"], ["王", "建国"], ["刘", "德华"],
    ["欧阳", "修"], ["司马", "相如"], ["诸葛", "孔明"],
  ];

  it.each(CASES)("%s%s —— 三个计算器结论相同", (sur, giv) => {
    const a = pick(calculateXingmingJiexi({ surname: sur, givenName: giv }));
    const b = pick(calculateWuGe({ surname: sur, givenName: giv }));
    const c = pick(calculateSanCaiWuGe({ surname: sur, givenName: giv }));
    expect(`wuge=${b}`).toBe(`wuge=${a}`);
    expect(`sancai=${c}`).toBe(`sancai=${a}`);
  });

  /**
   * 合并前三份实现的毛病：前两份 `人格 = 姓总 + 名总`，与总格同式，
   * 于是 `人格 ≡ 总格`、`外格 ≡ 1` 恒成立，**只有单姓单名算对**。
   * 下面两条就是当年的证伪点，留着防回归。
   */
  it("人格 ≠ 总格（除单姓单名外）", () => {
    for (const [sur, giv] of CASES) {
      if (sur.length === 1 && giv.length === 1) continue;
      const m: Record<string, number> = {};
      for (const d of (calculateXingmingJiexi({ surname: sur, givenName: giv }) as any).geDetails) m[d.name] = d.number;
      expect(`${sur}${giv} 人格≠总格=${m["人格"] !== m["总格"]}`).toBe(`${sur}${giv} 人格≠总格=true`);
    }
  });

  // 2026-09-20：单姓单名的外格已由 1 改为 2（见下方说明），本条判的是「不恒为同一个值」，不受影响
  it("外格不恒为同一个值（四种形态各不相同）", () => {
    const wai = CASES.map(([sur, giv]) => {
      const m: Record<string, number> = {};
      for (const d of (calculateXingmingJiexi({ surname: sur, givenName: giv }) as any).geDetails) m[d.name] = d.number;
      return m["外格"];
    });
    expect(`不同取值数=${new Set(wai).size > 1}`).toBe("不同取值数=true");
  });

  it("复姓天格不加 1（「假添一数」只在单姓时加）", () => {
    const m: Record<string, number> = {};
    const r = calculateXingmingJiexi({ surname: "欧阳", givenName: "修" }) as any;
    for (const d of r.geDetails) m[d.name] = d.number;
    const surSum = r.strokes.slice(0, 2).reduce((a: number, x: any) => a + x.kangXiStroke, 0);
    expect(`欧阳 天格=${m["天格"]} 姓和=${surSum}`).toBe(`欧阳 天格=${surSum} 姓和=${surSum}`);
  });
});

/**
 * ══ 旧版 App 实测锚点（2026-09-19，desktop-44 采自「姓名详解」页）══
 *
 * 这是姓名学这块**唯一的外部基准**，一条就同时钉死三件事：
 * 五格公式、康熙笔画表、三才五行。
 *
 * 「张识华」旧版实测：天12(木) 地33(火) 人30(水) 外15(土) 总44(火)，三才 木水火。
 * 康熙笔画 張11 識19 華14，逐项对标准公式（单姓双名）：
 *   天格 11+1=12、人格 11+19=30、地格 19+14=33、外格 14+1=15、总格 11+19+14=44。
 *
 * **这一条就足以否掉那个码点兜底**——按 `(code-0x4e00)/1200+3` 算张得 7 画，
 * 天格会是 8 而不是 12，一眼就差出来。
 */
describe("姓名学：旧版实测锚点（外部基准）", () => {
  it("张识华 五格与五行 10/10 与旧版一致", () => {
    const r = calculateXingmingJiexi({ surname: "张", givenName: "识华" }) as any;
    const got: Record<string, string> = {};
    for (const d of r.geDetails) got[d.name] = `${d.number}${d.wuXing}`;
    expect(got["天格"]).toBe("12木");
    expect(got["地格"]).toBe("33火");
    expect(got["人格"]).toBe("30水");
    expect(got["外格"]).toBe("15土");
    expect(got["总格"]).toBe("44火");
  });

  it("三才配置与旧版一致（木水火）", () => {
    const r = calculateXingmingJiexi({ surname: "张", givenName: "识华" }) as any;
    expect(r.sanCai?.combo).toBe("木水火");
  });

  /**
   * ══ 2026-09-20 追加：拿到了单姓单名与复姓双名的**旧版实测** ══
   *
   * 决策人开通了会员账号，旧版「姓名解析」整页可见，于是补采了三组。
   * 这组样本**决定性地**解决了外格之争：
   *
   * | 姓名 | 形态 | 旧版实测外格 | 旧式(总−人+1) | 新式(姓首+名末) |
   * |---|---|---|---|---|
   * | 张三 | 单姓单名 | **2** | 1 ✗ | 2 ✓ |
   * | 陈三 | 单姓单名 | **2** | 1 ✗ | 2 ✓ |
   * | 欧阳锋华 | 复姓双名 | **26** | 27 ✗ | 26 ✓ |
   * | 张识华 | 单姓双名 | 15 | 15 ✓ | 15 ✓（两式同值，无判别力） |
   *
   * **旧式 0/3，新式 3/3。** 恒等式「天格+地格 = 人格+外格」在旧版四组里 4/4 成立。
   *
   * 另：陈三给出 天格17 → **陳 = 16**，与我们的康熙表一致，
   * 说明「阝」按阜部 8 画还原这一点两边相同。
   */
  it("张三 五格（旧版实测，2026-09-20 会员账号采）", () => {
    const r = calculateXingmingJiexi({ surname: "张", givenName: "三" }) as any;
    const got: Record<string, number> = {};
    for (const d of r.geDetails) got[d.name] = d.number;
    expect(`${got["天格"]}/${got["人格"]}/${got["地格"]}/${got["外格"]}/${got["总格"]}`).toBe("12/14/4/2/14");
    expect(got["天格"] + got["地格"]).toBe(got["人格"] + got["外格"]);
  });

  it("陈三 五格（旧版实测；顺带钉死 陳=16，阝按阜8画还原）", () => {
    const r = calculateXingmingJiexi({ surname: "陈", givenName: "三" }) as any;
    const got: Record<string, number> = {};
    for (const d of r.geDetails) got[d.name] = d.number;
    expect(`${got["天格"]}/${got["人格"]}/${got["地格"]}/${got["外格"]}/${got["总格"]}`).toBe("17/19/4/2/19");
    expect(got["天格"] + got["地格"]).toBe(got["人格"] + got["外格"]);
  });

  /**
   * ══ 2026-09-20 追加取样：旧版「阝」旁笔画**自身三处不一致**，此处不跟旧版 ══
   *
   * 起因是复姓样本对不上：旧版 欧阳锋华 姓总 **27**，我们 歐15+陽17=**32**。
   * 名「锋华」两边都是 15+14=29，所以分歧只在「欧」或「阳」一个字上。
   * 于是各补了一个单姓单名样本定位：
   *
   * | 样本 | 旧版天格 | 推出该字笔画 | 我们 | 阝 计为 |
   * |---|---|---|---|---|
   * | 陈三 | 17 | 陳 = **16** | 16 ✓ | 8（阜，一致） |
   * | 欧三 | 16 | 歐 = **15** | 15 ✓ | —— |
   * | 阳三 | 10 | 陽 = **9** | 17 ✗ | **0（整个丢了）** |
   * | 欧阳锋华 | 27 | 陽 = 27−15 = **12** | 17 ✗ | **3（字形）** |
   *
   * **同一个「陽」，旧版给出 9（单用）与 12（复姓内）两个值，而它自己在「陳」上用的是阜 8 画。**
   * 三处互相矛盾，说明是旧版的数据问题，不是口径之争。
   * 我们的 陽=17 与旧版自己在「陳」上的规则一致，**保持不变**。
   * （页面确实显示繁体【陽】，所以不是没做繁体转换。）
   *
   * 教训：外部基准对上了要采信，**对不上先看它自不自洽**——
   * 这次若盲从旧版改 陽，就会与我们（和旧版）在「陳」上的规则打架。
   */
  it("欧三 五格（旧版实测；钉死 歐=15）", () => {
    const r = calculateXingmingJiexi({ surname: "欧", givenName: "三" }) as any;
    const got: Record<string, number> = {};
    for (const d of r.geDetails) got[d.name] = d.number;
    expect(`${got["天格"]}/${got["人格"]}/${got["地格"]}/${got["外格"]}/${got["总格"]}`).toBe("16/18/4/2/18");
    expect(got["天格"] + got["地格"]).toBe(got["人格"] + got["外格"]);
  });

  it("阳三：我们取 陽=17（阝按阜8还原），**刻意不跟**旧版的 9", () => {
    const r = calculateXingmingJiexi({ surname: "阳", givenName: "三" }) as any;
    const got: Record<string, number> = {};
    for (const d of r.geDetails) got[d.name] = d.number;
    // 我们：天格 = 陽17 + 1 = 18（旧版给 10，即 陽=9，与它自己的 陳=16 矛盾）
    expect(got["天格"]).toBe(18);
    expect(got["天格"] + got["地格"]).toBe(got["人格"] + got["外格"]);
  });
});

describe("姓名学：笔画必须来自康熙表，不得臆测", () => {
  it("常见姓氏取康熙笔画（张11、刘15、陈16，非简体）", () => {
    const strokeOf = (c: string) =>
      (calculateXingmingJiexi({ surname: c, givenName: "一" }) as any).strokes[0].kangXiStroke;
    // 修前这三个分别得 7（码点兜底）、4（码点兜底）、11（表内存的是简体）
    expect(`张=${strokeOf("张")}`).toBe("张=11");
    expect(`刘=${strokeOf("刘")}`).toBe("刘=15");
    expect(`陈=${strokeOf("陈")}`).toBe("陈=16");
  });

  it("未收录的字直接抛错，不返回臆测值", () => {
    // 𠮷（U+20BB7）不在康熙表内；修前会由码点算出一个 1–24 的数
    expect(() => calculateXingmingJiexi({ surname: "\u{20BB7}", givenName: "三" })).toThrow(/未收录/);
  });
});

/**
 * ══ 八十一数理：出处、争议数、标签一致性 ══（2026-09-19）
 *
 * 决策人经前端窗口拍板三条：
 * ① 基准取熊崎健翁原版，报告中注明出处；
 * ② 各家判定有异的数（26/27/28/43）显式标注，不静默取舍；
 * ③ **吉凶标签必须与正文一致**——旧版有「正文尽是负面、结尾标(大吉)」的条目，绝不照抄。
 */
describe("八十一数理：标签与正文一致（硬约束）", () => {
  const NEG = /凶|不吉|败|衰|破|困|苦|难|灾|祸|厄|病|孤|寡|零落|无成|不成|多舛|艰|险|波折|失|损|退|讼|薄|弱|愁|悲/g;
  const POS = /大吉|昌|盛|荣|富|贵|亨|顺|兴|达|福|禄|寿|安|康|良|美|善|和|通|旺|济美|超群/g;

  it("81 条无一出现「标吉而正文负」或「标凶而正文正」", () => {
    const bad: string[] = [];
    SHU_LI_81.forEach((x: any, i: number) => {
      const t = `${x.meaning}${x.poem}${x.hints.jiYe}${x.hints.jiaTing}`;
      // 先剥掉否定短语，免得「一事无成」里的「成」被当成正面词
      const t2 = t.replace(/[不无难未莫勿][^，。；]{0,2}/g, "");
      const neg = (t.match(NEG) ?? []).length;
      const pos = (t2.match(POS) ?? []).length;
      if ((x.jiXiong === "大吉" || x.jiXiong === "吉") && neg > pos + 1) bad.push(`数理${i + 1}标吉而正文负`);
      if ((x.jiXiong === "大凶" || x.jiXiong === "凶") && pos > neg + 1) bad.push(`数理${i + 1}标凶而正文正`);
    });
    expect(`不一致=${bad.join(" ")}`).toBe("不一致=");
  });
});

describe("八十一数理：争议数显式标注", () => {
  it("26/27/28/43 列为争议数并各带异说说明", () => {
    for (const n of [26, 27, 28, 43]) {
      expect(`数理${n} 已标注=${isDisputedShuLi(n)}`).toBe(`数理${n} 已标注=true`);
      expect(DISPUTED_SHU_LI[n].note).toMatch(/一说/);
    }
  });

  it("标注的取值须与表内实际判定一致（防两处说法打架）", () => {
    for (const [n, d] of Object.entries(DISPUTED_SHU_LI)) {
      const actual = (SHU_LI_81[Number(n) - 1] as any).jiXiong;
      expect(`数理${n} 表内=${actual} 标注=${d.taken}`).toBe(`数理${n} 表内=${actual} 标注=${actual}`);
    }
  });

  it("非争议数不得被误标", () => {
    for (const n of [1, 3, 5, 13, 21, 81]) expect(isDisputedShuLi(n)).toBe(false);
  });
});
