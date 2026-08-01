import { Test } from "@nestjs/testing";
import { RecommendationService } from "./recommendation.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("RecommendationService（场景化向导推荐）", () => {
  let service: RecommendationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      article: { findFirst: jest.fn() },
      classicBook: { findFirst: jest.fn() },
      video: { findFirst: jest.fn() },
      liveRoom: { findFirst: jest.fn() },
      botConfig: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      circle: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [RecommendationService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RecommendationService);
  });

  it("解析内容与商业两类协议，并从展示文本中移除机器标记", () => {
    const raw = '先从原文理解。<!--RECO:[{"type":"classic","query":"周易"},{"type":"course","query":"周易"}]-->';
    expect(service.parseProtocol(raw)).toEqual({
      clean: "先从原文理解。",
      intents: [
        { type: "classic", query: "周易", reason: undefined },
        { type: "course", query: "周易", reason: undefined },
      ],
    });
  });

  it("普通知识问答过滤不合时宜的课程，但直接展示高相关内容", async () => {
    prisma.article.findFirst.mockResolvedValue({
      id: "a1",
      title: "从卦辞读周易",
      cover: "a.webp",
      excerpt: "原典导读",
      viewCount: 8,
    });
    const raw = '回答<!--RECO:[{"type":"course","query":"周易"},{"type":"article","query":"周易"}]-->';
    const result = await service.build(raw, "周易里的乾卦是什么意思");

    expect(prisma.course.findFirst).not.toHaveBeenCalled();
    expect(result.recommendation?.items.map((item) => item.type)).toEqual(["article"]);
    expect(result.recommendation?.presentation).toBe("inline");
    expect(result.recommendation?.consentPrompt).not.toContain("价格");
  });

  it("处在入门学习节点时给立即可做与持续推进两条路径", () => {
    expect(service.fallbackIntents("我想学习八字的基础概念")).toEqual([
      { type: "article", query: "八字", reason: "先读一篇八字相关内容" },
      { type: "course", query: "八字", reason: "把零散理解推进为八字学习路线" },
    ]);
  });

  it("明确询问课程时课程优先，再补购买前的低门槛内容", () => {
    expect(service.fallbackIntents("我想系统学习八字课程")).toEqual([
      { type: "course", query: "八字", reason: "沿着当前目标系统学习八字" },
      { type: "article", query: "八字", reason: "先用一篇内容判断八字是否适合你" },
    ]);
  });

  it("学习阶段即使没有说购买，也允许课程以服务延伸直接出现", async () => {
    prisma.article.findFirst.mockResolvedValue({
      id: "a1", title: "八字基础十讲", cover: "a.webp", excerpt: "入门内容", viewCount: 8,
    });
    prisma.course.findFirst.mockResolvedValue({
      id: "c1", title: "八字入门课", cover: "c.webp", intro: "四周学习路线", price: 99, studentCount: 20,
    });

    const result = await service.build("先理解基本结构。", "我想学习八字，从哪里入门");

    expect(result.recommendation?.items.map((item) => item.type)).toEqual(["article", "course"]);
    expect(result.recommendation?.presentation).toBe("inline");
    expect(result.recommendation?.title).toBe("把这一步接着走下去");
    expect(result.recommendation?.commercialDisclosure).toContain("价格与权益");
  });

  it("文章必须已过审、全平台可见且带首图", async () => {
    prisma.article.findFirst.mockResolvedValue({
      id: "a1",
      title: "周易入门",
      cover: "cover.webp",
      excerpt: "从卦象到义理",
      viewCount: 99,
    });
    const cards = await service.match([{ type: "article", query: "周易", reason: "先读文章" }]);

    expect(prisma.article.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        auditStatus: "APPROVED",
        visibility: "PLATFORM",
        cover: { not: null },
      }),
    }));
    expect(cards[0]).toEqual({
      type: "article",
      data: expect.objectContaining({ id: "a1", href: "/articles/a1", reason: "先读文章" }),
    });
  });

  it("明确购买意图时允许商品直接出现，并透明标注商业属性", async () => {
    prisma.article.findFirst.mockResolvedValue(null);
    prisma.product.findFirst.mockResolvedValue({
      id: "p1",
      title: "文房套装",
      images: ["p.webp"],
      intro: "日常临帖",
      price: 199,
      originalPrice: 259,
      salesCount: 12,
    });
    const raw = '回答<!--RECO:[{"type":"product","query":"书法"}]-->';
    const result = await service.build(raw, "练书法想买一套文房用品");

    expect(result.recommendation?.items[0].type).toBe("product");
    expect(result.recommendation?.presentation).toBe("inline");
    expect(result.recommendation?.commercialDisclosure).toContain("商业服务");
    expect(result.recommendation?.consentPrompt).toContain("明确标注价格");
  });

  it("模型给出的弱相关商品仍被过滤，不为了销售强插卡片", async () => {
    const raw = '回答<!--RECO:[{"type":"product","query":"书法"}]-->';
    const result = await service.build(raw, "王羲之的书法特点是什么");

    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(result.recommendation).toBeNull();
  });

  it("投诉退款等负面场景不插入推荐", async () => {
    const raw = '我先帮你处理。<!--RECO:[{"type":"course","query":"周易"}]-->';
    const result = await service.build(raw, "课程加载失败，我要退款");

    expect(prisma.course.findFirst).not.toHaveBeenCalled();
    expect(result.recommendation).toBeNull();
  });

  it("续问省略主题时可从本轮回答补足，但只在明确推荐场景启用", async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: "c1", title: "八字入门课", cover: "c.webp", intro: "四周路线", price: 99, studentCount: 20,
    });
    prisma.article.findFirst.mockResolvedValue(null);

    const result = await service.build("针对八字零基础阶段，可以从四柱结构开始。", "有推荐的课程吗");

    expect(prisma.course.findFirst).toHaveBeenCalled();
    expect(result.recommendation?.items[0].type).toBe("course");
    expect(result.recommendation?.presentation).toBe("inline");
  });

  it("模型给出泛化商业检索词时，仍以用户明确主题约束候选", async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: "c1", title: "八字入门课程", cover: "c.webp", intro: "四周路线", price: 99, studentCount: 20,
    });

    const raw = '回答<!--RECO:[{"type":"course","query":"系统入门课程"}]-->';
    const result = await service.build(raw, "我想系统学习八字，请推荐平台内适合的课程");

    expect(prisma.course.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { title: expect.objectContaining({ contains: "八字" }) },
        ]),
      }),
    }));
    expect(result.recommendation?.items[0]).toEqual(expect.objectContaining({
      type: "course",
      data: expect.objectContaining({ title: "八字入门课程" }),
    }));
  });

  it("课程优先按标题和简介匹配，避免历史脏标签把无关热门课程顶上来", async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: "c-bazi",
      title: "八字入门课程",
      cover: "bazi.webp",
      intro: "零基础学习八字",
      price: 99,
      studentCount: 15,
    });

    const raw = '<!--RECO:[{"type":"course","query":"系统入门课程"}]-->';
    const result = await service.build(raw, "请推荐一门平台内与八字直接相关的入门课程，不要推荐中医课程");

    const primaryWhere = prisma.course.findFirst.mock.calls[0][0].where;
    expect(primaryWhere.OR).toEqual([
      { title: expect.objectContaining({ contains: "八字" }) },
      { intro: expect.objectContaining({ contains: "八字" }) },
    ]);
    expect(primaryWhere.OR).not.toContainEqual({ tags: { has: "八字" } });
    expect(result.recommendation?.items[0]).toEqual(expect.objectContaining({
      type: "course",
      data: expect.objectContaining({ title: "八字入门课程" }),
    }));
  });

  it("工具意图返回可直接打开的结构化工具入口", async () => {
    const result = await service.build("可以使用标准工具查看。", "我想用万年历查节气");
    expect(result.recommendation?.items[0]).toEqual({
      type: "tool",
      data: expect.objectContaining({ title: "万年历", href: "/paipan/wannianli" }),
    });
  });
});
