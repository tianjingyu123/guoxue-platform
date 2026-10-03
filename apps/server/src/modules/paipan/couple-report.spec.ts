import { Test } from "@nestjs/testing";
import { PaipanAiService } from "./paipan-ai.service";
import { PaipanReportKnowledgeService } from "./paipan-report-knowledge.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 双人合盘报告：和其余六个工具一样，要站在已审核的知识条目上，而不是模型自说自话；
 * 同时守住隐私红线——报告双方共享，任何一方的生辰四柱都不能进 prompt。
 *
 * 这里直接查「喂给模型的那段 prompt」，因为最终文本由模型生成、本地又是模拟模型，
 * 报告正文验不出检索层的事；prompt 才是这一层的产物。
 */
const male: any = {
  siZhu: {
    nian: { gan: "庚", zhi: "午", nayin: "路旁土" },
    yue: { gan: "己", zhi: "卯", nayin: "城头土" },
    ri: { gan: "甲", zhi: "寅", nayin: "大溪水" },
    shi: { gan: "己", zhi: "巳", nayin: "大林木" },
  },
  geJu: { name: "正官格", yongShen: "水(生)" },
  wuXingEnergy: { mu: 35, huo: 20, tu: 25, jin: 15, shui: 5 },
  input: { year: 1990, month: 3, day: 15, hour: 10 },
};

const female: any = {
  siZhu: {
    nian: { gan: "壬", zhi: "申", nayin: "剑锋金" },
    yue: { gan: "戊", zhi: "申", nayin: "大驿土" },
    ri: { gan: "丁", zhi: "亥", nayin: "屋上土" },
    shi: { gan: "辛", zhi: "丑", nayin: "壁上土" },
  },
  geJu: { name: "偏印格", yongShen: "木(生)" },
  wuXingEnergy: { mu: 10, huo: 20, tu: 30, jin: 30, shui: 10 },
  input: { year: 1992, month: 8, day: 7, hour: 22 },
};

/** 命中的条目：一条平台主线 + 两条单点知识 */
const HITS = [
  {
    id: "k1", stance: "platform_line", topic: "合婚到底该看什么",
    title: "本报告主线：按日主、夫妻宫、喜用互补三项讲，属相不作否决依据",
    content: "本报告按主流一路来讲……属相相冲不作为否决依据。",
  },
  {
    id: "k2", stance: "mainstream", topic: "夫妻宫的关系",
    title: "夫妻宫六合：贴得近、好说话",
    content: "双方日支六合，是合婚里最被看好的一种……",
  },
  {
    id: "k3", stance: "mainstream", topic: "日主五行的关系",
    title: "日主相生：一方出力、一方受益",
    content: "双方日主五行相生，是相处中最顺的一种……",
  },
];

async function setup(hits: any[] = HITS) {
  const findEvidence = jest.fn().mockResolvedValue(hits);
  const mod = await Test.createTestingModule({
    providers: [
      PaipanAiService,
      { provide: PrismaService, useValue: { aiAnalysisRecord: { create: jest.fn(async ({ data }: any) => ({ id: "a1", ...data, createdAt: new Date() })) } } },
      { provide: RedisService, useValue: {} },
      { provide: PaipanReportKnowledgeService, useValue: { findEvidence } },
    ],
  }).compile();

  const svc = mod.get(PaipanAiService);
  (svc as any).apiKey = "test-key";
  const callDeepSeek = jest
    .spyOn(svc as any, "callDeepSeek")
    .mockResolvedValue({ content: "合婚分析正文", tokenUsage: { promptTokens: 1, completionTokens: 1 } });
  return { svc, callDeepSeek, findEvidence };
}

describe("双人合盘报告", () => {
  it("按关系检索合婚知识，主线与依据都进 prompt", async () => {
    const { svc, callDeepSeek, findEvidence } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true });

    expect(findEvidence).toHaveBeenCalledWith(
      // 多取再按场景筛，所以检索 limit 是 24、进 prompt 的才是 12
      expect.objectContaining({ paipanType: "couple", limit: 24 }),
    );
    // 信号来自关系，不是某个人的格局：男日支寅、女日支亥 → 寅亥六合
    const signals = findEvidence.mock.calls[0][0].signals.map((s: any) => s.value);
    expect(signals).toContain("夫妻宫六合");
    expect(signals).toContain("日主相生（男方主动）");

    const prompt = callDeepSeek.mock.calls[0][0] as string;
    expect(prompt).toContain("本报告的主线");
    expect(prompt).toContain("属相相冲不作为否决依据");
    expect(prompt).toContain("夫妻宫六合：贴得近、好说话");
  });

  it("prompt 里不得出现任何一方的生辰与四柱——报告是双方共享的", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true });
    const prompt = callDeepSeek.mock.calls[0][0] as string;

    expect(prompt).not.toContain("1990");
    expect(prompt).not.toContain("1992");
    for (const p of ["庚午", "己卯", "甲寅", "己巳", "壬申", "戊申", "丁亥", "辛丑"]) {
      expect([p, prompt.includes(p)]).toEqual([p, false]);
    }
    // 纳音名等于年柱干支，同样不能给
    expect(prompt).not.toContain("路旁土");
    expect(prompt).not.toContain("剑锋金");
  });

  it("硬规则写进 prompt：属相不得用来否决，一个说法要讲明白", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true });
    const prompt = callDeepSeek.mock.calls[0][0] as string;
    expect(prompt).toContain("不得写出、不得推测、不得编造");
    expect(prompt).toContain("不要把选择甩回给用户");
  });

  it("知识库没命中也能出报告，只是退回纯模型作答", async () => {
    const { svc, callDeepSeek } = await setup([]);
    const r = await svc.analyzeHehun("u1", male, female, { shared: true });
    const prompt = callDeepSeek.mock.calls[0][0] as string;
    expect(prompt).not.toContain("可引用的依据");
    // 没有主线条目时，仍要求模型给一个明确说法
    expect(prompt).toContain("给出一个明确的说法");
    expect(r).toBeTruthy();
  });

  it("自己的两个盘做合婚不受此限：没有第二个人，照旧给完整四柱", async () => {
    const { svc, callDeepSeek, findEvidence } = await setup();
    await svc.analyzeHehun("u1", male, female);
    const prompt = callDeepSeek.mock.calls[0][0] as string;
    expect(prompt).toContain("四柱");
    expect(prompt).toContain("庚午");
    // 不走合盘检索
    expect(findEvidence).not.toHaveBeenCalled();
  });

  it("模型若自己编了出生日期，共享报告发出前要删掉", async () => {
    const { svc } = await setup();
    jest.spyOn(svc as any, "callDeepSeek").mockResolvedValue({
      content: "男方1990年3月15日生，女方性情温和。",
      tokenUsage: { promptTokens: 1, completionTokens: 1 },
    });
    const r: any = await svc.analyzeHehun("u1", male, female, { shared: true });
    expect(r.analysisContent).not.toContain("1990年3月15日");
    expect(r.analysisContent).toContain("（出生信息不展示）");
  });
});

/**
 * 决策人 2026-09-18：「合盘不光是合婚，还有合作等其他场景。」
 *
 * 同一张关系盘，换个场景要问的东西与措辞都不同——
 * 把合作伙伴讲成「感情和睦」是笑话，所以场景必须一路带到 prompt。
 */
describe("合盘场景", () => {
  it("场景进检索信号：合作条目与婚恋条目各走各的", async () => {
    const { svc, findEvidence } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true, scene: "partnership" });
    const signals = findEvidence.mock.calls[0][0].signals.map((s: any) => s.value);
    expect(signals).toContain("合盘场景·合作");
    expect(signals).not.toContain("合盘场景·婚恋");
  });

  it("合作场景问的是谁主导、钱怎么分，不是夫妻宫", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true, scene: "partnership" });
    const p = callDeepSeek.mock.calls[0][0] as string;
    expect(p).toContain("合作场景");
    expect(p).toContain("谁主导");
    expect(p).toContain("钱与分配");
    // 两边的称呼要跟着场景走，不能还叫男方女方
    expect(p).toContain("发起方");
    expect(p).toContain("合作方");
    // 合作不谈夫妻宫，也不该出现婚恋的任务项
    expect(p).not.toContain("夫妻宫与合冲");
    // 不预言生意成败
    expect(p).toContain("不预言生意成败");
  });

  it("婚恋场景保持原样：夫妻宫与属相硬规则都在", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true, scene: "marriage" });
    const p = callDeepSeek.mock.calls[0][0] as string;
    expect(p).toContain("夫妻宫与合冲");
    expect(p).toContain("属相相冲不作为否决依据");
    expect(p).toContain("男方");
  });

  it("亲子场景不谈婚配，也不预言亲缘厚薄与寿夭", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true, scene: "family" });
    const p = callDeepSeek.mock.calls[0][0] as string;
    expect(p).toContain("长辈一方");
    expect(p).toContain("晚辈一方");
    expect(p).toContain("不预言亲缘厚薄、不谈寿夭");
    expect(p).not.toContain("属相相冲不作为否决依据");
  });

  it("不传场景时按婚恋走，与既有数据一致", async () => {
    const { svc, callDeepSeek } = await setup();
    await svc.analyzeHehun("u1", male, female, { shared: true });
    expect(callDeepSeek.mock.calls[0][0] as string).toContain("婚恋场景");
  });
});
