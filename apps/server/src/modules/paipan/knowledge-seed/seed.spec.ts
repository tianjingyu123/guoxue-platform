import { REPORT_KNOWLEDGE_SEEDS, seedCountByType } from "./index";
import { GUA64_SEEDS, GUA64_NAMES } from "./gua64";
import { QIMEN_GONG_KEYS, LIUREN_CHU_ZHIS } from "./qimen-liuren-ext";
import { PaipanReportKnowledgeSeeder } from "../paipan-report-knowledge-seeder.service";
import { PaipanReportKnowledgeService } from "../paipan-report-knowledge.service";
import { liuyaoSignals } from "../liuyao-report";
import { meihuaSignals } from "../meihua-report";
import { qimenSignals } from "../qimen-report";
import { daliurenSignals } from "../daliuren-report";
import { ziweiSignals } from "../ziwei-report";

/**
 * 种子的价值全在「能不能被检索到」：
 * 报告按 `tags hasSome signals.value` 精确命中，tags 与 signals 差一个字，条目就永远是死条目。
 * 因此这里不只检查条目写没写，更要把真实 signals 拿来对一遍。
 */
const TOOLS = ["bazi", "ziwei", "liuyao", "meihua", "qimen", "daliuren"];

describe("报告知识库种子", () => {
  it("六个工具都有条目：不让任何一个工具的报告没有依据可引", () => {
    const byType = seedCountByType();
    for (const t of TOOLS) {
      expect(byType[t] ?? 0).toBeGreaterThan(10);
    }
  });

  it("条目自身完整：标题、正文、标签、主题一个都不能少", () => {
    for (const s of REPORT_KNOWLEDGE_SEEDS) {
      expect(s.title.trim()).not.toBe("");
      expect(s.topic.trim()).not.toBe("");
      expect(s.tags.length).toBeGreaterThan(0);
      expect(s.tags.every((t) => t.trim() !== "")).toBe(true);
      // 正文太短就等于没有依据，反而拖累报告
      expect(s.content.length).toBeGreaterThan(60);
    }
  });

  it("同一工具内标题不重复：seeder 按 (paipanType, title) 幂等，重名会互相吞掉", () => {
    const seen = new Set<string>();
    for (const s of REPORT_KNOWLEDGE_SEEDS) {
      const key = `${s.paipanType}::${s.title}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("非古籍条目一律按重述入库，不可标为可引用原文", () => {
    for (const s of REPORT_KNOWLEDGE_SEEDS) {
      if (s.kind !== "classic_excerpt") {
        // 重述的知识要点不得冒充某本书的原文
        expect(s.bookTitle).toBeUndefined();
        expect(s.sourceRefs?.length ?? 0).toBeGreaterThan(0); // 来源线索要留痕，供审核追溯
      }
    }
  });

  it("正文只用中文与常见标点：混进外文字符说明是笔误", () => {
    const bad = REPORT_KNOWLEDGE_SEEDS.filter((s) => /[a-zA-Zа-яА-Я]/.test(s.content + s.title));
    expect(bad.map((s) => `${s.paipanType}/${s.title}`)).toEqual([]);
  });

  // ── tags 与真实 signals 对齐：差一个字就是死条目 ──

  it("六爻：六亲持世、八宫、静卦、动爻的 tag 与 signals 对得上", () => {
    const facts: any = {
      shiLiuqin: "妻财",
      benGua: "乾为天(乾)",
      palace: "乾",
      isStatic: true,
      movingLines: ["初爻 官鬼发动"],
      keyNotes: [],
    };
    const values = liuyaoSignals(facts).map((s) => s.value);
    expect(values).toContain("妻财持世");
    expect(values).toContain("乾宫");
    expect(values).toContain("静卦");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "liuyao").flatMap((s) => s.tags));
    for (const v of ["妻财持世", "乾宫", "静卦"]) expect(tags.has(v)).toBe(true);
    for (const liuqin of ["父母", "兄弟", "官鬼", "妻财", "子孙"]) {
      expect(tags.has(`${liuqin}持世`)).toBe(true);
      expect(tags.has(`${liuqin}发动`)).toBe(true);
    }
  });

  it("梅花：体用关系、体卦、用卦的 tag 与 signals 对得上", () => {
    const facts: any = { relation: "体克用", benGua: "天风姤", tiName: "乾", yongName: "巽", bianGua: "", huGua: "", benPalace: "乾" };
    const values = meihuaSignals(facts).map((s) => s.value);
    expect(values).toContain("体克用");
    expect(values).toContain("体乾");
    expect(values).toContain("用巽");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "meihua").flatMap((s) => s.tags));
    for (const r of ["体克用", "用克体", "体生用", "用生体", "体用比和"]) expect(tags.has(r)).toBe(true);
    for (const g of ["乾", "坤", "震", "巽", "坎", "离", "艮", "兑"]) {
      expect(tags.has(`体${g}`)).toBe(true);
      expect(tags.has(`用${g}`)).toBe(true);
    }
  });

  it("奇门：值符星、值使门、阴阳遁的 tag 与 signals 对得上", () => {
    const facts: any = { zhifuStar: "天禽", zhishiMen: "死门", ju: "阴遁9局", isYang: false, yuan: "上元" };
    const values = qimenSignals(facts).map((s) => s.value);
    expect(values).toContain("天禽");
    expect(values).toContain("死门");
    expect(values).toContain("阴遁");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "qimen").flatMap((s) => s.tags));
    for (const m of ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"]) expect(tags.has(m)).toBe(true);
    for (const x of ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心", "天禽"]) expect(tags.has(x)).toBe(true);
    for (const y of ["阳遁", "阴遁", "上元", "中元", "下元"]) expect(tags.has(y)).toBe(true);
  });

  it("六壬：课体、天将、昼夜贵的 tag 与 signals 对得上", () => {
    const facts: any = { zongMen: "元首课", chuTianJiang: "贵人", chuChuan: "寅", yueJiang: "登明（亥）", dayNight: "昼", keti: [] };
    const values = daliurenSignals(facts).map((s) => s.value);
    expect(values).toContain("元首课");
    expect(values).toContain("贵人");
    expect(values).toContain("登明");
    expect(values).toContain("昼贵");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "daliuren").flatMap((s) => s.tags));
    for (const k of ["元首课", "重审课", "知一课", "涉害课", "遥克课", "昴星课", "别责课", "八专课", "伏吟课"]) {
      expect(tags.has(k)).toBe(true);
    }
    for (const j of ["贵人", "螣蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"]) {
      expect(tags.has(j)).toBe(true);
    }
    for (const b of ["昼贵", "夜贵", "登明"]) expect(tags.has(b)).toBe(true);
  });

  it("紫微：命宫主星、格局、五行局、无主星的 tag 与 signals 对得上", () => {
    const facts: any = {
      mingMainStars: ["武曲", "七杀"],
      mingNoMainStar: false,
      geShi: ["杀破狼"],
      wuXingJu: "水二局",
      huaJiStar: "天同",
      shenGong: "夫妻",
    };
    const values = ziweiSignals(facts).map((s) => s.value);
    expect(values).toContain("武曲");
    expect(values).toContain("杀破狼");
    expect(values).toContain("水二局");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "ziwei").flatMap((s) => s.tags));
    const MAIN = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
    for (const m of MAIN) expect(tags.has(m)).toBe(true);
    for (const j of ["水二局", "木三局", "金四局", "土五局", "火六局"]) expect(tags.has(j)).toBe(true);
    expect(tags.has("命无主星")).toBe(true);
    // 命宫无主星时借对宫，这条必须检索得到，否则那类盘就没有依据可引
    const noMain = ziweiSignals({ ...facts, mingMainStars: [], mingNoMainStar: true } as any).map((s) => s.value);
    expect(noMain).toContain("命无主星");
  });

  it("八字：格局（含带强弱后缀的变格）、日主、月令、用神的 tag 与 signals 对得上", () => {
    const svc = new PaipanReportKnowledgeService({} as any);
    const values = svc
      .baziSignals({ geJu: "建禄格（偏旺）", yongShen: "金(克)", dayGan: "甲", monthZhi: "寅", shenShaNames: ["天乙贵人"] })
      .map((s) => s.value);
    expect(values).toContain("建禄格（偏旺）");
    expect(values).toContain("用神金(克)");
    expect(values).toContain("甲");
    expect(values).toContain("寅月");
    expect(values).toContain("天乙贵人");

    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "bazi").flatMap((s) => s.tags));
    for (const v of values) expect(tags.has(v)).toBe(true);
    // 变格名带强弱后缀，五种都要能检索到
    for (const lv of ["极旺", "偏旺", "中和", "偏弱", "极弱"]) {
      expect(tags.has(`建禄格（${lv}）`)).toBe(true);
      expect(tags.has(`阳刃格（${lv}）`)).toBe(true);
    }
    for (const g of ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]) expect(tags.has(g)).toBe(true);
  });
});

describe("报告知识种子入库", () => {
  function setup(existing: string[] = []) {
    const created: any[] = [];
    const prisma: any = {
      paipanReportKnowledge: {
        findFirst: jest.fn(async ({ where }: any) => (existing.includes(where.title) ? { id: "x" } : null)),
        create: jest.fn(async ({ data }: any) => {
          created.push(data);
          return { id: `k${created.length}`, ...data };
        }),
      },
    };
    return { svc: new PaipanReportKnowledgeSeeder(prisma), prisma, created };
  }

  it("入库即可被报告引用（APPROVED），并标明来源与重述口径", async () => {
    const { svc, created } = setup();
    const r = await svc.seed([
      {
        paipanType: "liuyao",
        kind: "school_theory",
        topic: "世应",
        tags: ["妻财持世"],
        title: "测试条目",
        content: "正文".repeat(40),
        sourceRefs: [{ label: "通行说法" }],
      },
    ]);

    expect(r.created).toBe(1);
    expect(created[0].status).toBe("APPROVED"); // DRAFT 的条目报告引用不到
    expect(created[0].restated).toBe(true);
    expect(created[0].quotable).toBe(false); // 不是公版古籍白文，不能当原文展示
    expect(created[0].createdBy).toBe("platform-seed");
  });

  it("已有同名条目不覆盖：后台改过的内容优先于种子", async () => {
    const { svc, prisma } = setup(["已存在的条目"]);
    const r = await svc.seed([
      { paipanType: "bazi", kind: "school_theory", topic: "格局", tags: ["偏财格"], title: "已存在的条目", content: "x".repeat(70) },
    ]);
    expect(r.created).toBe(0);
    expect(r.skipped).toBe(1);
    expect(prisma.paipanReportKnowledge.create).not.toHaveBeenCalled();
  });

  it("公版古籍白文才可作为原文展示", async () => {
    const { svc, created } = setup();
    await svc.seed([
      {
        paipanType: "bazi",
        kind: "classic_excerpt",
        topic: "日主",
        tags: ["甲"],
        title: "古籍条目",
        content: "原文".repeat(40),
        bookTitle: "《滴天髓》",
        sourceKind: "classic_public",
      },
    ]);
    expect(created[0].quotable).toBe(true);
    expect(created[0].restated).toBe(false);
  });
});

/**
 * 六十四卦条目的命门在卦名：与引擎的卦名表差一个字，整条就永远检索不到。
 * 这里直接拿引擎的表来逐字核对——人工比对 64 个名字是靠不住的。
 */
describe("六十四卦条目", () => {
  const GUA_NAMES: string[][] = [
    ["乾为天", "天泽履", "天火同人", "天雷无妄", "天风姤", "天水讼", "天山遁", "天地否"],
    ["泽天夬", "兑为泽", "泽火革", "泽雷随", "泽风大过", "泽水困", "泽山咸", "泽地萃"],
    ["火天大有", "火泽睽", "离为火", "火雷噬嗑", "火风鼎", "火水未济", "火山旅", "火地晋"],
    ["雷天大壮", "雷泽归妹", "雷火丰", "震为雷", "雷风恒", "雷水解", "雷山小过", "雷地豫"],
    ["风天小畜", "风泽中孚", "风火家人", "风雷益", "巽为风", "风水涣", "风山渐", "风地观"],
    ["水天需", "水泽节", "水火既济", "水雷屯", "水风井", "坎为水", "水山蹇", "水地比"],
    ["山天大畜", "山泽损", "山火贲", "山雷颐", "山风蛊", "山水蒙", "艮为山", "山地剥"],
    ["地天泰", "地泽临", "地火明夷", "地雷复", "地风升", "地水师", "地山谦", "坤为地"],
  ];

  it("六十四卦一个不少，卦名与引擎表逐字一致", () => {
    const engine = new Set(GUA_NAMES.flat());
    expect(engine.size).toBe(64);
    expect(new Set(GUA64_NAMES).size).toBe(64);
    // 两个方向都要查：漏写会少条目，写错会多出一个永远命中不了的名字
    expect(GUA64_NAMES.filter((n) => !engine.has(n))).toEqual([]);
    expect([...engine].filter((n) => !GUA64_NAMES.includes(n))).toEqual([]);
  });

  it("六爻与梅花各成一套，占断取向分开写", () => {
    const liuyao = GUA64_SEEDS.filter((s) => s.paipanType === "liuyao");
    const meihua = GUA64_SEEDS.filter((s) => s.paipanType === "meihua");
    expect(liuyao).toHaveLength(64);
    expect(meihua).toHaveLength(64);
    // 六爻讲用神世应，梅花讲体用取象——不能互相串
    expect(liuyao[0].content).toContain("用神");
    expect(meihua[0].content).toContain("体用");
    expect(meihua[0].content).toContain("互卦");
  });

  it("每卦只挂自己的卦名，避免一卦命中一片", () => {
    for (const s of GUA64_SEEDS) expect(s.tags).toHaveLength(1);
  });
});

/**
 * 奇门落宫与六壬初传：这两组条目的 tag 都来自引擎新产出的信号，
 * 与引擎对不上就是死条目——奇门宫位键尤其容易写错（引擎的 palaceKey 不带方位括号）。
 */
describe("奇门落宫与六壬初传条目", () => {
  it("奇门九宫齐全，宫位键与引擎 signals 产出一致", () => {
    expect(QIMEN_GONG_KEYS).toHaveLength(9);
    const facts: any = {
      zhifuStar: "天禽", zhishiMen: "死门", ju: "阴遁9局", isYang: false, yuan: "上元",
      zhifuGong: "坤2宫", zhishiGong: "离9宫",
    };
    const values = qimenSignals(facts).map((s) => s.value);
    expect(values).toContain("坤2宫"); // 落宫已成为检索信号
    expect(values).toContain("离9宫");
    // 信号里的宫位键必须能在条目 tags 里找到
    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "qimen").flatMap((s) => s.tags));
    for (const k of QIMEN_GONG_KEYS) expect(tags.has(k)).toBe(true);
    // 宫位键不带方位括号，带了就与引擎对不上
    for (const k of QIMEN_GONG_KEYS) expect(k).not.toMatch(/[（(]/);
  });

  it("六壬十二地支初传条目齐全，与 signals 的初传值对得上", () => {
    expect(LIUREN_CHU_ZHIS).toHaveLength(12);
    const facts: any = { zongMen: "涉害", chuTianJiang: "贵人", chuChuan: "寅", yueJiang: "登明（亥）", dayNight: "昼", keti: [] };
    expect(daliurenSignals(facts).map((s) => s.value)).toContain("寅");
    const tags = new Set(REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === "daliuren").flatMap((s) => s.tags));
    for (const z of LIUREN_CHU_ZHIS) expect(tags.has(z)).toBe(true);
  });

  it("两个工具的条目数补上来了：不再只有骨架", () => {
    const by = seedCountByType();
    expect(by.qimen).toBeGreaterThan(50);
    expect(by.daliuren).toBeGreaterThan(50);
  });
});

/**
 * 「这一盘我们怎么看」这一节，是决策人对报告的核心要求落地的地方：
 * 「帮助用户在鱼龙混杂的各门派知识和观点中梳理出一条主线，要让用户有基本确定的结果」。
 * 它只在议题有 platform_line 时才出得来，议题太少则一份九节的报告里只有零星两处有主线。
 */
describe("观点对照的覆盖面", () => {
  const debates = REPORT_KNOWLEDGE_SEEDS.filter((s) => s.debateKey);
  const byTool = (t: string) => new Set(debates.filter((s) => s.paipanType === t).map((s) => s.debateKey));

  it("六个工具各自至少有三个议题：只有两处主线撑不起一份报告", () => {
    for (const t of TOOLS) expect(byTool(t).size).toBeGreaterThanOrEqual(3);
  });

  it("每个议题有且只有一条平台主线——没有就整节不出，多于一条则主线自相矛盾", () => {
    const lines: Record<string, number> = {};
    for (const s of debates) {
      lines[s.debateKey!] = (lines[s.debateKey!] ?? 0) + (s.stance === "platform_line" ? 1 : 0);
    }
    for (const [key, n] of Object.entries(lines)) expect([key, n]).toEqual([key, 1]);
  });

  it("同一议题的条目挂同一组 tag：挂不齐则命中时只来一半，对照就残了", () => {
    const byKey = new Map<string, Set<string>[]>();
    for (const s of debates) {
      if (!byKey.has(s.debateKey!)) byKey.set(s.debateKey!, []);
      byKey.get(s.debateKey!)!.push(new Set(s.tags));
    }
    for (const [key, sets] of byKey) {
      const first = [...sets[0]].sort().join(",");
      for (const s of sets) expect([key, [...s].sort().join(",")]).toEqual([key, first]);
    }
  });

  it("平台主线要给确定说法，不能把选择甩回给用户", () => {
    const dodging = /你自行判断|自己判断|仅供参考，请自行|不替你做主|各有道理，看你/;
    for (const s of debates.filter((x) => x.stance === "platform_line")) {
      expect([s.debateKey, dodging.test(s.content)]).toEqual([s.debateKey, false]);
    }
  });

  it("排盘参数可选的两个议题，主线要说「按你选的那一种」而不是把默认值说成唯一正确", () => {
    // 奇门定局法与六壬换将法是用户在排盘页能选的：选得不同，盘本身就不同
    for (const key of ["qimen:定局法:拆补置闰", "daliuren:月将:中气还是交节"]) {
      const line = debates.find((s) => s.debateKey === key && s.stance === "platform_line")!;
      expect(line).toBeDefined();
      expect(line.content).toContain("你排盘时选定");
    }
  });
});

/**
 * 决策人 2026-09-18：「互联网上主流观点也要考虑参考。」
 *
 * 网上的说法影响面最大——多数人最先接触到的就是它——但往往只有口诀没有条件。
 * 六个工具都得有这么一条，用户才能看到「网上一般这么说」与本报告结论的差别在哪、为什么。
 */
describe("互联网通行讲法", () => {
  it("六个工具都摆出了网上的说法", () => {
    for (const t of TOOLS) {
      const webs = REPORT_KNOWLEDGE_SEEDS.filter((s) => s.paipanType === t && s.sourceKind === "web");
      expect([t, webs.length > 0]).toEqual([t, true]);
    }
  });

  /**
   * 这里只验结构，不验语义。
   *
   * 「有没有说清它为什么不够用」是语义判断，试过关键词表和转折词两种正则，
   * 都会把写得好的条目判成不合格——「它的问题是遇到中和之局就失灵」
   * 既没有「但」也不在任何关键词表里，内容却恰恰点到了要害。
   * 与其让测试用猜的方式误报，不如只锁住能可靠检查的部分：
   * 标题统一（用户一眼认出这是网络说法）、篇幅够（不是一句口诀了事）。
   * 内容是否讲到位，属于人工评审的事。
   */
  it("网上讲法统一标题、篇幅够，不是一句口诀了事", () => {
    for (const s of REPORT_KNOWLEDGE_SEEDS.filter((x) => x.sourceKind === "web")) {
      expect([s.title, s.title.startsWith("网上一般这么说")]).toEqual([s.title, true]);
      expect([s.title, s.content.length > 120]).toEqual([s.title, true]);
    }
  });
});

/**
 * 决策人 2026-09-18：「盲派的理论也很有参考价值。」
 *
 * 核对时子平 47 条、盲派只有 5 条。盲派在民间的影响面不比子平小，
 * 而且它问的不是同一个问题——子平问日主力量够不够，盲派问这局在做什么功、成没成。
 * 两说都摆出来，用户才知道为什么找不同的师傅会听到不同的话。
 */
describe("盲派条目", () => {
  const mangpai = REPORT_KNOWLEDGE_SEEDS.filter((s) => s.school === "mangpai");

  it("条目数撑得起一个流派，不是点缀", () => {
    expect(mangpai.length).toBeGreaterThanOrEqual(15);
  });

  it("总纲类挂在十干上：每个盘都该看得到盲派怎么说", () => {
    const onGan = mangpai.filter((s) => s.tags.includes("甲"));
    expect(onGan.length).toBeGreaterThanOrEqual(4);
    // 十干要挂全，否则某些日主的盘看不到
    const tags = new Set(onGan.flatMap((s) => s.tags));
    for (const g of ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]) expect(tags.has(g)).toBe(true);
  });

  /**
   * 盲派主要靠师徒口传，公开出版物多是今人著作、受著作权保护，
   * 所以一律自己的话重述，不冒充古籍原文。
   * 这里不强求 sourceKind 统一成 oral——先写的几条标的是 platform_expert，
   * 两者都属「平台重述」，锁死具体取值只会逼人去改无关的老条目；
   * 真正要守住的是下面这条线：不是古籍摘录，就不能按原文展示。
   */
  it("盲派一律按重述入库，不冒充古籍原文", () => {
    for (const s of mangpai) {
      expect([s.title, s.kind]).toEqual([s.title, "school_theory"]);
      expect([s.title, s.sourceKind === "classic_public"]).toEqual([s.title, false]);
      expect([s.title, s.bookTitle]).toEqual([s.title, undefined]);
    }
  });
});
