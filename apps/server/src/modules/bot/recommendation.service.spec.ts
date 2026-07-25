import { Test } from "@nestjs/testing";
import { RecommendationService } from "./recommendation.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("RecommendationService（内容优先向导）", () => {
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

  it("没有明确购买或加入意图时，过滤模型擅自给出的商业推荐", async () => {
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
    expect(result.recommendation?.consentPrompt).not.toContain("价格");
  });

  it("默认兜底优先文章，而不是直接推课程", () => {
    expect(service.fallbackIntents("我想了解八字的基础概念")).toEqual([
      { type: "article", query: "八字", reason: "先读一篇八字相关内容" },
    ]);
  });

  it("明确系统学习时，先给文章再给课程", () => {
    expect(service.fallbackIntents("我想系统学习八字课程")).toEqual([
      { type: "article", query: "八字", reason: "先读一篇八字相关内容" },
      { type: "course", query: "八字", reason: "系统学习八字" },
    ]);
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

  it("明确购买意图时允许商品，但征求同意话术透明标注商业内容", async () => {
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
    expect(result.recommendation?.consentPrompt).toContain("明确标注价格");
  });

  it("工具意图返回可直接打开的结构化工具入口", async () => {
    const result = await service.build("可以使用标准工具查看。", "我想用万年历查节气");
    expect(result.recommendation?.items[0]).toEqual({
      type: "tool",
      data: expect.objectContaining({ title: "万年历", href: "/paipan/wannianli" }),
    });
  });
});
