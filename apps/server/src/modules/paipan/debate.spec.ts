import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";
import { PaipanReportService } from "./paipan-report.service";
import { DEBATE_SEEDS as B1 } from "./knowledge-seed/debates";
import { DEBATE_SEEDS_2 as B2 } from "./knowledge-seed/debates2";

/** 两批对照条目一起验：规则对两批同样生效 */
const DEBATE_SEEDS = [...B1, ...B2];

/**
 * 报告的定位（决策人 2026-09-18 两次强调）：
 * 各门派、各典籍以及网上的说法，要在一份报告里**汇总 + 梳理 + 给出主线**。
 * 用户不必自己去查哪本书怎么说，但看完更不能比看之前还纠结——
 * 「各家都摆出来，你自己判断」是这份报告最不该有的样子。
 *
 * 因此这里锁三条底线：
 * 1. 没有主线的议题一律不展示（宁可不谈，不制造困惑）
 * 2. 展示时结论在最前，其他说法降为「延伸了解」并写明不影响结论
 * 3. 对照关系由引擎拼装，不经模型（免得被揉成一段四平八稳的话，分歧糊掉）
 */
function hit(x: Partial<any> & { id: string }): any {
  return {
    kind: "school_theory",
    school: null,
    topic: "身弱财旺如何取用",
    title: "t",
    content: "内容".repeat(20),
    bookTitle: null,
    chapterTitle: null,
    classicBookId: null,
    classicChapterId: null,
    version: 1,
    score: 10,
    matchedOn: ["格局「偏财格」"],
    quotable: false,
    sourceKind: "platform_expert",
    debateKey: "bazi:身弱财旺:取用",
    stance: "mainstream",
    ...x,
  };
}

function svcWith(hits: any[]) {
  const knowledge = new PaipanReportKnowledgeService({} as any);
  const svc: any = new PaipanReportService({} as any, {} as any, knowledge, {} as any);
  svc.lastHits = hits;
  return { svc, knowledge };
}

const EVIDENCE = (ids: string[]) =>
  ids.map((refId, i) => ({ id: `E${i + 1}`, refId, kind: "school_theory", knowledgeVersion: 1, school: null, topic: "t", quotable: false, source: "通用理论", title: "t", excerpt: "x", matchedOn: [] })) as any[];

describe("观点对照：汇总各家，但必须给出主线", () => {
  it("有主线时：结论排在最前，其他说法降为延伸了解并写明不影响结论", () => {
    const hits = [
      hit({ id: "a", stance: "consensus", content: "各派都认财旺身弱担不动。" }),
      hit({ id: "b", stance: "mainstream", school: "ziping", content: "取印比帮身，先立己再求财。" }),
      hit({ id: "c", stance: "alternative", school: "mangpai", content: "只问做功，不问强弱。" }),
      hit({
        id: "d",
        stance: "platform_line",
        content: "本报告按子平扶抑立论：取印比为用，先立己后求财。因为这条线规则清晰、可复核。",
      }),
    ];
    const { svc, knowledge } = svcWith(hits);
    const sec = svc.buildDebateSection(knowledge.groupDebates(hits), EVIDENCE(["a", "b", "c", "d"]));

    expect(sec).toBeTruthy();
    expect(sec.title).toBe("这一盘我们怎么看");
    expect(sec.deterministic).toBe(true); // 对照关系不交给模型

    const body: string = sec.content;
    // 结论必须在其他说法之前出现——用户一眼看到的是「就按这个」
    const iLine = body.indexOf("▸ 结论：");
    const iAgreed = body.indexOf("各家都认的部分");
    const iOther = body.indexOf("延伸了解");
    expect(iLine).toBeGreaterThan(-1);
    expect(iAgreed).toBeGreaterThan(iLine); // 共识紧跟结论
    expect(iOther).toBeGreaterThan(iAgreed); // 其他说法排在最后
    expect(body).toContain("不影响上面的结论");
    // 结论只给那一句判断，不把整段理由塞进来；理由另起一行
    expect(body).toContain("▸ 结论：取印比为用，先立己后求财。");
    expect(body).toContain("为什么这么定：");
    // 门派要出中文名，不能漏内部标识
    expect(body).toContain("盲派");
    expect(body).not.toContain("mangpai");
    expect(body).not.toContain("ziping");
  });

  it("没有主线的议题一律不展示：宁可不谈，也不把几种说法丢给用户自己选", () => {
    const hits = [
      hit({ id: "a", stance: "mainstream", school: "ziping", content: "取印比帮身。" }),
      hit({ id: "b", stance: "alternative", school: "mangpai", content: "只问做功。" }),
    ];
    const { svc, knowledge } = svcWith(hits);
    expect(svc.buildDebateSection(knowledge.groupDebates(hits), EVIDENCE(["a", "b"]))).toBeNull();
  });

  it("只有一种说法时不算对照，不把共识说成争论", () => {
    const hits = [hit({ id: "a", stance: "platform_line", content: "本报告按这个讲。" })];
    const { knowledge } = svcWith(hits);
    expect(knowledge.groupDebates(hits)).toEqual([]);
  });

  it("网上的通行讲法也纳入对照，并如实标成「当代通行讲法」", () => {
    const hits = [
      hit({ id: "w", stance: "mainstream", sourceKind: "web", content: "网上常说财多身弱富屋贫人。" }),
      hit({ id: "d", stance: "platform_line", content: "本报告按子平扶抑立论。" }),
    ];
    const { svc, knowledge } = svcWith(hits);
    const sec = svc.buildDebateSection(knowledge.groupDebates(hits), EVIDENCE(["w", "d"]));
    expect(sec.content).toContain("当代通行讲法");
  });

  it("没有 debateKey 的条目不参与对照（它们只是单点知识）", () => {
    const hits = [hit({ id: "a", debateKey: null }), hit({ id: "b", debateKey: null, stance: "platform_line" })];
    const { knowledge } = svcWith(hits);
    expect(knowledge.groupDebates(hits)).toEqual([]);
  });

  it("不按门派过滤：各派说法都要取得到，否则无从对照", async () => {
    const knowledge = new PaipanReportKnowledgeService({} as any);
    const findMany = jest.fn(async (_args: any) => [] as any[]);
    (knowledge as any).prisma = { paipanReportKnowledge: { findMany } };
    await knowledge.findEvidence({ paipanType: "bazi", signals: [{ value: "偏财格", weight: 10, reason: "格局" }] });
    // where 里不该再有 school 条件——早先只取 school=null，把子平盲派全挡在了外面
    expect(JSON.stringify(findMany.mock.calls[0]?.[0]?.where)).not.toContain("school");
  });

  it("命中的议题整组进来，不被零散的单点条目挤掉（残缺的对照比没有更糟）", async () => {
    const knowledge = new PaipanReportKnowledgeService({} as any);
    const row = (id: string, extra: any) => ({
      id, kind: "school_theory", topic: "t", title: "t", content: "c", bookTitle: null, chapterTitle: null,
      classicBookId: null, classicChapterId: null, version: 1, sourceKind: "platform_expert",
      school: null, tags: ["偏财格"], stance: "mainstream", debateKey: null, ...extra,
    });
    const rows = [
      // 高分单点知识若干：只按分数截断的话，会把下面那组议题切得七零八落
      ...Array.from({ length: 8 }, (_, i) => row(`s${i}`, { tags: ["偏财格"] })),
      row("g1", { debateKey: "k1", stance: "platform_line" }),
      row("g2", { debateKey: "k1", stance: "consensus" }),
      row("g3", { debateKey: "k1", stance: "alternative" }),
      row("g4", { debateKey: "k1", stance: "minority" }),
    ];
    (knowledge as any).prisma = { paipanReportKnowledge: { findMany: jest.fn(async () => rows) } };

    const hits = await knowledge.findEvidence({
      paipanType: "bazi",
      signals: [{ value: "偏财格", weight: 10, reason: "格局" }],
      limit: 10,
    });
    const group = hits.filter((h) => h.debateKey === "k1");
    expect(group).toHaveLength(4); // 整组都在
    expect(group.some((h) => h.stance === "platform_line")).toBe(true); // 主线没被切掉
    expect(hits).toHaveLength(10); // 剩余名额给单点知识
  });

  it("主线与共识在检索里要挤得进来，不能被同派高分条目占满", () => {
    const knowledge = new PaipanReportKnowledgeService({} as any);
    const rows = [
      { id: "1", stance: "mainstream", tags: ["偏财格"], school: "ziping" },
      { id: "2", stance: "platform_line", tags: ["偏财格"], school: null },
      { id: "3", stance: "consensus", tags: ["偏财格"], school: null },
    ].map((r) => ({
      ...r, kind: "school_theory", topic: "t", title: "t", content: "c", bookTitle: null, chapterTitle: null,
      classicBookId: null, classicChapterId: null, version: 1, sourceKind: "platform_expert", debateKey: "k",
    }));
    (knowledge as any).prisma = { paipanReportKnowledge: { findMany: jest.fn(async () => rows) } };

    return knowledge
      .findEvidence({ paipanType: "bazi", signals: [{ value: "偏财格", weight: 10, reason: "格局" }] })
      .then((hits) => {
        // 同样命中一个信号，主线与共识要排在普通主流说法之前
        expect(hits[0].stance).toBe("platform_line");
        expect(hits[1].stance).toBe("consensus");
      });
  });
});

describe("对照条目种子", () => {
  it("每个议题都必须有且只有一条主线——没有主线的议题根本不会展示，写了也是白写", () => {
    const byKey = new Map<string, typeof DEBATE_SEEDS>();
    for (const s of DEBATE_SEEDS) {
      const k = s.debateKey!;
      expect(k).toBeTruthy();
      byKey.set(k, [...(byKey.get(k) ?? []), s]);
    }
    expect(byKey.size).toBeGreaterThanOrEqual(6); // 六个工具各自至少有一个议题

    for (const [key, list] of byKey) {
      const lines = list.filter((x) => x.stance === "platform_line");
      expect({ key, n: lines.length }).toEqual({ key, n: 1 });
      // 主线之外至少还要有一种说法，否则不成其为「对照」
      expect(list.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("同一议题的 tags 必须一致：不一致会导致只命中一半，对照就残了", () => {
    const byKey = new Map<string, Set<string>[]>();
    for (const s of DEBATE_SEEDS) {
      byKey.set(s.debateKey!, [...(byKey.get(s.debateKey!) ?? []), new Set(s.tags)]);
    }
    for (const [key, sets] of byKey) {
      const first = [...sets[0]].sort().join(",");
      for (const s of sets) expect({ key, tags: [...s].sort().join(",") }).toEqual({ key, tags: first });
    }
  });

  it("主线条目要给出确定结论，不能写成「你自己判断」", () => {
    const lines = DEBATE_SEEDS.filter((s) => s.stance === "platform_line");
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      // 明确说出本报告按哪一说
      expect(l.content).toMatch(/本报告(按|采用|取)/);
      // 把判断推回给用户的措辞，正是决策人明确反对的
      expect(l.content).not.toMatch(/请按自己的体系判断|不替你做主|不替使用者|你自行斟酌|自己去判断/);
    }
  });

  it("六个工具都有可对照的议题：任何一个工具都不该只有单点知识", () => {
    const types = new Set(DEBATE_SEEDS.map((s) => s.paipanType));
    for (const t of ["bazi", "ziwei", "liuyao", "meihua", "qimen", "daliuren"]) {
      expect(types.has(t)).toBe(true);
    }
  });
});
